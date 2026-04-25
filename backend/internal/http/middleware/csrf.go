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
		if !ok || token == "" {
			newToken, err := utils.RandomToken(32)
			if err == nil {
				token = newToken
				session.Set("csrf_token", token)
				if saveErr := session.Save(); saveErr != nil {
					c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"message": "Gagal menyimpan token CSRF"})
					return
				}
			}
		}

		if token != "" {
			c.Set("csrf_token", token)
			secureCookie := GetConfig(c).CookieSecure
			sameSiteMode := http.SameSiteLaxMode
			if secureCookie {
				// Cross-site frontend on HTTPS requires SameSite=None + Secure.
				sameSiteMode = http.SameSiteNoneMode
			}
			c.SetSameSite(sameSiteMode)
			c.SetCookie("XSRF-TOKEN", token, 60*60*24, "/", "", secureCookie, false)
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
				c.JSON(http.StatusForbidden, gin.H{"message": "Invalid CSRF token"})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}
