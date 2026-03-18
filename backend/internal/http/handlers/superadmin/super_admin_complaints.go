package superadmin

import (
	"hris-backend/internal/http/handlers"
	dbrepo "hris-backend/internal/repository"

	"net/http"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type complaintsRepository interface {
	ListComplaintsByFiltersPaged(filters dbrepo.ComplaintListFilters, limit, offset int) ([]models.Complaint, error)
	CountComplaintsByFilters(filters dbrepo.ComplaintListFilters) (int, error)
	GetComplaintByID(id int64) (*models.Complaint, error)
	UpdateComplaint(input dbrepo.ComplaintUpdateInput) error
	GetUserByID(userID int64) (*models.User, error)
}

type sqlComplaintsRepository struct {
	db *sqlx.DB
}

func newComplaintsRepository(db *sqlx.DB) complaintsRepository {
	return &sqlComplaintsRepository{db: db}
}

func (r *sqlComplaintsRepository) ListComplaintsByFiltersPaged(filters dbrepo.ComplaintListFilters, limit, offset int) ([]models.Complaint, error) {
	return dbrepo.ListComplaintsByFiltersPaged(r.db, filters, limit, offset)
}

func (r *sqlComplaintsRepository) CountComplaintsByFilters(filters dbrepo.ComplaintListFilters) (int, error) {
	return dbrepo.CountComplaintsByFilters(r.db, filters)
}

func (r *sqlComplaintsRepository) GetComplaintByID(id int64) (*models.Complaint, error) {
	return dbrepo.GetComplaintByID(r.db, id)
}

func (r *sqlComplaintsRepository) UpdateComplaint(input dbrepo.ComplaintUpdateInput) error {
	return dbrepo.UpdateComplaint(r.db, input)
}

func (r *sqlComplaintsRepository) GetUserByID(userID int64) (*models.User, error) {
	return dbrepo.GetUserByID(r.db, userID)
}

func SuperAdminComplaintsIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	repo := newComplaintsRepository(db)

	filters := map[string]string{
		"search":   strings.TrimSpace(c.Query("search")),
		"status":   strings.TrimSpace(c.Query("status")),
		"priority": strings.TrimSpace(c.Query("priority")),
		"category": strings.TrimSpace(c.Query("category")),
	}
	pagination := handlers.ParsePagination(c, 20, 100)

	filterConfig := dbrepo.ComplaintListFilters{
		Search:   filters["search"],
		Status:   normalizeComplaintStatus(filters["status"]),
		Priority: normalizeComplaintPriority(filters["priority"]),
		Category: filters["category"],
	}
	complaints, _ := repo.ListComplaintsByFiltersPaged(filterConfig, pagination.Limit, pagination.Offset)
	totalComplaints, _ := repo.CountComplaintsByFilters(filterConfig)
	allComplaints, _ := dbrepo.ListComplaintsByFilters(db, filterConfig)

	data := make([]map[string]any, 0, len(complaints))
	categoryOptions := map[string]bool{}
	for _, complaint := range complaints {
		status := normalizeComplaintStatus(complaint.Status)
		if status == "" {
			status = models.ComplaintStatusNew
		}
		priority := normalizeComplaintPriority(complaint.Priority)
		if priority == "" {
			priority = models.ComplaintPriorityMedium
		}

		if complaint.Category != "" {
			categoryOptions[complaint.Category] = true
		}
		reporterName := "Anonim"
		reporterEmail := ""
		if !complaint.IsAnonymous {
			reporterName = handlers.LookupUserName(db, complaint.UserID)
			reporterEmail = lookupUserEmail(repo, complaint.UserID)
		}
		var handlerName any = nil
		if complaint.HandledByID != nil {
			name := strings.TrimSpace(handlers.LookupUserName(db, *complaint.HandledByID))
			if name != "" {
				handlerName = name
			}
		}
		var resolvedAt any = nil
		if complaint.ResolvedAt != nil && !complaint.ResolvedAt.IsZero() {
			resolvedAt = handlers.FormatDateTime(complaint.ResolvedAt)
		}
		data = append(data, map[string]any{
			"id":              complaint.ID,
			"code":            complaint.ComplaintCode,
			"reporter":        reporterName,
			"reporterEmail":   reporterEmail,
			"category":        complaint.Category,
			"subject":         complaint.Subject,
			"description":     complaint.Description,
			"submittedAt":     handlers.FormatDateTime(complaint.SubmittedAt),
			"status":          status,
			"statusLabel":     complaintStatusLabel(status),
			"priority":        priority,
			"priorityLabel":   complaintPriorityLabel(priority),
			"isAnonymous":     complaint.IsAnonymous,
			"handler":         handlerName,
			"resolutionNotes": complaint.ResolutionNotes,
			"resolvedAt":      resolvedAt,
			"attachment": map[string]any{
				"name": complaint.AttachmentName,
				"url":  handlers.AttachmentURL(c, complaint.AttachmentPath),
			},
		})
	}

	stats := map[string]int{
		"total":       totalComplaints,
		"new":         0,
		"in_progress": 0,
		"resolved":    0,
	}
	newFilter := filterConfig
	newFilter.Status = models.ComplaintStatusNew
	stats["new"], _ = repo.CountComplaintsByFilters(newFilter)
	inProgressFilter := filterConfig
	inProgressFilter.Status = models.ComplaintStatusInProgress
	stats["in_progress"], _ = repo.CountComplaintsByFilters(inProgressFilter)
	resolvedFilter := filterConfig
	resolvedFilter.Status = models.ComplaintStatusResolved
	stats["resolved"], _ = repo.CountComplaintsByFilters(resolvedFilter)

	categories := []string{}
	for k := range categoryOptions {
		categories = append(categories, k)
	}

	statusOptions := []map[string]string{}
	for value, label := range models.ComplaintStatusLabels {
		statusOptions = append(statusOptions, map[string]string{"value": value, "label": label})
	}

	priorityOptions := []map[string]string{}
	for value, label := range models.ComplaintPriorityLabels {
		priorityOptions = append(priorityOptions, map[string]string{"value": value, "label": label})
	}

	c.JSON(http.StatusOK, gin.H{
		"filters": filters,
		"stats":   stats,
		"complaintTrend": gin.H{
			"weekly":  buildComplaintTrendSeries(allComplaints, "weekly", 12, time.Now()),
			"monthly": buildComplaintTrendSeries(allComplaints, "monthly", 12, time.Now()),
		},
		"complaints": gin.H{
			"data":  data,
			"links": []any{},
		},
		"pagination":           handlers.BuildPaginationMeta(pagination.Page, pagination.Limit, totalComplaints),
		"statusOptions":        statusOptions,
		"priorityOptions":      priorityOptions,
		"categoryOptions":      categories,
		"regulations":          []any{},
		"announcements":        []any{},
		"sidebarNotifications": handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
	})
}

type complaintTrendBucket struct {
	start      time.Time
	total      int
	newCount   int
	inProgress int
	resolved   int
	archived   int
}

func buildComplaintTrendSeries(rows []models.Complaint, period string, points int, now time.Time) []map[string]any {
	if points <= 0 {
		points = 12
	}

	location := now.Location()
	if location == nil {
		location = time.UTC
	}

	normalizedPeriod := strings.ToLower(strings.TrimSpace(period))
	if normalizedPeriod != "weekly" {
		normalizedPeriod = "monthly"
	}

	buckets := make([]complaintTrendBucket, 0, points)
	indexByKey := make(map[string]int, points)

	for offset := points - 1; offset >= 0; offset-- {
		var bucketStart time.Time
		if normalizedPeriod == "weekly" {
			bucketStart = startOfWeek(now.AddDate(0, 0, -7*offset).In(location))
		} else {
			cursor := now.AddDate(0, -offset, 0).In(location)
			bucketStart = time.Date(cursor.Year(), cursor.Month(), 1, 0, 0, 0, 0, location)
		}
		key := bucketStart.Format("2006-01-02")
		indexByKey[key] = len(buckets)
		buckets = append(buckets, complaintTrendBucket{start: bucketStart})
	}

	for _, row := range rows {
		if row.SubmittedAt == nil || row.SubmittedAt.IsZero() {
			continue
		}

		submittedAt := row.SubmittedAt.In(location)
		var bucketStart time.Time
		if normalizedPeriod == "weekly" {
			bucketStart = startOfWeek(submittedAt)
		} else {
			bucketStart = time.Date(submittedAt.Year(), submittedAt.Month(), 1, 0, 0, 0, 0, location)
		}

		key := bucketStart.Format("2006-01-02")
		bucketIndex, exists := indexByKey[key]
		if !exists {
			continue
		}

		buckets[bucketIndex].total++

		switch normalizeComplaintStatus(row.Status) {
		case models.ComplaintStatusNew:
			buckets[bucketIndex].newCount++
		case models.ComplaintStatusInProgress:
			buckets[bucketIndex].inProgress++
		case models.ComplaintStatusResolved:
			buckets[bucketIndex].resolved++
		case models.ComplaintStatusArchived:
			buckets[bucketIndex].archived++
		default:
			buckets[bucketIndex].newCount++
		}
	}

	result := make([]map[string]any, 0, len(buckets))
	for _, bucket := range buckets {
		label := bucket.start.Format("Jan 2006")
		if normalizedPeriod == "weekly" {
			label = bucket.start.Format("02 Jan")
		}
		result = append(result, map[string]any{
			"key":         bucket.start.Format("2006-01-02"),
			"label":       label,
			"total":       bucket.total,
			"new":         bucket.newCount,
			"in_progress": bucket.inProgress,
			"resolved":    bucket.resolved,
			"archived":    bucket.archived,
		})
	}

	return result
}

func startOfWeek(value time.Time) time.Time {
	offset := int(value.Weekday()) - int(time.Monday)
	if offset < 0 {
		offset += 7
	}
	start := value.AddDate(0, 0, -offset)
	return time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, value.Location())
}

func SuperAdminComplaintsUpdate(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	var payload struct {
		Status          string `form:"status" json:"status"`
		Priority        string `form:"priority" json:"priority"`
		ResolutionNotes string `form:"resolution_notes" json:"resolution_notes"`
	}
	_ = c.ShouldBind(&payload)

	status := normalizeComplaintStatus(payload.Status)
	priority := normalizeComplaintPriority(payload.Priority)
	resolution := strings.TrimSpace(payload.ResolutionNotes)
	validationErrors := handlers.FieldErrors{}
	handlers.ValidateFieldLength(validationErrors, "resolution_notes", "Catatan penyelesaian", resolution, 4000)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	db := middleware.GetDB(c)
	repo := newComplaintsRepository(db)
	complaintID, err := strconv.ParseInt(id, 10, 64)
	if err != nil || complaintID <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID pengaduan tidak valid")
		return
	}

	existing, err := repo.GetComplaintByID(complaintID)
	if err != nil || existing == nil {
		handlers.JSONError(c, http.StatusNotFound, "Pengaduan tidak ditemukan")
		return
	}

	if status == "" {
		status = normalizeComplaintStatus(existing.Status)
	}
	if priority == "" {
		priority = normalizeComplaintPriority(existing.Priority)
	}
	if status == "" {
		status = models.ComplaintStatusNew
	}
	if priority == "" {
		priority = models.ComplaintPriorityMedium
	}

	var resolvedAt *time.Time
	if status == models.ComplaintStatusResolved {
		now := time.Now().UTC()
		resolvedAt = &now
	}

	_ = repo.UpdateComplaint(dbrepo.ComplaintUpdateInput{
		ID:              complaintID,
		Status:          status,
		Priority:        priority,
		ResolutionNotes: resolution,
		HandledByID:     user.ID,
		ResolvedAt:      resolvedAt,
	})

	c.JSON(http.StatusOK, gin.H{"status": "Pengaduan berhasil diperbarui."})
}

func normalizeComplaintStatus(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	switch value {
	case "new", "baru", "open":
		return models.ComplaintStatusNew
	case "in_progress", "onprogress", "inprogress", "processing", "proses", "diproses":
		return models.ComplaintStatusInProgress
	case "resolved", "selesai", "closed", "done":
		return models.ComplaintStatusResolved
	case "archived", "diarsipkan", "archive":
		return models.ComplaintStatusArchived
	default:
		return ""
	}
}

func normalizeComplaintPriority(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	switch value {
	case "high", "tinggi":
		return models.ComplaintPriorityHigh
	case "medium", "sedang", "normal":
		return models.ComplaintPriorityMedium
	case "low", "rendah":
		return models.ComplaintPriorityLow
	default:
		return ""
	}
}

func complaintStatusLabel(status string) string {
	if label, ok := models.ComplaintStatusLabels[status]; ok && label != "" {
		return label
	}
	return "-"
}

func complaintPriorityLabel(priority string) string {
	if label, ok := models.ComplaintPriorityLabels[priority]; ok && label != "" {
		return label
	}
	return "-"
}

func lookupUserEmail(repo complaintsRepository, userID int64) string {
	user, err := repo.GetUserByID(userID)
	if err != nil || user == nil {
		return ""
	}
	return user.Email
}
