package admin

import "github.com/gin-gonic/gin"

func RegisterAdminStaffRoutes(rg *gin.RouterGroup) {
	rg.GET("/admin-staff/dashboard", AdminStaffDashboard)
	rg.GET("/admin-staff/kelola-surat", AdminStaffLettersIndex)
	rg.POST("/admin-staff/kelola-surat", AdminStaffLettersStore)
	rg.POST("/admin-staff/kelola-surat/:id/reply", AdminStaffLettersReply)
	rg.POST("/admin-staff/kelola-surat/:id/archive", AdminStaffLettersArchive)
	rg.POST("/admin-staff/kelola-surat/:id/unarchive", AdminStaffLettersUnarchive)
	rg.GET("/admin-staff/recruitment", AdminStaffRecruitment)
}
