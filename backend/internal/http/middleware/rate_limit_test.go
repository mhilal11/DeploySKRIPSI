package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestRateLimitBlocksAfterThreshold(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(RateLimit(2, time.Minute))
	router.GET("/login", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	perform := func() *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, "/login", nil)
		req.RemoteAddr = "203.0.113.5:12345"
		resp := httptest.NewRecorder()
		router.ServeHTTP(resp, req)
		return resp
	}

	first := perform()
	if first.Code != http.StatusOK {
		t.Fatalf("expected first request 200, got %d", first.Code)
	}

	second := perform()
	if second.Code != http.StatusOK {
		t.Fatalf("expected second request 200, got %d", second.Code)
	}

	third := perform()
	if third.Code != http.StatusTooManyRequests {
		t.Fatalf("expected third request 429, got %d", third.Code)
	}
}
