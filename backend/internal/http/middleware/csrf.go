package middleware

import (
	"net/http"

	"hris-backend/internal/utils"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

func EnsureCSRFToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		token, ok := session.Get("csrf_token").(string)
		generatedToken := false
		AuthDebugSetCSRFValid(c, false)
		if !ok || token == "" {
			newToken, err := utils.RandomToken(32)
			if err == nil {
				token = newToken
				generatedToken = true
				session.Set("csrf_token", token)
				if saveErr := session.Save(); saveErr != nil {
					AuthDebugSetCSRFGenerated(c, generatedToken)
					AuthDebugSetCSRFCookieSet(c, false)
					if c.Request.URL.Path == "/api/csrf" {
						AuthDebugLog(
							c,
							"/api/csrf",
							AuthDebugIntField("csrf_token_len", AuthDebugTokenLen(token)),
							AuthDebugBoolField("csrf_generated", generatedToken),
							AuthDebugBoolField("xsrf_cookie_set", false),
							"status=500",
						)
					}
					c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"message": "Gagal menyimpan token CSRF"})
					return
				}
			}
		}
		AuthDebugSetCSRFGenerated(c, generatedToken)

		if token != "" {
			c.Set("csrf_token", token)
			// Cross-site frontend on Vercel requires a Secure + SameSite=None CSRF cookie.
			secureCookie := GetConfig(c).CookieSecure
			c.SetSameSite(http.SameSiteNoneMode)
			c.SetCookie("XSRF-TOKEN", token, 60*60*24, "/", "", secureCookie, false)
			AuthDebugSetCSRFCookieSet(c, true)
		} else {
			AuthDebugSetCSRFCookieSet(c, false)
		}

		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead && c.Request.Method != http.MethodOptions {
			headerToken := c.GetHeader("X-CSRF-Token")
			if headerToken == "" {
				headerToken = c.GetHeader("X-XSRF-TOKEN")
			}
			if headerToken == "" {
				headerToken = c.PostForm("_token")
			}

			if token == "" || headerToken == "" || token != headerToken {
				if c.Request.URL.Path == "/api/login" || c.Request.URL.Path == "/api/logout" {
					AuthDebugLog(
						c,
						c.Request.URL.Path,
						AuthDebugBoolField("csrf_valid", false),
						AuthDebugIntField("csrf_token_len", AuthDebugTokenLen(token)),
						AuthDebugIntField("csrf_header_len", AuthDebugTokenLen(headerToken)),
						"status=403",
					)
				}
				c.JSON(http.StatusForbidden, gin.H{"message": "Invalid CSRF token"})
				c.Abort()
				return
			}
			AuthDebugSetCSRFValid(c, true)
		}

		c.Next()
	}
}
