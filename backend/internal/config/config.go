package config

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type Config struct {
	Env                     string
	Address                 string
	BaseURL                 string
	FrontendURL             string
	EducationReferencePath  string
	GroqAPIKey              string
	GroqBaseURL             string
	GroqModel               string
	GroqFallbackModel       string
	GroqModelChain          []string
	GroqRequestTimeoutSec   int
	DBHost                  string
	DBPort                  int
	DBUser                  string
	DBPassword              string
	DBName                  string
	SessionSecret           string
	SessionSecretFromEnv    bool
	CSRFSecret              string
	CSRFSecretFromEnv       bool
	StoragePath             string
	StorageEncryptionKey    string
	StorageEncryptUploads   bool
	RedisURL                string
	RedisAddr               string
	RedisPassword           string
	RedisDB                 int
	DisableBackgroundWorker bool
	CookieSecure            bool
	MaxRequestBodyBytes     int64
	SMTPHost                string
	SMTPPort                int
	SMTPUser                string
	SMTPPassword            string
	SMTPFrom                string
	SMTPTLS                 bool
	GoogleOAuthClientID     string
	GoogleOAuthClientSecret string
	GoogleOAuthRedirectURL  string
}

func Load() Config {
	baseURL := getenv("APP_URL", "http://localhost:8080")
	frontendURL := getenv("FRONTEND_URL", "http://localhost:5173")
	primaryFrontendURL := firstCSVValue(frontendURL)
	if primaryFrontendURL == "" {
		primaryFrontendURL = baseURL
	}
	groqModel := strings.TrimSpace(getenv("GROQ_MODEL", ""))
	groqFallbackModel := strings.TrimSpace(getenv("GROQ_FALLBACK_MODEL", ""))
	groqModelChain := parseCSVUnique(getenv("GROQ_MODEL_CHAIN", ""))
	if len(groqModelChain) == 0 {
		groqModelChain = parseCSVUnique(strings.Join([]string{groqModel, groqFallbackModel}, ","))
	}
	storagePath := resolveStoragePath(getenv("STORAGE_PATH", "./storage"))
	sessionSecret, sessionSecretFromEnv := getenvSecret("SESSION_SECRET", 48)
	csrfSecret, csrfSecretFromEnv := getenvSecret("CSRF_SECRET", 48)
	return Config{
		Env:                     getenv("APP_ENV", "development"),
		Address:                 getenv("APP_ADDR", ":8080"),
		BaseURL:                 baseURL,
		FrontendURL:             frontendURL,
		EducationReferencePath:  getenv("EDUCATION_REFERENCE_PATH", "./data/education_reference_id.json"),
		GroqAPIKey:              strings.TrimSpace(getenv("GROQ_API_KEY", "")),
		GroqBaseURL:             strings.TrimSpace(getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")),
		GroqModel:               groqModel,
		GroqFallbackModel:       groqFallbackModel,
		GroqModelChain:          groqModelChain,
		GroqRequestTimeoutSec:   getenvInt("GROQ_TIMEOUT_SECONDS", 60),
		DBHost:                  getenv("DB_HOST", "127.0.0.1"),
		DBPort:                  getenvInt("DB_PORT", 3306),
		DBUser:                  getenv("DB_USER", "root"),
		DBPassword:              getenv("DB_PASSWORD", ""),
		DBName:                  getenv("DB_NAME", "hris"),
		SessionSecret:           sessionSecret,
		SessionSecretFromEnv:    sessionSecretFromEnv,
		CSRFSecret:              csrfSecret,
		CSRFSecretFromEnv:       csrfSecretFromEnv,
		StoragePath:             storagePath,
		StorageEncryptionKey:    strings.TrimSpace(getenv("STORAGE_ENCRYPTION_KEY", "")),
		StorageEncryptUploads:   getenvBool("STORAGE_ENCRYPT_UPLOADS", strings.TrimSpace(getenv("STORAGE_ENCRYPTION_KEY", "")) != ""),
		RedisURL:                strings.TrimSpace(getenv("REDIS_URL", "")),
		RedisAddr:               strings.TrimSpace(getenv("REDIS_ADDR", "")),
		RedisPassword:           getenv("REDIS_PASSWORD", ""),
		RedisDB:                 getenvInt("REDIS_DB", 0),
		DisableBackgroundWorker: getenvBool("DISABLE_BACKGROUND_WORKERS", false),
		CookieSecure:            getenvBool("COOKIE_SECURE", false),
		MaxRequestBodyBytes:     int64(getenvInt("MAX_REQUEST_BODY_MB", 25)) * 1024 * 1024,
		SMTPHost:                getenv("SMTP_HOST", ""),
		SMTPPort:                getenvInt("SMTP_PORT", 587),
		SMTPUser:                getenv("SMTP_USER", ""),
		SMTPPassword:            getenv("SMTP_PASSWORD", ""),
		SMTPFrom:                getenv("SMTP_FROM", "no-reply@localhost"),
		SMTPTLS:                 getenvBool("SMTP_TLS", false),
		GoogleOAuthClientID:     getenv("GOOGLE_OAUTH_CLIENT_ID", ""),
		GoogleOAuthClientSecret: getenv("GOOGLE_OAUTH_CLIENT_SECRET", ""),
		GoogleOAuthRedirectURL:  getenv("GOOGLE_OAUTH_REDIRECT_URL", strings.TrimRight(primaryFrontendURL, "/")+"/api/auth/google/register/callback"),
	}
}

func (c Config) ValidateForServer() error {
	weakSecrets := map[string]struct{}{
		"change-me":   {},
		"changeme":    {},
		"default":     {},
		"secret":      {},
		"password":    {},
		"123456":      {},
		"session":     {},
		"csrf":        {},
		"development": {},
	}

	validateSecret := func(name, value string, fromEnv bool) error {
		trimmed := strings.TrimSpace(value)
		if len(trimmed) < 32 {
			return fmt.Errorf("%s minimal 32 karakter", name)
		}
		if _, weak := weakSecrets[strings.ToLower(trimmed)]; weak {
			return fmt.Errorf("%s menggunakan nilai lemah", name)
		}
		if strings.EqualFold(c.Env, "production") && !fromEnv {
			return fmt.Errorf("%s wajib diset via environment variable di production", name)
		}
		return nil
	}

	if err := validateSecret("SESSION_SECRET", c.SessionSecret, c.SessionSecretFromEnv); err != nil {
		return err
	}
	if err := validateSecret("CSRF_SECRET", c.CSRFSecret, c.CSRFSecretFromEnv); err != nil {
		return err
	}
	if c.MaxRequestBodyBytes <= 0 {
		return fmt.Errorf("MAX_REQUEST_BODY_MB harus lebih dari 0")
	}
	if c.StorageEncryptionKey != "" {
		if len(c.StorageEncryptionKey) < 32 {
			return fmt.Errorf("STORAGE_ENCRYPTION_KEY minimal 32 karakter (atau base64 32-byte key)")
		}
	}
	return nil
}

func resolveStoragePath(raw string) string {
	if strings.TrimSpace(raw) == "" {
		raw = "./storage"
	}
	if filepath.IsAbs(raw) {
		return raw
	}

	if info, err := os.Stat(raw); err == nil && info.IsDir() {
		return raw
	}

	cwd, err := os.Getwd()
	if err != nil {
		return raw
	}
	candidate := filepath.Join(cwd, raw)
	if info, statErr := os.Stat(candidate); statErr == nil && info.IsDir() {
		return candidate
	}

	trimmedRaw := strings.TrimPrefix(raw, "./")
	backendCandidate := filepath.Join(cwd, "backend", trimmedRaw)
	if info, statErr := os.Stat(backendCandidate); statErr == nil && info.IsDir() {
		return backendCandidate
	}

	return raw
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getenvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

func getenvBool(key string, fallback bool) bool {
	if v := os.Getenv(key); v != "" {
		if v == "1" || v == "true" || v == "TRUE" {
			return true
		}
		if v == "0" || v == "false" || v == "FALSE" {
			return false
		}
	}
	return fallback
}

func firstCSVValue(value string) string {
	parts := strings.Split(value, ",")
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func parseCSVUnique(value string) []string {
	parts := strings.Split(value, ",")
	seen := make(map[string]struct{}, len(parts))
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}

func getenvSecret(key string, minBytes int) (string, bool) {
	if v, ok := os.LookupEnv(key); ok && strings.TrimSpace(v) != "" {
		return strings.TrimSpace(v), true
	}
	return randomSecret(minBytes), false
}

func randomSecret(minBytes int) string {
	if minBytes < 32 {
		minBytes = 32
	}
	buf := make([]byte, minBytes)
	if _, err := rand.Read(buf); err != nil {
		return strings.Repeat("x", minBytes)
	}
	return base64.RawURLEncoding.EncodeToString(buf)
}
