package handlers

import (
	"net/http"

	"hris-backend/internal/http/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterDashboardRoutes(rg *gin.RouterGroup) {
	rg.GET("/dashboard", DashboardRedirect)
	rg.GET("/admin/dashboard", AdminDashboardPlaceholder)
}

func DashboardRedirect(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil {
		JSONError(c, http.StatusUnauthorized, "Unauthenticated")
		return
	}
	c.JSON(http.StatusOK, gin.H{"redirect_to": dashboardPathFor(*user)})
}

func AdminDashboardPlaceholder(c *gin.Context) {
	// Not used in SPA, kept for compatibility
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
