package handlers

import (
	"net/http"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
)

func RegisterStaffRoutes(rg *gin.RouterGroup) {
	rg.GET("/staff/dashboard", StaffDashboard)
	rg.GET("/staff/keluhan-dan-saran", StaffComplaintsIndex)
	rg.POST("/staff/keluhan-dan-saran", StaffComplaintsStore)
	rg.GET("/staff/pengajuan-resign", StaffResignationIndex)
	rg.POST("/staff/pengajuan-resign", StaffResignationStore)
}

func StaffDashboard(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleStaff {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	var totalComplaints int
	_ = db.Get(&totalComplaints, "SELECT COUNT(*) FROM complaints WHERE user_id = ?", user.ID)
	var activeComplaints int
	_ = db.Get(&activeComplaints, "SELECT COUNT(*) FROM complaints WHERE user_id = ? AND status IN (?, ?)", user.ID, models.ComplaintStatusNew, models.ComplaintStatusInProgress)

	var regulationsCount int
	if user.Division != nil {
		_ = db.Get(&regulationsCount, `SELECT COUNT(*) FROM surat WHERE tipe_surat = 'masuk' AND target_division = ? AND kategori IN ('Internal','Kebijakan','Operasional') AND tanggal_surat >= DATE_SUB(NOW(), INTERVAL 3 MONTH)`, *user.Division)
	}

	var terminationCount int
	_ = db.Get(&terminationCount, "SELECT COUNT(*) FROM staff_terminations WHERE user_id = ?", user.ID)

	stats := []map[string]any{
		{"label": "Pengaduan Aktif", "value": activeComplaints, "icon": "alert"},
		{"label": "Total Pengaduan", "value": totalComplaints, "icon": "message"},
		{"label": "Regulasi Terbaru", "value": regulationsCount, "icon": "file"},
		{"label": "Pengajuan Resign", "value": terminationCount, "icon": "briefcase"},
	}

	complaints := []models.Complaint{}
	_ = db.Select(&complaints, "SELECT * FROM complaints WHERE user_id = ? ORDER BY submitted_at DESC, id DESC LIMIT 5", user.ID)

	recentComplaints := make([]map[string]any, 0, len(complaints))
	for _, complaint := range complaints {
		recentComplaints = append(recentComplaints, map[string]any{
			"id":       complaint.ID,
			"subject":  complaint.Subject,
			"status":   models.ComplaintStatusLabels[complaint.Status],
			"priority": models.ComplaintPriorityLabels[complaint.Priority],
			"date":     formatDate(complaint.SubmittedAt),
		})
	}

	regulations := []models.Surat{}
	if user.Division != nil {
		_ = db.Select(&regulations, `SELECT * FROM surat WHERE tipe_surat = 'masuk' AND target_division = ? AND kategori IN ('Internal','Kebijakan','Operasional') ORDER BY tanggal_surat DESC, surat_id DESC LIMIT 5`, *user.Division)
	}
	regulationsPayload := make([]map[string]any, 0, len(regulations))
	for _, surat := range regulations {
		regulationsPayload = append(regulationsPayload, map[string]any{
			"id":            surat.SuratID,
			"title":         surat.Perihal,
			"category":      surat.Kategori,
			"date":          formatDate(surat.TanggalSurat),
			"attachmentUrl": attachmentURL(c, surat.LampiranPath),
		})
	}

	terminations := []models.StaffTermination{}
	_ = db.Select(&terminations, "SELECT * FROM staff_terminations WHERE user_id = ? ORDER BY created_at DESC", user.ID)
	var activeTermination *models.StaffTermination
	if len(terminations) > 0 {
		activeTermination = &terminations[0]
	}

	var terminationSummary any
	if activeTermination != nil {
		terminationSummary = map[string]any{
			"reference":     activeTermination.Reference,
			"status":        activeTermination.Status,
			"progress":      activeTermination.Progress,
			"effectiveDate": formatDate(activeTermination.EffectiveDate),
			"requestDate":   formatDate(activeTermination.RequestDate),
		}
	}

	terminationHistory := make([]map[string]any, 0)
	for i, termination := range terminations {
		if i >= 5 {
			break
		}
		terminationHistory = append(terminationHistory, map[string]any{
			"reference":     termination.Reference,
			"type":          termination.Type,
			"status":        termination.Status,
			"requestDate":   formatDate(termination.RequestDate),
			"effectiveDate": formatDate(termination.EffectiveDate),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"stats":            stats,
		"recentComplaints": recentComplaints,
		"regulations":      regulationsPayload,
		"termination": gin.H{
			"active":  terminationSummary,
			"history": terminationHistory,
		},
	})
}

func StaffComplaintsIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleStaff {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	complaints := []models.Complaint{}
	_ = db.Select(&complaints, "SELECT * FROM complaints WHERE user_id = ? ORDER BY submitted_at DESC, id DESC", user.ID)

	stats := map[string]int{
		"new":        0,
		"inProgress": 0,
		"resolved":   0,
	}
	for _, complaint := range complaints {
		switch complaint.Status {
		case models.ComplaintStatusNew:
			stats["new"]++
		case models.ComplaintStatusInProgress:
			stats["inProgress"]++
		case models.ComplaintStatusResolved:
			stats["resolved"]++
		}
	}

	if user.Division != nil {
		var regulationsCount int
		_ = db.Get(&regulationsCount, `SELECT COUNT(*) FROM surat WHERE tipe_surat = 'masuk' AND target_division = ? AND kategori IN ('Internal','Kebijakan','Operasional')`, *user.Division)
		stats["regulations"] = regulationsCount
	} else {
		stats["regulations"] = 0
	}

	complaintPayload := make([]map[string]any, 0, len(complaints))
	categoryOptions := map[string]bool{}
	for _, complaint := range complaints {
		if complaint.Category != "" {
			categoryOptions[complaint.Category] = true
		}
		var handler any
		if complaint.HandledByID != nil {
			handlerName := lookupUserName(db, *complaint.HandledByID)
			if handlerName != "" {
				handler = handlerName
			}
		}
		complaintPayload = append(complaintPayload, map[string]any{
			"id":           complaint.ID,
			"letterNumber": complaint.ComplaintCode,
			"from": func() string {
				if complaint.IsAnonymous {
					return "Anonim"
				}
				return user.Name
			}(),
			"category":        complaint.Category,
			"subject":         complaint.Subject,
			"date":            formatDate(complaint.SubmittedAt),
			"status":          models.ComplaintStatusLabels[complaint.Status],
			"priority":        models.ComplaintPriorityLabels[complaint.Priority],
			"description":     complaint.Description,
			"handler":         handler,
			"resolutionNotes": complaint.ResolutionNotes,
			"attachment": map[string]any{
				"name": complaint.AttachmentName,
				"url":  attachmentURL(c, complaint.AttachmentPath),
			},
		})
	}

	categories := make([]string, 0, len(categoryOptions))
	for k := range categoryOptions {
		categories = append(categories, k)
	}

	regulations := []models.Surat{}
	announcements := []models.Surat{}
	if user.Division != nil {
		_ = db.Select(&regulations, `SELECT * FROM surat WHERE tipe_surat = 'masuk' AND target_division = ? AND kategori IN ('Internal','Kebijakan','Operasional') ORDER BY tanggal_surat DESC, surat_id DESC LIMIT 10`, *user.Division)
		_ = db.Select(&announcements, `SELECT * FROM surat WHERE tipe_surat = 'masuk' AND target_division = ? AND (kategori = 'Internal' OR jenis_surat = 'Pengumuman') ORDER BY tanggal_surat DESC, surat_id DESC LIMIT 5`, *user.Division)
	}

	regulationsPayload := make([]map[string]any, 0, len(regulations))
	for _, surat := range regulations {
		regulationsPayload = append(regulationsPayload, map[string]any{
			"id":         surat.SuratID,
			"title":      surat.Perihal,
			"category":   surat.Kategori,
			"uploadDate": formatDate(surat.TanggalSurat),
			"fileName":   surat.LampiranNama,
			"fileUrl":    attachmentURL(c, surat.LampiranPath),
		})
	}

	announcementsPayload := make([]map[string]any, 0, len(announcements))
	for _, surat := range announcements {
		announcementsPayload = append(announcementsPayload, map[string]any{
			"id":      surat.SuratID,
			"title":   surat.Perihal,
			"date":    formatDate(surat.TanggalSurat),
			"content": surat.IsiSurat,
		})
	}

	statusOptions := []string{}
	priorityOptions := []string{}
	for _, label := range models.ComplaintStatusLabels {
		statusOptions = append(statusOptions, label)
	}
	for _, label := range models.ComplaintPriorityLabels {
		priorityOptions = append(priorityOptions, label)
	}

	c.JSON(http.StatusOK, gin.H{
		"stats":      stats,
		"complaints": complaintPayload,
		"filters": gin.H{
			"categories": categories,
			"statuses":   statusOptions,
			"priorities": priorityOptions,
		},
		"regulations":   regulationsPayload,
		"announcements": announcementsPayload,
	})
}

func StaffComplaintsStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleStaff {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	category := strings.TrimSpace(c.PostForm("category"))
	subject := strings.TrimSpace(c.PostForm("subject"))
	description := strings.TrimSpace(c.PostForm("description"))
	priority := strings.TrimSpace(c.PostForm("priority"))
	isAnonymous := c.PostForm("anonymous") == "true" || c.PostForm("anonymous") == "1"

	if category == "" || subject == "" || description == "" {
		ValidationErrors(c, FieldErrors{"category": "Kategori wajib diisi.", "subject": "Subjek wajib diisi.", "description": "Deskripsi wajib diisi."})
		return
	}

	if priority == "" {
		priority = models.ComplaintPriorityMedium
	}

	code, err := services.GenerateComplaintCode(db)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal membuat pengaduan")
		return
	}

	var attachmentPath *string
	var attachmentName *string
	var attachmentMime *string
	var attachmentSize *int64

	if _, err := c.FormFile("attachment"); err == nil {
		path, meta, err := saveUploadedFile(c, "attachment", "complaints")
		if err == nil {
			attachmentPath = &path
			attachmentName = &meta.OriginalName
			attachmentMime = &meta.Mime
			attachmentSize = &meta.Size
		}
	}

	now := time.Now()
	_, err = db.Exec(`INSERT INTO complaints (complaint_code, user_id, category, subject, description, status, priority, is_anonymous, attachment_path, attachment_name, attachment_mime, attachment_size, submitted_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		code, user.ID, category, subject, description, models.ComplaintStatusNew, priority, isAnonymous, attachmentPath, attachmentName, attachmentMime, attachmentSize, now, now, now)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal menyimpan pengaduan")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "Pengaduan berhasil dikirim dan menunggu tindak lanjut HR."})
}

func StaffResignationIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleStaff {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	terminations := []models.StaffTermination{}
	_ = db.Select(&terminations, "SELECT * FROM staff_terminations WHERE user_id = ? ORDER BY created_at DESC", user.ID)

	var active any
	for _, termination := range terminations {
		if termination.Status == "Diajukan" || termination.Status == "Proses" {
			active = map[string]any{
				"reference":     termination.Reference,
				"type":          termination.Type,
				"status":        termination.Status,
				"progress":      termination.Progress,
				"requestDate":   formatDate(termination.RequestDate),
				"effectiveDate": formatDate(termination.EffectiveDate),
				"reason":        termination.Reason,
				"suggestion":    termination.Suggestion,
			}
			break
		}
	}

	history := make([]map[string]any, 0, len(terminations))
	for _, termination := range terminations {
		history = append(history, map[string]any{
			"reference":     termination.Reference,
			"type":          termination.Type,
			"status":        termination.Status,
			"progress":      termination.Progress,
			"requestDate":   formatDate(termination.RequestDate),
			"effectiveDate": formatDate(termination.EffectiveDate),
			"reason":        termination.Reason,
			"suggestion":    termination.Suggestion,
		})
	}

	profile := map[string]any{
		"name":          user.Name,
		"employeeCode":  user.EmployeeCode,
		"division":      user.Division,
		"position":      user.Role,
		"joinedAt":      formatDateISO(user.RegisteredAt),
		"joinedDisplay": formatDate(user.RegisteredAt),
	}

	c.JSON(http.StatusOK, gin.H{
		"profile":       profile,
		"activeRequest": active,
		"history":       history,
	})
}

func StaffResignationStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleStaff {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	var payload struct {
		EffectiveDate string `form:"effective_date" json:"effective_date"`
		Reason        string `form:"reason" json:"reason"`
		Suggestion    string `form:"suggestion" json:"suggestion"`
	}
	_ = c.ShouldBind(&payload)

	effectiveDate := strings.TrimSpace(payload.EffectiveDate)
	reason := strings.TrimSpace(payload.Reason)
	suggestion := strings.TrimSpace(payload.Suggestion)

	if effectiveDate == "" || reason == "" {
		ValidationErrors(c, FieldErrors{"effective_date": "Tanggal efektif wajib diisi.", "reason": "Alasan wajib diisi."})
		return
	}

	var activeCount int
	_ = db.Get(&activeCount, "SELECT COUNT(*) FROM staff_terminations WHERE user_id = ? AND status IN ('Diajukan','Proses')", user.ID)
	if activeCount > 0 {
		ValidationErrors(c, FieldErrors{"effective_date": "Anda masih memiliki pengajuan resign yang berjalan."})
		return
	}

	reference, err := services.GenerateTerminationReference(db)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal membuat pengajuan")
		return
	}

	now := time.Now()
	_, err = db.Exec(`INSERT INTO staff_terminations (reference, user_id, requested_by, employee_code, employee_name, division, position, type, reason, suggestion, request_date, effective_date, status, progress, checklist, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Resign', ?, ?, ?, ?, 'Diajukan', 0, ?, ?, ?)`,
		reference, user.ID, user.ID, user.EmployeeCode, user.Name, user.Division, user.Role, reason, suggestion, now.Format("2006-01-02"), effectiveDate, "{}", now, now)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal menyimpan pengajuan")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "Pengajuan resign berhasil dikirim ke HR."})
}

func attachmentURL(c *gin.Context, path *string) *string {
	if path == nil || *path == "" {
		return nil
	}
	cfg := middleware.GetConfig(c)
	// Generate full URL using backend base URL
	url := cfg.BaseURL + "/storage/" + strings.TrimPrefix(*path, "/")
	return &url
}

func firstString(ptr *string, fallback string) string {
	if ptr == nil || *ptr == "" {
		return fallback
	}
	return *ptr
}
