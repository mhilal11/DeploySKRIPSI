package superadmin

import (
	"hris-backend/internal/http/handlers"

	"net/http"
	"strconv"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func SuperAdminNotifications(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage := 5

	notifications := []map[string]any{}
	sidebarNotifications := map[string]int{
		"super-admin.letters.index":    0,
		"super-admin.recruitment":      0,
		"super-admin.staff.index":      0,
		"super-admin.complaints.index": 0,
		"super-admin.audit-log":        0,
	}

	letters := []models.Surat{}
	_ = db.Select(&letters, `
		SELECT * FROM surat
		WHERE LOWER(current_recipient) = 'hr'
		  AND LOWER(status_persetujuan) IN ('menunggu hr','diajukan','diproses')
		ORDER BY created_at DESC
	`)
	sidebarNotifications["super-admin.letters.index"] = len(letters)
	for _, letter := range letters {
		notifications = append(notifications, map[string]any{
			"id":          "letter-" + strconv.FormatInt(letter.SuratID, 10),
			"type":        "letter",
			"title":       "Surat Perlu Ditindaklanjuti",
			"description": "Surat " + letter.NomorSurat + " - " + letter.Perihal,
			"timestamp":   handlers.DiffForHumans(letter.CreatedAt),
			"url":         "/super-admin/kelola-surat",
			"created_at":  letter.CreatedAt,
		})
	}

	applications := []models.Application{}
	_ = db.Select(&applications, `
		SELECT * FROM applications
		WHERE LOWER(status) IN ('applied','screening')
		ORDER BY created_at DESC
	`)
	sidebarNotifications["super-admin.recruitment"] = len(applications)
	for _, app := range applications {
		notifications = append(notifications, map[string]any{
			"id":          "application-" + strconv.FormatInt(app.ID, 10),
			"type":        "application",
			"title":       "Aplikasi Pelamar Baru",
			"description": app.FullName + " melamar posisi " + app.Position,
			"timestamp":   handlers.DiffForHumans(app.CreatedAt),
			"url":         "/super-admin/recruitment",
			"created_at":  app.CreatedAt,
		})
	}

	terminations := []models.StaffTermination{}
	_ = db.Select(&terminations, `
		SELECT * FROM staff_terminations
		WHERE status IN ('Diajukan','Proses','Diproses')
		ORDER BY request_date DESC
	`)
	sidebarNotifications["super-admin.staff.index"] = len(terminations)
	for _, term := range terminations {
		notifications = append(notifications, map[string]any{
			"id":          "termination-" + strconv.FormatInt(term.ID, 10),
			"type":        "termination",
			"title":       "Pengajuan Offboarding",
			"description": "Pengajuan offboarding " + term.EmployeeName,
			"timestamp":   handlers.DiffForHumans(term.RequestDate),
			"url":         "/super-admin/kelola-staff",
			"created_at":  term.RequestDate,
		})
	}

	complaints := []models.Complaint{}
	_ = db.Select(&complaints, `
		SELECT * FROM complaints
		WHERE LOWER(status) IN ('new', 'baru')
		ORDER BY created_at DESC
	`)
	sidebarNotifications["super-admin.complaints.index"] = len(complaints)
	for _, complaint := range complaints {
		notifications = append(notifications, map[string]any{
			"id":          "complaint-" + strconv.FormatInt(complaint.ID, 10),
			"type":        "complaint",
			"title":       "Pengaduan Baru",
			"description": complaint.Subject,
			"timestamp":   handlers.DiffForHumans(complaint.CreatedAt),
			"url":         "/super-admin/kelola-pengaduan",
			"created_at":  complaint.CreatedAt,
		})
	}

	auditLogs := []models.AuditLog{}
	_ = db.Select(&auditLogs, `
		SELECT id, module, action, entity_type, entity_id, description, created_at
		FROM audit_logs
		WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
		  AND id NOT IN (
			SELECT audit_log_id
			FROM audit_log_views
			WHERE user_id = ?
		  )
		ORDER BY created_at DESC
	`, user.ID)
	sidebarNotifications["super-admin.audit-log"] = len(auditLogs)
	for _, audit := range auditLogs {
		description := "Aktivitas audit baru tercatat."
		if audit.Description != nil && *audit.Description != "" {
			description = *audit.Description
		}
		title := "Aktivitas Audit Baru"
		if audit.Action != "" {
			title = "Audit: " + audit.Action
		}
		notifications = append(notifications, map[string]any{
			"id":          "audit-" + strconv.FormatInt(audit.ID, 10),
			"type":        "audit",
			"title":       title,
			"description": description,
			"timestamp":   handlers.DiffForHumans(audit.CreatedAt),
			"url":         "/super-admin/audit-log",
			"created_at":  audit.CreatedAt,
		})
	}

	// sort by created_at desc
	for i := 0; i < len(notifications); i++ {
		for j := i + 1; j < len(notifications); j++ {
			t1, _ := notifications[i]["created_at"].(*time.Time)
			t2, _ := notifications[j]["created_at"].(*time.Time)
			if t2 != nil && t1 != nil && t2.After(*t1) {
				notifications[i], notifications[j] = notifications[j], notifications[i]
			}
		}
	}

	total := len(notifications)
	lastPage := (total + perPage - 1) / perPage
	if lastPage == 0 {
		lastPage = 1
	}
	if page > lastPage {
		page = lastPage
	}

	start := (page - 1) * perPage
	end := start + perPage
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}

	paginated := notifications[start:end]
	for i := range paginated {
		delete(paginated[i], "created_at")
	}

	c.JSON(http.StatusOK, gin.H{
		"data":                 paginated,
		"current_page":         page,
		"last_page":            lastPage,
		"total":                total,
		"per_page":             perPage,
		"sidebarNotifications": sidebarNotifications,
	})
}
