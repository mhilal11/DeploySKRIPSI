package middleware

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func LimitRequestBody(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if maxBytes <= 0 {
			c.Next()
			return
		}

		if contentLength := c.Request.ContentLength; contentLength > maxBytes {
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, gin.H{
				"message": "Ukuran request melebihi batas maksimum.",
			})
			return
		}

		c.Writer.Header().Set("X-Max-Request-Bytes", strconv.FormatInt(maxBytes, 10))
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}
