package handlers

import (
	"net/url"
	"regexp"
	"strings"
	"time"
)

var emailPattern = regexp.MustCompile(`^[a-z0-9.!#$%&'*+/=?^_` + "`" + `{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$`)

func NormalizeEmail(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func IsValidEmail(value string) bool {
	normalized := NormalizeEmail(value)
	if normalized == "" {
		return false
	}
	if len(normalized) > 254 {
		return false
	}
	if strings.ContainsAny(normalized, " \t\r\n") {
		return false
	}
	return emailPattern.MatchString(normalized)
}

func ValidateEmail(errs FieldErrors, field string, value string) {
	if errs == nil {
		return
	}
	if normalized := NormalizeEmail(value); normalized != "" && !IsValidEmail(normalized) {
		errs[field] = "Format email tidak valid."
	}
}

func NormalizeOptionalText(value string) string {
	return strings.TrimSpace(value)
}

func IsAllowedValue(value string, allowed []string) bool {
	candidate := strings.TrimSpace(value)
	if candidate == "" {
		return false
	}
	for _, item := range allowed {
		if candidate == strings.TrimSpace(item) {
			return true
		}
	}
	return false
}

func ValidateAllowedValue(errs FieldErrors, field, label, value string, allowed []string) {
	if errs == nil {
		return
	}
	if strings.TrimSpace(value) == "" {
		return
	}
	if !IsAllowedValue(value, allowed) {
		errs[field] = label + " tidak valid."
	}
}

func ParseDateStrict(value string, layout string) (time.Time, error) {
	return time.Parse(layout, strings.TrimSpace(value))
}

func ValidateURL(errs FieldErrors, field, label, value string, requireHTTPS bool) {
	if errs == nil {
		return
	}
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return
	}
	parsed, err := url.ParseRequestURI(trimmed)
	if err != nil || parsed == nil || parsed.Host == "" || parsed.Scheme == "" {
		errs[field] = label + " tidak valid."
		return
	}
	if requireHTTPS && parsed.Scheme != "https" {
		errs[field] = label + " harus menggunakan HTTPS."
	}
}
