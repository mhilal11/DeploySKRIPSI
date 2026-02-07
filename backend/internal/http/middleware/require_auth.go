package middleware

import (
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		user := CurrentUser(c)
		if user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthenticated"})
			c.Abort()
			return
		}
		if user.Status == "Inactive" {
			session := sessions.Default(c)
			session.Clear()
			_ = session.Save()
			c.JSON(http.StatusForbidden, gin.H{"message": "Account inactive"})
			c.Abort()
			return
		}
		c.Next()
	}
}
