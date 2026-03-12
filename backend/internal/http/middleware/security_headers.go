package middleware

import (
	"strings"

	"hris-backend/internal/config"

	"github.com/gin-gonic/gin"
)

func SecurityHeaders(cfg config.Config) gin.HandlerFunc {
	isProduction := strings.EqualFold(strings.TrimSpace(cfg.Env), "production")
	return func(c *gin.Context) {
		headers := c.Writer.Header()
		headers.Set("X-Frame-Options", "DENY")
		headers.Set("X-Content-Type-Options", "nosniff")
		headers.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		headers.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		headers.Set("Cross-Origin-Opener-Policy", "same-origin")

		if isProduction || cfg.CookieSecure || c.Request.TLS != nil {
			headers.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}

		scriptPolicy := "'self' 'unsafe-inline'"
		if !isProduction {
			scriptPolicy += " 'unsafe-eval'"
		}
		stylePolicy := "'self' 'unsafe-inline'"
		connectPolicy := "'self' https: http:"
		if strings.HasPrefix(c.Request.URL.Path, "/docs") {
			scriptPolicy += " https://unpkg.com"
			stylePolicy += " https://unpkg.com"
			connectPolicy += " https://unpkg.com"
		}
		headers.Set(
			"Content-Security-Policy",
			"default-src 'self'; "+
				"base-uri 'self'; "+
				"frame-ancestors 'none'; "+
				"form-action 'self'; "+
				"script-src "+scriptPolicy+"; "+
				"style-src "+stylePolicy+"; "+
				"img-src 'self' data: blob: https:; "+
				"font-src 'self' data: https:; "+
				"connect-src "+connectPolicy+"; "+
				"object-src 'none'",
		)

		c.Next()
	}
}
