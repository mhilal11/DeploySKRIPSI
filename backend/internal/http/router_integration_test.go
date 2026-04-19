package http

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"hris-backend/internal/config"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/jmoiron/sqlx"
)

func TestRouterHealthzAndDocs(t *testing.T) {
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

	healthReq := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	healthReq.Header.Set("Origin", "http://localhost:5173")
	healthRes := httptest.NewRecorder()
	router.ServeHTTP(healthRes, healthReq)
	if healthRes.Code != http.StatusOK {
		t.Fatalf("expected /healthz 200, got %d", healthRes.Code)
	}
	if got := healthRes.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Fatalf("expected healthz cors origin header, got %q", got)
	}

	docsReq := httptest.NewRequest(http.MethodGet, "/openapi.yaml", nil)
	docsRes := httptest.NewRecorder()
	router.ServeHTTP(docsRes, docsReq)
	if docsRes.Code != http.StatusOK {
		t.Fatalf("expected /openapi.yaml 200, got %d", docsRes.Code)
	}
}

func TestRouterCORSPreflightAndErrorResponses(t *testing.T) {
	t.Parallel()

	rawDB, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed creating sqlmock: %v", err)
	}
	defer rawDB.Close()

	db := sqlx.NewDb(rawDB, "sqlmock")
	cfg := config.Config{
		Env:                  "production",
		FrontendURL:          productionFrontendOrigin,
		BaseURL:              "https://deployskripsi-production.up.railway.app",
		SessionSecret:        "0123456789abcdef0123456789abcdef",
		SessionSecretFromEnv: true,
		CSRFSecret:           "abcdef0123456789abcdef0123456789",
		CSRFSecretFromEnv:    true,
		MaxRequestBodyBytes:  25 * 1024 * 1024,
		StoragePath:          "./storage",
		CookieSecure:         true,
	}

	router := NewRouter(cfg, db)

	preflightReq := httptest.NewRequest(http.MethodOptions, "/api/login", nil)
	preflightReq.Header.Set("Origin", productionFrontendOrigin)
	preflightReq.Header.Set("Access-Control-Request-Method", http.MethodPost)
	preflightReq.Header.Set("Access-Control-Request-Headers", "Content-Type, X-CSRF-Token")
	preflightRes := httptest.NewRecorder()
	router.ServeHTTP(preflightRes, preflightReq)
	if preflightRes.Code != http.StatusOK {
		t.Fatalf("expected preflight 200, got %d", preflightRes.Code)
	}
	if got := preflightRes.Header().Get("Access-Control-Allow-Origin"); got != productionFrontendOrigin {
		t.Fatalf("expected preflight cors origin header, got %q", got)
	}
	if got := preflightRes.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Fatalf("expected preflight credentials header, got %q", got)
	}

	loginReq := httptest.NewRequest(http.MethodPost, "/api/login", nil)
	loginReq.Header.Set("Origin", productionFrontendOrigin)
	loginRes := httptest.NewRecorder()
	router.ServeHTTP(loginRes, loginReq)
	if loginRes.Code != http.StatusForbidden {
		t.Fatalf("expected login 403 from csrf middleware, got %d", loginRes.Code)
	}
	if got := loginRes.Header().Get("Access-Control-Allow-Origin"); got != productionFrontendOrigin {
		t.Fatalf("expected error cors origin header, got %q", got)
	}
	if got := loginRes.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Fatalf("expected error credentials header, got %q", got)
	}
}
