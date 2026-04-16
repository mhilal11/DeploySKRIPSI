package staff

import (
	"hris-backend/internal/dto"
	"hris-backend/internal/http/handlers"
	pelamarhandlers "hris-backend/internal/http/handlers/pelamar"
	dbrepo "hris-backend/internal/repository"

	"net/http"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type staffRepository interface {
	CountComplaintsByUserID(userID int64) (int, error)
	CountComplaintsByUserIDAndStatuses(userID int64, statuses ...string) (int, error)
	CountDivisionIncomingRegulations(division string, since *time.Time) (int, error)
	CountStaffTerminationsByUserID(userID int64) (int, error)
	ListComplaintsByUserID(userID int64, limit int) ([]models.Complaint, error)
	ListComplaintsByUserIDPaged(userID int64, limit, offset int) ([]models.Complaint, error)
	ListDivisionIncomingRegulations(division string, limit int) ([]models.Surat, error)
	ListDivisionAnnouncements(division string, limit int) ([]models.Surat, error)
	ListStaffTerminationsByUserID(userID int64) ([]models.StaffTermination, error)
	ListStaffTerminationsByUserIDPaged(userID int64, limit, offset int) ([]models.StaffTermination, error)
	InsertStaffComplaint(input dbrepo.StaffComplaintCreateInput) error
	InsertStaffTermination(input dbrepo.StaffTerminationCreateInput) error
}

type sqlStaffRepository struct {
	db *sqlx.DB
}

var allowedComplaintCategories = []string{
	"Lingkungan Kerja",
	"Kompensasi & Benefit",
	"Fasilitas",
	"Relasi Kerja",
	"Kebijakan Perusahaan",
	"Lainnya",
}

func newStaffRepository(db *sqlx.DB) staffRepository {
	return &sqlStaffRepository{db: db}
}

func (r *sqlStaffRepository) CountComplaintsByUserID(userID int64) (int, error) {
	return dbrepo.CountComplaintsByUserID(r.db, userID)
}

func (r *sqlStaffRepository) CountComplaintsByUserIDAndStatuses(userID int64, statuses ...string) (int, error) {
	return dbrepo.CountComplaintsByUserIDAndStatuses(r.db, userID, statuses...)
}

func (r *sqlStaffRepository) CountDivisionIncomingRegulations(division string, since *time.Time) (int, error) {
	return dbrepo.CountDivisionIncomingRegulations(r.db, division, since)
}

func (r *sqlStaffRepository) CountStaffTerminationsByUserID(userID int64) (int, error) {
	return dbrepo.CountStaffTerminationsByUserID(r.db, userID)
}

func (r *sqlStaffRepository) ListComplaintsByUserID(userID int64, limit int) ([]models.Complaint, error) {
	return dbrepo.ListComplaintsByUserID(r.db, userID, limit)
}

func (r *sqlStaffRepository) ListComplaintsByUserIDPaged(userID int64, limit, offset int) ([]models.Complaint, error) {
	return dbrepo.ListComplaintsByUserIDPaged(r.db, userID, limit, offset)
}

func (r *sqlStaffRepository) ListDivisionIncomingRegulations(division string, limit int) ([]models.Surat, error) {
	return dbrepo.ListDivisionIncomingRegulations(r.db, division, limit)
}

func (r *sqlStaffRepository) ListDivisionAnnouncements(division string, limit int) ([]models.Surat, error) {
	return dbrepo.ListDivisionAnnouncements(r.db, division, limit)
}

func (r *sqlStaffRepository) ListStaffTerminationsByUserID(userID int64) ([]models.StaffTermination, error) {
	return dbrepo.ListStaffTerminationsByUserID(r.db, userID)
}

func (r *sqlStaffRepository) ListStaffTerminationsByUserIDPaged(userID int64, limit, offset int) ([]models.StaffTermination, error) {
	return dbrepo.ListStaffTerminationsByUserIDPaged(r.db, userID, limit, offset)
}

func (r *sqlStaffRepository) InsertStaffComplaint(input dbrepo.StaffComplaintCreateInput) error {
	return dbrepo.InsertStaffComplaint(r.db, input)
}

func (r *sqlStaffRepository) InsertStaffTermination(input dbrepo.StaffTerminationCreateInput) error {
	return dbrepo.InsertStaffTermination(r.db, input)
}

func RegisterStaffRoutes(rg *gin.RouterGroup) {
	rg.GET("/staff/dashboard", StaffDashboard)
	rg.GET("/staff/references/education", pelamarhandlers.StaffEducationReferences)
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
	repo := newStaffRepository(db)

	totalComplaints, _ := repo.CountComplaintsByUserID(user.ID)
	activeComplaints, _ := repo.CountComplaintsByUserIDAndStatuses(user.ID, models.ComplaintStatusNew, models.ComplaintStatusInProgress)

	var regulationsCount int
	if user.Division != nil {
		since := time.Now().AddDate(0, -3, 0)
		regulationsCount, _ = repo.CountDivisionIncomingRegulations(*user.Division, &since)
	}

	terminationCount, _ := repo.CountStaffTerminationsByUserID(user.ID)

	stats := []dto.StaffDashboardStat{
		{Label: "Pengaduan Aktif", Value: activeComplaints, Icon: "alert"},
		{Label: "Total Pengaduan", Value: totalComplaints, Icon: "message"},
		{Label: "Regulasi Terbaru", Value: regulationsCount, Icon: "file"},
		{Label: "Pengajuan Resign", Value: terminationCount, Icon: "briefcase"},
	}

	complaints, _ := repo.ListComplaintsByUserID(user.ID, 5)

	recentComplaints := make([]dto.StaffComplaintSummary, 0, len(complaints))
	for _, complaint := range complaints {
		recentComplaints = append(recentComplaints, dto.StaffComplaintSummary{
			ID:       complaint.ID,
			Subject:  complaint.Subject,
			Status:   models.ComplaintStatusLabels[complaint.Status],
			Priority: models.ComplaintPriorityLabels[complaint.Priority],
			Date:     handlers.FormatDate(complaint.SubmittedAt),
		})
	}

	regulations := []models.Surat{}
	if user.Division != nil {
		regulations, _ = repo.ListDivisionIncomingRegulations(*user.Division, 5)
	}
	regulationsPayload := make([]dto.StaffRegulationSummary, 0, len(regulations))
	for _, surat := range regulations {
		regulationsPayload = append(regulationsPayload, dto.StaffRegulationSummary{
			ID:            surat.SuratID,
			Title:         surat.Perihal,
			Category:      surat.Kategori,
			Date:          handlers.FormatDate(surat.TanggalSurat),
			AttachmentURL: attachmentURL(c, surat.LampiranPath),
		})
	}

	terminations, _ := repo.ListStaffTerminationsByUserID(user.ID)
	var activeTermination *models.StaffTermination
	if len(terminations) > 0 {
		activeTermination = &terminations[0]
	}

	var terminationSummary *dto.StaffTerminationSummary
	if activeTermination != nil {
		terminationSummary = &dto.StaffTerminationSummary{
			Reference:     activeTermination.Reference,
			Status:        activeTermination.Status,
			Progress:      activeTermination.Progress,
			EffectiveDate: handlers.FormatDate(activeTermination.EffectiveDate),
			RequestDate:   handlers.FormatDate(activeTermination.RequestDate),
		}
	}

	terminationHistory := make([]dto.StaffTerminationSummary, 0)
	for i, termination := range terminations {
		if i >= 5 {
			break
		}
		terminationHistory = append(terminationHistory, dto.StaffTerminationSummary{
			Reference:     termination.Reference,
			Type:          termination.Type,
			Status:        termination.Status,
			RequestDate:   handlers.FormatDate(termination.RequestDate),
			EffectiveDate: handlers.FormatDate(termination.EffectiveDate),
		})
	}

	c.JSON(http.StatusOK, dto.StaffDashboardResponse{
		Stats:            stats,
		RecentComplaints: recentComplaints,
		Regulations:      regulationsPayload,
		Termination: dto.StaffTerminationSection{
			Active:  terminationSummary,
			History: terminationHistory,
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
	repo := newStaffRepository(db)
	pagination := handlers.ParsePagination(c, 20, 100)
	complaints, _ := repo.ListComplaintsByUserIDPaged(user.ID, pagination.Limit, pagination.Offset)
	totalComplaints, _ := repo.CountComplaintsByUserID(user.ID)
	complaintIDs := make([]int64, 0, len(complaints))
	for _, complaint := range complaints {
		complaintIDs = append(complaintIDs, complaint.ID)
	}
	complaintAttachments, _ := dbrepo.ListComplaintAttachmentsByComplaintIDs(db, complaintIDs)
	attachmentsByComplaintID := handlers.GroupComplaintAttachmentsByComplaintID(complaintAttachments)

	stats := map[string]int{
		"new":          0,
		"inProgress":   0,
		"resolved":     0,
		"totalRecords": totalComplaints,
	}
	stats["new"], _ = repo.CountComplaintsByUserIDAndStatuses(user.ID, models.ComplaintStatusNew)
	stats["inProgress"], _ = repo.CountComplaintsByUserIDAndStatuses(user.ID, models.ComplaintStatusInProgress)
	stats["resolved"], _ = repo.CountComplaintsByUserIDAndStatuses(user.ID, models.ComplaintStatusResolved)

	if user.Division != nil {
		regulationsCount, _ := repo.CountDivisionIncomingRegulations(*user.Division, nil)
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
		attachmentsPayload := handlers.BuildComplaintAttachmentPayloads(
			c,
			attachmentsByComplaintID[complaint.ID],
			complaint.AttachmentName,
			complaint.AttachmentPath,
		)
		var primaryAttachment any
		if len(attachmentsPayload) > 0 {
			primaryAttachment = attachmentsPayload[0]
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
			"attachment":      primaryAttachment,
			"attachments":     attachmentsPayload,
		})
	}

	categories := make([]string, 0, len(categoryOptions))
	for k := range categoryOptions {
		categories = append(categories, k)
	}

	regulations := []models.Surat{}
	announcements := []models.Surat{}
	if user.Division != nil {
		regulations, _ = repo.ListDivisionIncomingRegulations(*user.Division, 10)
		announcements, _ = repo.ListDivisionAnnouncements(*user.Division, 5)
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
	repo := newStaffRepository(db)

	category := strings.TrimSpace(c.PostForm("category"))
	subject := strings.TrimSpace(c.PostForm("subject"))
	description := strings.TrimSpace(c.PostForm("description"))
	priority := strings.ToLower(strings.TrimSpace(c.PostForm("priority")))
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
	handlers.ValidateAllowedValue(validationErrors, "category", "Kategori", category, allowedComplaintCategories)
	handlers.ValidateAllowedValue(validationErrors, "priority", "Prioritas", priority, []string{
		models.ComplaintPriorityHigh,
		models.ComplaintPriorityMedium,
		models.ComplaintPriorityLow,
	})
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

	savedAttachments, err := handlers.SaveValidatedUploadedFiles(
		c,
		"attachments",
		"complaints",
		handlers.ImageUploadRules(),
		3,
		handlers.MaxCommonUploadSizeBytes,
	)
	if err != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{
			"attachments": "Lampiran maksimal 3 gambar PNG, JPG, atau JPEG dengan total ukuran maksimal 5MB.",
		})
		return
	}
	now := time.Now().UTC()
	attachmentInputs := make([]dbrepo.ComplaintAttachmentCreateInput, 0, len(savedAttachments))
	for index, attachment := range savedAttachments {
		attachmentInputs = append(attachmentInputs, dbrepo.ComplaintAttachmentCreateInput{
			FilePath:  attachment.Path,
			FileName:  attachment.Meta.OriginalName,
			FileMime:  attachment.Meta.Mime,
			FileSize:  attachment.Meta.Size,
			SortOrder: index + 1,
			CreatedAt: now,
			UpdatedAt: now,
		})
	}

	if err := repo.InsertStaffComplaint(dbrepo.StaffComplaintCreateInput{
		ComplaintCode:  code,
		UserID:         user.ID,
		Category:       category,
		Subject:        subject,
		Description:    description,
		Status:         models.ComplaintStatusNew,
		Priority:       priority,
		IsAnonymous:    isAnonymous,
		Attachments:    attachmentInputs,
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
	repo := newStaffRepository(db)
	pagination := handlers.ParsePagination(c, 10, 100)

	terminations, _ := repo.ListStaffTerminationsByUserIDPaged(user.ID, pagination.Limit, pagination.Offset)
	totalTerminations, _ := repo.CountStaffTerminationsByUserID(user.ID)

	allTerminations, _ := repo.ListStaffTerminationsByUserID(user.ID)
	var active *dto.StaffTerminationSummary
	for _, termination := range allTerminations {
		if termination.Status == "Diajukan" || termination.Status == "Proses" {
			active = &dto.StaffTerminationSummary{
				Reference:     termination.Reference,
				Type:          termination.Type,
				Status:        termination.Status,
				Progress:      termination.Progress,
				RequestDate:   handlers.FormatDate(termination.RequestDate),
				EffectiveDate: handlers.FormatDate(termination.EffectiveDate),
				Reason:        termination.Reason,
				Suggestion:    termination.Suggestion,
			}
			break
		}
	}

	history := make([]dto.StaffTerminationSummary, 0, len(terminations))
	for _, termination := range terminations {
		history = append(history, dto.StaffTerminationSummary{
			Reference:     termination.Reference,
			Type:          termination.Type,
			Status:        termination.Status,
			Progress:      termination.Progress,
			RequestDate:   handlers.FormatDate(termination.RequestDate),
			EffectiveDate: handlers.FormatDate(termination.EffectiveDate),
			Reason:        termination.Reason,
			Suggestion:    termination.Suggestion,
		})
	}

	c.JSON(http.StatusOK, dto.StaffResignationResponse{
		Profile: dto.StaffResignationProfile{
			Name:          user.Name,
			EmployeeCode:  user.EmployeeCode,
			Division:      user.Division,
			Position:      user.Role,
			JoinedAt:      handlers.FormatDateISO(user.RegisteredAt),
			JoinedDisplay: handlers.FormatDate(user.RegisteredAt),
		},
		ActiveRequest: active,
		History:       history,
		Pagination:    handlers.BuildPaginationMeta(pagination.Page, pagination.Limit, totalTerminations),
	})
}

func StaffResignationStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleStaff {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)
	repo := newStaffRepository(db)

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
	if effectiveDate != "" {
		parsedDate, err := handlers.ParseDateStrict(effectiveDate, "2006-01-02")
		if err != nil {
			validationErrors["effective_date"] = "Format tanggal efektif tidak valid."
		} else {
			now := time.Now()
			minEffectiveDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).AddDate(0, 0, 30)
			if parsedDate.Before(minEffectiveDate) {
				validationErrors["effective_date"] = "Tanggal efektif resign minimal 30 hari dari hari ini."
			}
		}
	}
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	submittedCount, _ := repo.CountStaffTerminationsByUserID(user.ID)
	if submittedCount > 0 {
		handlers.ValidationErrors(c, handlers.FieldErrors{"effective_date": "Pengajuan resign hanya dapat dilakukan satu kali."})
		return
	}

	reference, err := services.GenerateTerminationReference(db)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal membuat pengajuan")
		return
	}

	now := time.Now().UTC()
	if err := repo.InsertStaffTermination(dbrepo.StaffTerminationCreateInput{
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
