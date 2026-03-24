package admin

import (
	"hris-backend/internal/http/handlers"
	superadmin "hris-backend/internal/http/handlers/superadmin"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func AdminStaffDashboard(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleAdmin {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	if user.IsHumanCapitalAdmin() {
		superadmin.SuperAdminAdminHrDashboard(c)
		return
	}

	db := middleware.GetDB(c)

	inboxCount, _ := dbrepo.CountDivisionInboxLetters(db, user.Division)
	outboxCount, _ := dbrepo.CountUserOutboxLetters(db, user.ID)
	pendingCount, _ := dbrepo.CountDivisionPendingLetters(db, user.Division)
	archivedCount, _ := dbrepo.CountDivisionArchiveLetters(db, user.Division, user.ID)

	stats := map[string]int{
		"inbox":    inboxCount,
		"outbox":   outboxCount,
		"pending":  pendingCount,
		"archived": archivedCount,
	}

	incoming, _ := dbrepo.ListDivisionIncomingLetters(db, user.Division, 5)
	outgoing, _ := dbrepo.ListUserOutgoingLetters(db, user.ID, 5)
	flowLetters, _ := dbrepo.ListDivisionDashboardLettersAll(db, user.Division, user.ID)
	mailFlow := buildMailFlowSeries(flowLetters, user.Division, user.ID, time.Now())

	incomingPayload := make([]map[string]any, 0, len(incoming))
	for _, surat := range incoming {
		sender := lookupUserName(db, surat.UserID)
		incomingPayload = append(incomingPayload, map[string]any{
			"id":            surat.SuratID,
			"from":          lookupDepartemenName(db, surat.DepartemenID, surat.UserID),
			"sender":        sender,
			"subject":       surat.Perihal,
			"date":          handlers.FormatDate(surat.TanggalSurat),
			"status":        surat.StatusPersetujuan,
			"hasAttachment": surat.LampiranPath != nil,
		})
	}

	outgoingPayload := make([]map[string]any, 0, len(outgoing))
	for _, surat := range outgoing {
		outgoingPayload = append(outgoingPayload, map[string]any{
			"id":            surat.SuratID,
			"to":            handlers.FirstString(surat.TargetDivision, surat.Penerima),
			"subject":       surat.Perihal,
			"date":          handlers.FormatDate(surat.TanggalSurat),
			"status":        surat.StatusPersetujuan,
			"hasAttachment": surat.LampiranPath != nil,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"stats":         stats,
		"mailFlow":      mailFlow,
		"incomingMails": incomingPayload,
		"outgoingMails": outgoingPayload,
	})
}

func AdminStaffRecruitment(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleAdmin {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	if user.IsHumanCapitalAdmin() {
		superadmin.SuperAdminRecruitmentIndex(c)
		return
	}

	db := middleware.GetDB(c)
	apps, _ := dbrepo.ListRecentApplications(db, 20)

	applications := make([]map[string]any, 0, len(apps))
	for _, app := range apps {
		applications = append(applications, map[string]any{
			"id":          app.ID,
			"name":        app.FullName,
			"position":    app.Position,
			"status":      app.Status,
			"submittedAt": handlers.FormatDate(app.SubmittedAt),
			"email":       app.Email,
			"phone":       app.Phone,
		})
	}

	statusBreakdown := make([]map[string]any, 0, len(models.ApplicationStatuses))
	for _, status := range models.ApplicationStatuses {
		count, _ := dbrepo.CountApplicationsByStatus(db, status)
		statusBreakdown = append(statusBreakdown, map[string]any{
			"status": status,
			"count":  count,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"applications":    applications,
		"statusBreakdown": statusBreakdown,
	})
}
