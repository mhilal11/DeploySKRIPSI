package middleware

import (
	"database/sql"

	"hris-backend/internal/models"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

func LoadCurrentUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		userIDRaw := session.Get("user_id")
		if userIDRaw == nil {
			c.Next()
			return
		}

		userID, ok := userIDRaw.(int64)
		if !ok {
			if idFloat, ok := userIDRaw.(float64); ok {
				userID = int64(idFloat)
			} else if idInt, ok := userIDRaw.(int); ok {
				userID = int64(idInt)
			} else {
				c.Next()
				return
			}
		}

		db := GetDB(c)
		if db == nil {
			c.Next()
			return
		}

		var user models.User
		err := db.Get(&user, "SELECT * FROM users WHERE id = ? LIMIT 1", userID)
		if err != nil {
			if err == sql.ErrNoRows {
				session.Delete("user_id")
				_ = session.Save()
			}
			c.Next()
			return
		}

		c.Set(ctxUserKey, &user)
		c.Next()
	}
}

func CurrentUser(c *gin.Context) *models.User {
	if v, ok := c.Get(ctxUserKey); ok {
		if user, ok := v.(*models.User); ok {
			return user
		}
	}
	return nil
}
