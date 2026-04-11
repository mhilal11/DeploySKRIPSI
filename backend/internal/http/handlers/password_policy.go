package handlers

import (
	"crypto/rand"
	"math/big"
	"strings"
	"unicode"
)

const (
	PasswordMinLength         = 8
	PasswordMaxLength         = 16
	PasswordSpecialCharacters = "!@#$%^&*.()"
	PasswordPolicyMessage     = "Password harus 8-16 karakter dan mengandung minimal 1 huruf besar, 1 huruf kecil, 1 angka, dan 1 karakter khusus (!@#$%^&*.())."
)

func ValidatePasswordPolicy(errs FieldErrors, field, password string) {
	if errs == nil || strings.TrimSpace(field) == "" || password == "" {
		return
	}
	if !PasswordMeetsPolicy(password) {
		errs[field] = PasswordPolicyMessage
	}
}

func PasswordMeetsPolicy(password string) bool {
	length := len([]rune(password))
	if length < PasswordMinLength || length > PasswordMaxLength {
		return false
	}

	hasUpper := false
	hasLower := false
	hasDigit := false
	hasSpecial := false

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasDigit = true
		case strings.ContainsRune(PasswordSpecialCharacters, char):
			hasSpecial = true
		}
	}

	return hasUpper && hasLower && hasDigit && hasSpecial
}

func GeneratePolicyCompliantPassword(length int) (string, error) {
	if length < PasswordMinLength {
		length = 12
	}
	if length > PasswordMaxLength {
		length = PasswordMaxLength
	}

	charsets := []string{
		"ABCDEFGHIJKLMNOPQRSTUVWXYZ",
		"abcdefghijklmnopqrstuvwxyz",
		"0123456789",
		PasswordSpecialCharacters,
	}
	allCharacters := strings.Join(charsets, "")

	password := make([]byte, 0, length)
	for _, charset := range charsets {
		char, err := randomCharsetCharacter(charset)
		if err != nil {
			return "", err
		}
		password = append(password, char)
	}

	for len(password) < length {
		char, err := randomCharsetCharacter(allCharacters)
		if err != nil {
			return "", err
		}
		password = append(password, char)
	}

	for i := len(password) - 1; i > 0; i-- {
		swapIndex, err := cryptoRandomInt(i + 1)
		if err != nil {
			return "", err
		}
		password[i], password[swapIndex] = password[swapIndex], password[i]
	}

	return string(password), nil
}

func randomCharsetCharacter(charset string) (byte, error) {
	index, err := cryptoRandomInt(len(charset))
	if err != nil {
		return 0, err
	}
	return charset[index], nil
}

func cryptoRandomInt(max int) (int, error) {
	if max <= 0 {
		return 0, nil
	}
	value, err := rand.Int(rand.Reader, big.NewInt(int64(max)))
	if err != nil {
		return 0, err
	}
	return int(value.Int64()), nil
}
