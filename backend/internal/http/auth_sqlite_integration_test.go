package http

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"strings"
	"testing"

	"hris-backend/internal/config"

	_ "modernc.org/sqlite"

	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

func TestAuthLoginAndGetMe_SQLiteIntegration(t *testing.T) {
	t.Parallel()

	db := mustOpenSQLiteAuthDB(t)
	defer db.Close()

	password := "Password123!"
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("failed hashing password: %v", err)
	}

	_, err = db.Exec(`
		INSERT INTO users (id, employee_code, name, email, role, division, status, password)
		VALUES (1, 'EMP-001', 'Alice', 'alice@example.com', 'Staff', 'Engineering', 'Active', ?)
	`, string(hash))
	if err != nil {
		t.Fatalf("failed seeding user: %v", err)
	}

	cfg := config.Config{
		Env:                     "development",
		FrontendURL:             "http://localhost:5173",
		BaseURL:                 "http://localhost:8080",
		SessionSecret:           "0123456789abcdef0123456789abcdef",
		SessionSecretFromEnv:    true,
		CSRFSecret:              "abcdef0123456789abcdef0123456789",
		CSRFSecretFromEnv:       true,
		MaxRequestBodyBytes:     25 * 1024 * 1024,
		StoragePath:             "./storage",
		DisableBackgroundWorker: true,
	}
	router := NewRouter(cfg, db)
	server := httptest.NewServer(router)
	defer server.Close()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("failed creating cookie jar: %v", err)
	}
	client := &http.Client{Jar: jar}

	csrfRes, err := client.Get(server.URL + "/api/csrf")
	if err != nil {
		t.Fatalf("failed calling csrf endpoint: %v", err)
	}
	defer csrfRes.Body.Close()
	if csrfRes.StatusCode != http.StatusOK {
		t.Fatalf("expected csrf 200, got %d", csrfRes.StatusCode)
	}
	csrfBody, err := io.ReadAll(csrfRes.Body)
	if err != nil {
		t.Fatalf("failed reading csrf response body: %v", err)
	}

	var csrfPayload struct {
		Token string `json:"csrf_token"`
	}
	if err := json.Unmarshal(csrfBody, &csrfPayload); err != nil {
		t.Fatalf("failed parsing csrf response: %v", err)
	}
	if strings.TrimSpace(csrfPayload.Token) == "" {
		t.Fatalf("csrf token must not be empty")
	}

	loginReq, err := http.NewRequest(
		http.MethodPost,
		server.URL+"/api/login",
		strings.NewReader(`{"email":"alice@example.com","password":"Password123!"}`),
	)
	if err != nil {
		t.Fatalf("failed creating login request: %v", err)
	}
	loginReq.Header.Set("Content-Type", "application/json")
	loginReq.Header.Set("X-CSRF-Token", csrfPayload.Token)
	loginRes, err := client.Do(loginReq)
	if err != nil {
		t.Fatalf("failed calling login endpoint: %v", err)
	}
	defer loginRes.Body.Close()
	if loginRes.StatusCode != http.StatusOK {
		loginBody, _ := io.ReadAll(loginRes.Body)
		t.Fatalf("expected login 200, got %d body=%s", loginRes.StatusCode, string(loginBody))
	}
	loginBody, err := io.ReadAll(loginRes.Body)
	if err != nil {
		t.Fatalf("failed reading login response body: %v", err)
	}

	var loginPayload map[string]any
	if err := json.Unmarshal(loginBody, &loginPayload); err != nil {
		t.Fatalf("failed parsing login response: %v", err)
	}
	userRaw, ok := loginPayload["user"].(map[string]any)
	if !ok {
		t.Fatalf("expected user object in login response, got %v", loginPayload["user"])
	}
	if userRaw["email"] != "alice@example.com" {
		t.Fatalf("expected user email alice@example.com, got %v", userRaw["email"])
	}

	foundSessionCookie := false
	for _, cookie := range jar.Cookies(loginReq.URL) {
		if cookie.Name == "hris_session" && strings.TrimSpace(cookie.Value) != "" {
			foundSessionCookie = true
			break
		}
	}
	if !foundSessionCookie {
		t.Fatalf("expected hris_session cookie to be set after login")
	}
}

func TestForgotPasswordRejectsUnknownEmail_SQLiteIntegration(t *testing.T) {
	t.Parallel()

	db := mustOpenSQLiteAuthDB(t)
	defer db.Close()

	cfg := config.Config{
		Env:                     "development",
		FrontendURL:             "http://localhost:5173",
		BaseURL:                 "http://localhost:8080",
		SessionSecret:           "0123456789abcdef0123456789abcdef",
		SessionSecretFromEnv:    true,
		CSRFSecret:              "abcdef0123456789abcdef0123456789",
		CSRFSecretFromEnv:       true,
		MaxRequestBodyBytes:     25 * 1024 * 1024,
		StoragePath:             "./storage",
		DisableBackgroundWorker: true,
	}

	router := NewRouter(cfg, db)
	server := httptest.NewServer(router)
	defer server.Close()

	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("failed creating cookie jar: %v", err)
	}
	client := &http.Client{Jar: jar}

	csrfRes, err := client.Get(server.URL + "/api/csrf")
	if err != nil {
		t.Fatalf("failed calling csrf endpoint: %v", err)
	}
	defer csrfRes.Body.Close()
	if csrfRes.StatusCode != http.StatusOK {
		t.Fatalf("expected csrf 200, got %d", csrfRes.StatusCode)
	}

	csrfBody, err := io.ReadAll(csrfRes.Body)
	if err != nil {
		t.Fatalf("failed reading csrf response body: %v", err)
	}
	var csrfPayload struct {
		Token string `json:"csrf_token"`
	}
	if err := json.Unmarshal(csrfBody, &csrfPayload); err != nil {
		t.Fatalf("failed parsing csrf response: %v", err)
	}
	if strings.TrimSpace(csrfPayload.Token) == "" {
		t.Fatalf("csrf token must not be empty")
	}

	req, err := http.NewRequest(
		http.MethodPost,
		server.URL+"/api/forgot-password",
		strings.NewReader(`{"email":"unknown@example.com"}`),
	)
	if err != nil {
		t.Fatalf("failed creating forgot password request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CSRF-Token", csrfPayload.Token)

	res, err := client.Do(req)
	if err != nil {
		t.Fatalf("failed calling forgot password endpoint: %v", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusUnprocessableEntity {
		body, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 422, got %d body=%s", res.StatusCode, string(body))
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatalf("failed reading forgot password response body: %v", err)
	}
	var payload struct {
		Errors map[string]string `json:"errors"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("failed parsing forgot password response: %v", err)
	}
	if payload.Errors["email"] == "" {
		t.Fatalf("expected email validation error, got %+v", payload.Errors)
	}
}

func mustOpenSQLiteAuthDB(t *testing.T) *sqlx.DB {
	t.Helper()

	db, err := sqlx.Open("sqlite", "file:auth_integration?mode=memory&cache=shared")
	if err != nil {
		t.Fatalf("failed opening sqlite db: %v", err)
	}
	schema := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY,
			employee_code TEXT NULL,
			name TEXT NOT NULL,
			email TEXT NOT NULL,
			role TEXT NOT NULL,
			division TEXT NULL,
			status TEXT NOT NULL,
			registered_at TEXT NULL,
			inactive_at TEXT NULL,
			last_login_at TEXT NULL,
			email_verified_at TEXT NULL,
			password TEXT NOT NULL,
			remember_token TEXT NULL,
			created_at TEXT NULL,
			updated_at TEXT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS password_reset_tokens (
			email TEXT PRIMARY KEY,
			token TEXT NOT NULL,
			created_at TEXT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS email_verification_tokens (
			user_id INTEGER PRIMARY KEY,
			token_hash TEXT NOT NULL,
			expires_at TEXT NOT NULL,
			created_at TEXT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS jobs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			queue TEXT NOT NULL,
			payload TEXT NOT NULL,
			attempts INTEGER NOT NULL,
			reserved_at INTEGER NULL,
			available_at INTEGER NOT NULL,
			created_at INTEGER NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS failed_jobs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			uuid TEXT NOT NULL,
			connection TEXT NOT NULL,
			queue TEXT NOT NULL,
			payload TEXT NOT NULL,
			exception TEXT NOT NULL,
			failed_at TEXT NOT NULL
		)`,
	}
	for _, stmt := range schema {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("failed creating schema: %v", err)
		}
	}
	return db
}
