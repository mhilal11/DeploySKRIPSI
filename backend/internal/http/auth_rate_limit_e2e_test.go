package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"hris-backend/internal/config"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/jmoiron/sqlx"
)

func TestAuthRateLimitOnLoginRoute(t *testing.T) {
	t.Parallel()

	rawDB, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed creating sqlmock: %v", err)
	}
	defer rawDB.Close()

	db := sqlx.NewDb(rawDB, "sqlmock")
	cfg := config.Config{
		Env:                  "development",
		FrontendURL:          "http://localhost:5173",
		BaseURL:              "http://localhost:8080",
		SessionSecret:        "0123456789abcdef0123456789abcdef",
		SessionSecretFromEnv: true,
		CSRFSecret:           "abcdef0123456789abcdef0123456789",
		CSRFSecretFromEnv:    true,
		MaxRequestBodyBytes:  25 * 1024 * 1024,
		StoragePath:          "./storage",
	}

	router := NewRouter(cfg, db)

	csrfReq := httptest.NewRequest(http.MethodGet, "/api/csrf", nil)
	csrfRes := httptest.NewRecorder()
	router.ServeHTTP(csrfRes, csrfReq)
	if csrfRes.Code != http.StatusOK {
		t.Fatalf("expected csrf bootstrap 200, got %d", csrfRes.Code)
	}

	var csrfPayload struct {
		Token string `json:"csrf_token"`
	}
	if err := json.Unmarshal(csrfRes.Body.Bytes(), &csrfPayload); err != nil {
		t.Fatalf("failed parsing csrf response: %v", err)
	}
	if csrfPayload.Token == "" {
		t.Fatalf("expected csrf token in response")
	}

	sessionCookies := csrfRes.Result().Cookies()
	cookieParts := make([]string, 0, len(sessionCookies))
	for _, cookie := range sessionCookies {
		cookieParts = append(cookieParts, cookie.Name+"="+cookie.Value)
	}
	cookieHeader := strings.Join(cookieParts, "; ")

	for i := 1; i <= 9; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/login", strings.NewReader(`{}`))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-CSRF-Token", csrfPayload.Token)
		req.Header.Set("Cookie", cookieHeader)
		res := httptest.NewRecorder()
		router.ServeHTTP(res, req)

		if i <= 8 && res.Code != http.StatusUnprocessableEntity {
			t.Fatalf("request %d: expected 422 before limit, got %d", i, res.Code)
		}
		if i == 9 && res.Code != http.StatusTooManyRequests {
			t.Fatalf("request %d: expected 429 after limit, got %d", i, res.Code)
		}
	}
}
