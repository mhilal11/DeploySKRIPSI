package services

import (
	"bytes"
	"testing"
)

func TestEncryptDecryptStoragePayload(t *testing.T) {
	t.Parallel()

	key := "0123456789abcdef0123456789abcdef"
	plain := []byte("secret-file-content")

	encrypted, err := EncryptStoragePayload(plain, key)
	if err != nil {
		t.Fatalf("encrypt failed: %v", err)
	}
	if bytes.Equal(plain, encrypted) {
		t.Fatalf("encrypted payload should differ from plain payload")
	}

	decrypted, err := DecryptStoragePayload(encrypted, key)
	if err != nil {
		t.Fatalf("decrypt failed: %v", err)
	}
	if !bytes.Equal(plain, decrypted) {
		t.Fatalf("decrypted payload mismatch")
	}
}
