package superadmin

import (
	pelamarhandlers "hris-backend/internal/http/handlers/pelamar"

	"github.com/gin-gonic/gin"
)

func RegisterSuperAdminRoutes(rg *gin.RouterGroup) {
	pelamarhandlers.RegisterRecruitmentAIScreeningTrigger(TriggerAutomaticRecruitmentAIScreening)

	rg.GET("/super-admin/dashboard", SuperAdminDashboard)
	rg.GET("/super-admin/admin-hr/dashboard", SuperAdminAdminHrDashboard)
	rg.GET("/super-admin/notifications", SuperAdminNotifications)
	rg.GET("/super-admin/audit-log", SuperAdminAuditLogsIndex)
	rg.POST("/super-admin/audit-log/mark-viewed", SuperAdminAuditLogsMarkViewed)

	rg.GET("/super-admin/recruitment", SuperAdminRecruitmentIndex)
	rg.POST("/super-admin/recruitment/sla-settings", SuperAdminRecruitmentUpdateSLASettings)
	rg.GET("/super-admin/recruitment/:id/cv", SuperAdminRecruitmentViewCV)
	rg.GET("/super-admin/recruitment/:id/ai-screening", SuperAdminRecruitmentGetAIScreening)
	rg.POST("/super-admin/recruitment/:id/ai-screening/run", SuperAdminRecruitmentRunAIScreening)
	rg.PUT("/super-admin/recruitment/:id/update-status", SuperAdminRecruitmentUpdateStatus)
	rg.POST("/super-admin/recruitment/:id/reject", SuperAdminRecruitmentReject)
	rg.POST("/super-admin/recruitment/:id/schedule-interview", SuperAdminRecruitmentScheduleInterview)
	rg.POST("/super-admin/recruitment/auto-shortlist", SuperAdminRecruitmentAutoShortlist)
	rg.GET("/super-admin/recruitment/export-score-report", SuperAdminRecruitmentExportScoreReport)
	rg.GET("/super-admin/recruitment/export-score-report-pdf", SuperAdminRecruitmentExportScoreReportPDF)
	rg.DELETE("/super-admin/recruitment/:id", SuperAdminRecruitmentDelete)
	rg.POST("/super-admin/onboarding/:id/update-checklist", SuperAdminOnboardingUpdateChecklist)
	rg.POST("/super-admin/onboarding/:id/convert-to-staff", SuperAdminOnboardingConvertToStaff)

	rg.GET("/super-admin/kelola-divisi", SuperAdminDivisionsIndex)
	rg.GET("/super-admin/references/education", pelamarhandlers.SuperAdminEducationReferences)
	rg.POST("/super-admin/kelola-divisi", SuperAdminDivisionsStore)
	rg.PATCH("/super-admin/kelola-divisi/:id", SuperAdminDivisionsUpdate)
	rg.DELETE("/super-admin/kelola-divisi/:id", SuperAdminDivisionsDelete)
	rg.POST("/super-admin/kelola-divisi/:id/open-job", SuperAdminDivisionsOpenJob)
	rg.DELETE("/super-admin/kelola-divisi/:id/open-job", SuperAdminDivisionsCloseJob)

	rg.GET("/super-admin/kelola-surat", SuperAdminLettersIndex)
	rg.POST("/super-admin/kelola-surat", SuperAdminLettersStore)
	rg.POST("/super-admin/kelola-surat/:id/archive", SuperAdminLettersArchive)
	rg.POST("/super-admin/kelola-surat/:id/unarchive", SuperAdminLettersUnarchive)
	rg.POST("/super-admin/kelola-surat/disposition/bulk", SuperAdminLettersBulkDisposition)
	rg.POST("/super-admin/kelola-surat/disposition/reject", SuperAdminLettersRejectDisposition)
	rg.POST("/super-admin/kelola-surat/disposition/final", SuperAdminLettersFinalDisposition)
	rg.POST("/super-admin/kelola-surat/:id/disposition", SuperAdminLettersDisposition)
	rg.GET("/super-admin/kelola-surat/:id/export-word", SuperAdminLettersExportWord)
	rg.GET("/super-admin/kelola-surat/:id/export-final", SuperAdminLettersExportFinal)

	rg.GET("/super-admin/kelola-surat/templates/list", SuperAdminTemplatesList)
	rg.GET("/super-admin/kelola-surat/templates/sample", SuperAdminTemplatesSample)
	rg.POST("/super-admin/kelola-surat/templates/preview-pdf", SuperAdminTemplatesPreviewPDF)
	rg.GET("/super-admin/kelola-surat/templates/:id/download", SuperAdminTemplatesDownload)
	rg.GET("/super-admin/kelola-surat/templates", SuperAdminTemplatesIndex)
	rg.POST("/super-admin/kelola-surat/templates", SuperAdminTemplatesStore)
	rg.POST("/super-admin/kelola-surat/templates/:id/toggle", SuperAdminTemplatesToggle)
	rg.POST("/super-admin/kelola-surat/templates/:id", SuperAdminTemplatesUpdate)
	rg.DELETE("/super-admin/kelola-surat/templates/:id", SuperAdminTemplatesDelete)

	rg.GET("/super-admin/kelola-staff", SuperAdminStaffIndex)
	rg.POST("/super-admin/kelola-staff", SuperAdminStaffStore)
	rg.PATCH("/super-admin/kelola-staff/:id", SuperAdminStaffUpdate)
	rg.DELETE("/super-admin/kelola-staff/:id", SuperAdminStaffDelete)

	rg.GET("/super-admin/kelola-pengaduan", SuperAdminComplaintsIndex)
	rg.PATCH("/super-admin/kelola-pengaduan/:id", SuperAdminComplaintsUpdate)

	rg.GET("/super-admin/accounts", SuperAdminAccountsIndex)
	rg.GET("/super-admin/accounts/create", SuperAdminAccountsCreate)
	rg.GET("/super-admin/accounts/:id/detail", SuperAdminAccountsDetail)
	rg.GET("/super-admin/accounts/:id/edit", SuperAdminAccountsEdit)
	rg.POST("/super-admin/accounts", SuperAdminAccountsStore)
	rg.PUT("/super-admin/accounts/:id", SuperAdminAccountsUpdate)
	rg.PATCH("/super-admin/accounts/:id", SuperAdminAccountsUpdate)
	rg.DELETE("/super-admin/accounts/:id", SuperAdminAccountsDelete)
	rg.POST("/super-admin/accounts/:id/toggle-status", SuperAdminAccountsToggleStatus)
	rg.POST("/super-admin/accounts/:id/reset-password", SuperAdminAccountsResetPassword)
}
