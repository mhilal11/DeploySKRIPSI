package staff

import (
	"hris-backend/internal/http/handlers"
	dbrepo "hris-backend/internal/repository"

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
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	totalComplaints, _ := dbrepo.CountComplaintsByUserID(db, user.ID)
	activeComplaints, _ := dbrepo.CountComplaintsByUserIDAndStatuses(db, user.ID, models.ComplaintStatusNew, models.ComplaintStatusInProgress)

	var regulationsCount int
	if user.Division != nil {
		since := time.Now().AddDate(0, -3, 0)
		regulationsCount, _ = dbrepo.CountDivisionIncomingRegulations(db, *user.Division, &since)
	}

	terminationCount, _ := dbrepo.CountStaffTerminationsByUserID(db, user.ID)

	stats := []map[string]any{
		{"label": "Pengaduan Aktif", "value": activeComplaints, "icon": "alert"},
		{"label": "Total Pengaduan", "value": totalComplaints, "icon": "message"},
		{"label": "Regulasi Terbaru", "value": regulationsCount, "icon": "file"},
		{"label": "Pengajuan Resign", "value": terminationCount, "icon": "briefcase"},
	}

	complaints, _ := dbrepo.ListComplaintsByUserID(db, user.ID, 5)

	recentComplaints := make([]map[string]any, 0, len(complaints))
	for _, complaint := range complaints {
		recentComplaints = append(recentComplaints, map[string]any{
			"id":       complaint.ID,
			"subject":  complaint.Subject,
			"status":   models.ComplaintStatusLabels[complaint.Status],
			"priority": models.ComplaintPriorityLabels[complaint.Priority],
			"date":     handlers.FormatDate(complaint.SubmittedAt),
		})
	}

	regulations := []models.Surat{}
	if user.Division != nil {
		regulations, _ = dbrepo.ListDivisionIncomingRegulations(db, *user.Division, 5)
	}
	regulationsPayload := make([]map[string]any, 0, len(regulations))
	for _, surat := range regulations {
		regulationsPayload = append(regulationsPayload, map[string]any{
			"id":            surat.SuratID,
			"title":         surat.Perihal,
			"category":      surat.Kategori,
			"date":          handlers.FormatDate(surat.TanggalSurat),
			"attachmentUrl": attachmentURL(c, surat.LampiranPath),
		})
	}

	terminations, _ := dbrepo.ListStaffTerminationsByUserID(db, user.ID)
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
			"effectiveDate": handlers.FormatDate(activeTermination.EffectiveDate),
			"requestDate":   handlers.FormatDate(activeTermination.RequestDate),
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
			"requestDate":   handlers.FormatDate(termination.RequestDate),
			"effectiveDate": handlers.FormatDate(termination.EffectiveDate),
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
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)
	pagination := handlers.ParsePagination(c, 20, 100)
	complaints, _ := dbrepo.ListComplaintsByUserIDPaged(db, user.ID, pagination.Limit, pagination.Offset)
	totalComplaints, _ := dbrepo.CountComplaintsByUserID(db, user.ID)

	stats := map[string]int{
		"new":          0,
		"inProgress":   0,
		"resolved":     0,
		"totalRecords": totalComplaints,
	}
	stats["new"], _ = dbrepo.CountComplaintsByUserIDAndStatuses(db, user.ID, models.ComplaintStatusNew)
	stats["inProgress"], _ = dbrepo.CountComplaintsByUserIDAndStatuses(db, user.ID, models.ComplaintStatusInProgress)
	stats["resolved"], _ = dbrepo.CountComplaintsByUserIDAndStatuses(db, user.ID, models.ComplaintStatusResolved)

	if user.Division != nil {
		regulationsCount, _ := dbrepo.CountDivisionIncomingRegulations(db, *user.Division, nil)
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
			handlerName := handlers.LookupUserName(db, *complaint.HandledByID)
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
			"date":            handlers.FormatDate(complaint.SubmittedAt),
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
		regulations, _ = dbrepo.ListDivisionIncomingRegulations(db, *user.Division, 10)
		announcements, _ = dbrepo.ListDivisionAnnouncements(db, *user.Division, 5)
	}

	regulationsPayload := make([]map[string]any, 0, len(regulations))
	for _, surat := range regulations {
		regulationsPayload = append(regulationsPayload, map[string]any{
			"id":         surat.SuratID,
			"title":      surat.Perihal,
			"category":   surat.Kategori,
			"uploadDate": handlers.FormatDate(surat.TanggalSurat),
			"fileName":   surat.LampiranNama,
			"fileUrl":    attachmentURL(c, surat.LampiranPath),
		})
	}

	announcementsPayload := make([]map[string]any, 0, len(announcements))
	for _, surat := range announcements {
		announcementsPayload = append(announcementsPayload, map[string]any{
			"id":      surat.SuratID,
			"title":   surat.Perihal,
			"date":    handlers.FormatDate(surat.TanggalSurat),
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
		"pagination": handlers.BuildPaginationMeta(pagination.Page, pagination.Limit, totalComplaints),
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
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	category := strings.TrimSpace(c.PostForm("category"))
	subject := strings.TrimSpace(c.PostForm("subject"))
	description := strings.TrimSpace(c.PostForm("description"))
	priority := strings.TrimSpace(c.PostForm("priority"))
	isAnonymous := c.PostForm("anonymous") == "true" || c.PostForm("anonymous") == "1"

	if category == "" || subject == "" || description == "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"category": "Kategori wajib diisi.", "subject": "Subjek wajib diisi.", "description": "Deskripsi wajib diisi."})
		return
	}
	validationErrors := handlers.FieldErrors{}
	handlers.ValidateFieldLength(validationErrors, "category", "Kategori", category, 80)
	handlers.ValidateFieldLength(validationErrors, "subject", "Subjek", subject, 160)
	handlers.ValidateFieldLength(validationErrors, "description", "Deskripsi", description, 4000)
	handlers.ValidateFieldLength(validationErrors, "priority", "Prioritas", priority, 24)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	if priority == "" {
		priority = models.ComplaintPriorityMedium
	}

	code, err := services.GenerateComplaintCode(db)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal membuat pengaduan")
		return
	}

	var attachmentPath *string
	var attachmentName *string
	var attachmentMime *string
	var attachmentSize *int64

	if _, err := c.FormFile("attachment"); err == nil {
		path, meta, err := handlers.SaveUploadedFile(c, "attachment", "complaints")
		if err == nil {
			attachmentPath = &path
			attachmentName = &meta.OriginalName
			attachmentMime = &meta.Mime
			attachmentSize = &meta.Size
		}
	}

	now := time.Now()
	if err := dbrepo.InsertStaffComplaint(db, dbrepo.StaffComplaintCreateInput{
		ComplaintCode:  code,
		UserID:         user.ID,
		Category:       category,
		Subject:        subject,
		Description:    description,
		Status:         models.ComplaintStatusNew,
		Priority:       priority,
		IsAnonymous:    isAnonymous,
		AttachmentPath: attachmentPath,
		AttachmentName: attachmentName,
		AttachmentMime: attachmentMime,
		AttachmentSize: attachmentSize,
		SubmittedAt:    now,
		CreatedAt:      now,
		UpdatedAt:      now,
	}); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menyimpan pengaduan")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "Pengaduan berhasil dikirim dan menunggu tindak lanjut HR."})
}

func StaffResignationIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleStaff {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	terminations, _ := dbrepo.ListStaffTerminationsByUserID(db, user.ID)

	var active any
	for _, termination := range terminations {
		if termination.Status == "Diajukan" || termination.Status == "Proses" {
			active = map[string]any{
				"reference":     termination.Reference,
				"type":          termination.Type,
				"status":        termination.Status,
				"progress":      termination.Progress,
				"requestDate":   handlers.FormatDate(termination.RequestDate),
				"effectiveDate": handlers.FormatDate(termination.EffectiveDate),
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
			"requestDate":   handlers.FormatDate(termination.RequestDate),
			"effectiveDate": handlers.FormatDate(termination.EffectiveDate),
			"reason":        termination.Reason,
			"suggestion":    termination.Suggestion,
		})
	}

	profile := map[string]any{
		"name":          user.Name,
		"employeeCode":  user.EmployeeCode,
		"division":      user.Division,
		"position":      user.Role,
		"joinedAt":      handlers.FormatDateISO(user.RegisteredAt),
		"joinedDisplay": handlers.FormatDate(user.RegisteredAt),
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
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
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
		handlers.ValidationErrors(c, handlers.FieldErrors{"effective_date": "Tanggal efektif wajib diisi.", "reason": "Alasan wajib diisi."})
		return
	}
	validationErrors := handlers.FieldErrors{}
	handlers.ValidateFieldLength(validationErrors, "effective_date", "Tanggal efektif", effectiveDate, 30)
	handlers.ValidateFieldLength(validationErrors, "reason", "Alasan", reason, 3000)
	handlers.ValidateFieldLength(validationErrors, "suggestion", "Saran", suggestion, 3000)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	submittedCount, _ := dbrepo.CountStaffTerminationsByUserID(db, user.ID)
	if submittedCount > 0 {
		handlers.ValidationErrors(c, handlers.FieldErrors{"effective_date": "Pengajuan resign hanya dapat dilakukan satu kali."})
		return
	}

	reference, err := services.GenerateTerminationReference(db)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal membuat pengajuan")
		return
	}

	now := time.Now()
	if err := dbrepo.InsertStaffTermination(db, dbrepo.StaffTerminationCreateInput{
		Reference:     reference,
		UserID:        user.ID,
		RequestedBy:   user.ID,
		EmployeeCode:  user.EmployeeCode,
		EmployeeName:  user.Name,
		Division:      user.Division,
		Position:      &user.Role,
		Type:          "Resign",
		Reason:        reason,
		Suggestion:    suggestion,
		RequestDate:   now,
		EffectiveDate: effectiveDate,
		Status:        "Diajukan",
		Progress:      0,
		ChecklistJSON: "{}",
		CreatedAt:     now,
		UpdatedAt:     now,
	}); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menyimpan pengajuan")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "Pengajuan resign berhasil dikirim ke HR."})
}

func attachmentURL(c *gin.Context, path *string) *string {
	if path == nil || *path == "" {
		return nil
	}
	normalized := normalizeAttachmentPath(*path)
	if normalized == "" {
		return nil
	}
	if strings.HasPrefix(normalized, "http://") || strings.HasPrefix(normalized, "https://") {
		return &normalized
	}
	cfg := middleware.GetConfig(c)
	base := strings.TrimRight(cfg.BaseURL, "/")
	url := base + "/storage/" + normalized
	return &url
}

func normalizeAttachmentPath(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	trimmed = strings.ReplaceAll(trimmed, "\\", "/")
	trimmed = strings.TrimPrefix(trimmed, "./")
	trimmed = strings.TrimPrefix(trimmed, "/")
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return trimmed
	}
	trimmed = strings.TrimPrefix(trimmed, "storage/")
	return strings.TrimPrefix(trimmed, "/")
}

func firstString(ptr *string, fallback string) string {
	if ptr == nil || *ptr == "" {
		return fallback
	}
	return *ptr
}
