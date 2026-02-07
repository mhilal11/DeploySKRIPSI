package config

import (
	"os"
	"strconv"
)

type Config struct {
	Env           string
	Address       string
	BaseURL       string
	FrontendURL   string
	DBHost        string
	DBPort        int
	DBUser        string
	DBPassword    string
	DBName        string
	SessionSecret string
	CSRFSecret    string
	StoragePath   string
	CookieSecure  bool
	SMTPHost      string
	SMTPPort      int
	SMTPUser      string
	SMTPPassword  string
	SMTPFrom      string
	SMTPTLS       bool
}

func Load() Config {
	return Config{
		Env:           getenv("APP_ENV", "development"),
		Address:       getenv("APP_ADDR", ":8080"),
		BaseURL:       getenv("APP_URL", "http://localhost:8080"),
		FrontendURL:   getenv("FRONTEND_URL", "http://localhost:5173"),
		DBHost:        getenv("DB_HOST", "127.0.0.1"),
		DBPort:        getenvInt("DB_PORT", 3306),
		DBUser:        getenv("DB_USER", "root"),
		DBPassword:    getenv("DB_PASSWORD", ""),
		DBName:        getenv("DB_NAME", "hris"),
		SessionSecret: getenv("SESSION_SECRET", "change-me"),
		CSRFSecret:    getenv("CSRF_SECRET", "change-me"),
		StoragePath:   getenv("STORAGE_PATH", "./storage"),
		CookieSecure:  getenvBool("COOKIE_SECURE", false),
		SMTPHost:      getenv("SMTP_HOST", ""),
		SMTPPort:      getenvInt("SMTP_PORT", 587),
		SMTPUser:      getenv("SMTP_USER", ""),
		SMTPPassword:  getenv("SMTP_PASSWORD", ""),
		SMTPFrom:      getenv("SMTP_FROM", "no-reply@localhost"),
		SMTPTLS:       getenvBool("SMTP_TLS", false),
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
