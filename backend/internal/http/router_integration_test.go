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
	healthRes := httptest.NewRecorder()
	router.ServeHTTP(healthRes, healthReq)
	if healthRes.Code != http.StatusOK {
		t.Fatalf("expected /healthz 200, got %d", healthRes.Code)
	}

	docsReq := httptest.NewRequest(http.MethodGet, "/openapi.yaml", nil)
	docsRes := httptest.NewRecorder()
	router.ServeHTTP(docsRes, docsReq)
	if docsRes.Code != http.StatusOK {
		t.Fatalf("expected /openapi.yaml 200, got %d", docsRes.Code)
	}
}
