package services

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
)

var errStoragePayloadNotEncrypted = errors.New("payload tidak terenkripsi")

const storageEncryptedMagic = "HRISENC1"

func ParseStorageEncryptionKey(raw string) ([]byte, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, nil
	}

	if decoded, err := base64.RawStdEncoding.DecodeString(trimmed); err == nil && len(decoded) == 32 {
		return decoded, nil
	}
	if decoded, err := base64.StdEncoding.DecodeString(trimmed); err == nil && len(decoded) == 32 {
		return decoded, nil
	}
	if len(trimmed) == 32 {
		return []byte(trimmed), nil
	}

	sum := sha256.Sum256([]byte(trimmed))
	return sum[:], nil
}

func EncryptStoragePayload(plain []byte, rawKey string) ([]byte, error) {
	key, err := ParseStorageEncryptionKey(rawKey)
	if err != nil {
		return nil, err
	}
	if len(key) == 0 {
		return plain, nil
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	cipherText := aead.Seal(nil, nonce, plain, nil)
	out := make([]byte, 0, len(storageEncryptedMagic)+len(nonce)+len(cipherText))
	out = append(out, []byte(storageEncryptedMagic)...)
	out = append(out, nonce...)
	out = append(out, cipherText...)
	return out, nil
}

func DecryptStoragePayload(payload []byte, rawKey string) ([]byte, error) {
	if len(payload) < len(storageEncryptedMagic) || string(payload[:len(storageEncryptedMagic)]) != storageEncryptedMagic {
		return nil, errStoragePayloadNotEncrypted
	}
	key, err := ParseStorageEncryptionKey(rawKey)
	if err != nil {
		return nil, err
	}
	if len(key) == 0 {
		return nil, errors.New("storage encryption key tidak tersedia")
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	encoded := payload[len(storageEncryptedMagic):]
	nonceSize := aead.NonceSize()
	if len(encoded) < nonceSize {
		return nil, errors.New("payload terenkripsi tidak valid")
	}
	nonce := encoded[:nonceSize]
	cipherText := encoded[nonceSize:]
	return aead.Open(nil, nonce, cipherText, nil)
}

func EncryptFileInPlace(filePath, rawKey string) error {
	plain, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}
	encrypted, err := EncryptStoragePayload(plain, rawKey)
	if err != nil {
		return err
	}
	if len(encrypted) == len(plain) && string(encrypted) == string(plain) {
		return nil
	}
	return os.WriteFile(filePath, encrypted, 0o600)
}

func ReadFileMaybeDecrypted(filePath, rawKey string) ([]byte, bool, error) {
	payload, err := os.ReadFile(filePath)
	if err != nil {
		return nil, false, err
	}
	plain, err := DecryptStoragePayload(payload, rawKey)
	if err != nil {
		if errors.Is(err, errStoragePayloadNotEncrypted) {
			return payload, false, nil
		}
		return nil, false, err
	}
	return plain, true, nil
}

func PrepareFileForRead(filePath, rawKey string) (string, func(), error) {
	content, decrypted, err := ReadFileMaybeDecrypted(filePath, rawKey)
	if err != nil {
		return "", nil, err
	}
	if !decrypted {
		return filePath, func() {}, nil
	}

	ext := filepath.Ext(filePath)
	tmpFile, err := os.CreateTemp("", "hris_decrypted_*"+ext)
	if err != nil {
		return "", nil, err
	}
	if _, err := tmpFile.Write(content); err != nil {
		tmpFile.Close()
		_ = os.Remove(tmpFile.Name())
		return "", nil, err
	}
	if err := tmpFile.Close(); err != nil {
		_ = os.Remove(tmpFile.Name())
		return "", nil, err
	}
	return tmpFile.Name(), func() { _ = os.Remove(tmpFile.Name()) }, nil
}
