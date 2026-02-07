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
				_ = session.Save()
			}
		}

		if token != "" {
			c.Set("csrf_token", token)
			c.SetCookie("XSRF-TOKEN", token, 60*60*24, "/", "", false, false)
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
