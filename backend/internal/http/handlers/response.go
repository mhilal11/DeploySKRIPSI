package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type FieldErrors map[string]string

func JSONError(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"message": message})
}

func ValidationErrors(c *gin.Context, errs FieldErrors) {
	c.JSON(http.StatusUnprocessableEntity, gin.H{"errors": errs})
}

func Ok(c *gin.Context, data gin.H) {
	c.JSON(http.StatusOK, data)
}
