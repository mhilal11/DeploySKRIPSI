package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"hris-backend/internal/config"

	"github.com/gin-gonic/gin"
)

func TestSecurityHeadersApplied(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(SecurityHeaders(config.Config{Env: "production", CookieSecure: true}))
	router.GET("/healthz", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.Code)
	}
	if got := resp.Header().Get("X-Frame-Options"); got != "DENY" {
		t.Fatalf("expected X-Frame-Options DENY, got %q", got)
	}
	if got := resp.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("expected X-Content-Type-Options nosniff, got %q", got)
	}
	if got := resp.Header().Get("Strict-Transport-Security"); got == "" {
		t.Fatalf("expected Strict-Transport-Security header to be set")
	}
	if got := resp.Header().Get("Content-Security-Policy"); got == "" {
		t.Fatalf("expected Content-Security-Policy header to be set")
	}
}
