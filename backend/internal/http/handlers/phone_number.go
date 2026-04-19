package handlers

import "strings"

func NormalizePhoneNumber(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}

	var builder strings.Builder
	builder.Grow(len(trimmed))
	hasPlus := false

	for _, r := range trimmed {
		if r == '+' && builder.Len() == 0 && !hasPlus {
			builder.WriteRune(r)
			hasPlus = true
			continue
		}
		if r >= '0' && r <= '9' {
			builder.WriteRune(r)
		}
	}

	normalized := builder.String()
	if normalized == "+" {
		return ""
	}
	return normalized
}

func PhoneDigits(value string) string {
	return strings.TrimPrefix(NormalizePhoneNumber(value), "+")
}

func IsValidPhoneNumber(value string) bool {
	digits := PhoneDigits(value)
	length := len(digits)
	return length >= 8 && length <= 15
}
