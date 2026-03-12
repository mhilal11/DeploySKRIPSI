package middleware

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

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

		userID, ok := parseSessionUserID(userIDRaw)
		if !ok {
			c.Next()
			return
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
				if saveErr := session.Save(); saveErr != nil {
					c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"message": "Gagal menyinkronkan sesi pengguna"})
					return
				}
			}
			c.Next()
			return
		}

		c.Set(ctxUserKey, &user)
		c.Next()
	}
}

func parseSessionUserID(raw any) (int64, bool) {
	switch v := raw.(type) {
	case int64:
		return v, v > 0
	case int:
		id := int64(v)
		return id, id > 0
	case int32:
		id := int64(v)
		return id, id > 0
	case float64:
		id := int64(v)
		return id, id > 0
	case json.Number:
		id, err := v.Int64()
		return id, err == nil && id > 0
	case string:
		id, err := strconv.ParseInt(strings.TrimSpace(v), 10, 64)
		return id, err == nil && id > 0
	default:
		return 0, false
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
