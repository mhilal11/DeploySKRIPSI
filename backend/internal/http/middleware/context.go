package middleware

import (
	"hris-backend/internal/config"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

const (
	ctxDBKey     = "db"
	ctxConfigKey = "cfg"
	ctxUserKey   = "user"
)

func AttachDB(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set(ctxDBKey, db)
		c.Next()
	}
}

func AttachConfig(cfg config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set(ctxConfigKey, cfg)
		c.Next()
	}
}

func GetDB(c *gin.Context) *sqlx.DB {
	if v, ok := c.Get(ctxDBKey); ok {
		if db, ok := v.(*sqlx.DB); ok {
			return db
		}
	}
	return nil
}

func GetConfig(c *gin.Context) config.Config {
	if v, ok := c.Get(ctxConfigKey); ok {
		if cfg, ok := v.(config.Config); ok {
			return cfg
		}
	}
	return config.Config{}
}
