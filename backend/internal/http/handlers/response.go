package handlers

import (
	"net/http"
	"strconv"
	"strings"

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

func ValidateFieldLength(errs FieldErrors, field, label, value string, max int) {
	if errs == nil || max <= 0 {
		return
	}
	if len([]rune(strings.TrimSpace(value))) > max {
		errs[field] = label + " melebihi batas maksimum " + strconv.Itoa(max) + " karakter."
	}
}
