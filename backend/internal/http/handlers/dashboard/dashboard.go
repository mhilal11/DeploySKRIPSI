package dashboard

import (
	"hris-backend/internal/http/handlers"

	"net/http"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func RegisterDashboardRoutes(rg *gin.RouterGroup) {
	rg.GET("/dashboard", DashboardRedirect)
	rg.GET("/admin/dashboard", AdminDashboardPlaceholder)
}

func DashboardRedirect(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil {
		handlers.JSONError(c, http.StatusUnauthorized, "Unauthenticated")
		return
	}
	c.JSON(http.StatusOK, gin.H{"redirect_to": dashboardPathFor(*user)})
}

func AdminDashboardPlaceholder(c *gin.Context) {
	// Not used in SPA, kept for compatibility
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func dashboardPathFor(user models.User) string {
	if user.IsHumanCapitalAdmin() {
		return "/super-admin/admin-hr/dashboard"
	}
	switch user.Role {
	case models.RoleSuperAdmin:
		return "/super-admin/dashboard"
	case models.RoleAdmin:
		return "/admin-staff/dashboard"
	case models.RoleStaff:
		return "/staff/dashboard"
	case models.RolePelamar:
		return "/pelamar/dashboard"
	default:
		return "/dashboard"
	}
}
