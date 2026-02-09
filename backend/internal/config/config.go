package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Env                     string
	Address                 string
	BaseURL                 string
	FrontendURL             string
	EducationReferencePath  string
	DBHost                  string
	DBPort                  int
	DBUser                  string
	DBPassword              string
	DBName                  string
	SessionSecret           string
	CSRFSecret              string
	StoragePath             string
	CookieSecure            bool
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
	return Config{
		Env:                     getenv("APP_ENV", "development"),
		Address:                 getenv("APP_ADDR", ":8080"),
		BaseURL:                 baseURL,
		FrontendURL:             frontendURL,
		EducationReferencePath:  getenv("EDUCATION_REFERENCE_PATH", "./data/education_reference_id.json"),
		DBHost:                  getenv("DB_HOST", "127.0.0.1"),
		DBPort:                  getenvInt("DB_PORT", 3306),
		DBUser:                  getenv("DB_USER", "root"),
		DBPassword:              getenv("DB_PASSWORD", ""),
		DBName:                  getenv("DB_NAME", "hris"),
		SessionSecret:           getenv("SESSION_SECRET", "change-me"),
		CSRFSecret:              getenv("CSRF_SECRET", "change-me"),
		StoragePath:             getenv("STORAGE_PATH", "./storage"),
		CookieSecure:            getenvBool("COOKIE_SECURE", false),
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
