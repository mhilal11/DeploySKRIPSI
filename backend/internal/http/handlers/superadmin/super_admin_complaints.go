package superadmin

import (
	"hris-backend/internal/http/handlers"
	dbrepo "hris-backend/internal/repository"

	"math"
	"net/http"
	"net/url"
	"sort"
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
	complaints, err := repo.ListComplaintsByFiltersPaged(filterConfig, pagination.Limit, pagination.Offset)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat daftar pengaduan")
		return
	}
	totalComplaints, err := repo.CountComplaintsByFilters(filterConfig)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menghitung daftar pengaduan")
		return
	}
	allComplaints, err := dbrepo.ListComplaintsByFilters(db, filterConfig)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat ringkasan pengaduan")
		return
	}

	data := make([]map[string]any, 0, len(complaints))
	for _, complaint := range complaints {
		status := normalizeComplaintStatus(complaint.Status)
		if status == "" {
			status = models.ComplaintStatusNew
		}
		priority := normalizeComplaintPriority(complaint.Priority)
		if priority == "" {
			priority = models.ComplaintPriorityMedium
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
	stats["new"], err = repo.CountComplaintsByFilters(newFilter)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menghitung pengaduan baru")
		return
	}
	inProgressFilter := filterConfig
	inProgressFilter.Status = models.ComplaintStatusInProgress
	stats["in_progress"], err = repo.CountComplaintsByFilters(inProgressFilter)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menghitung pengaduan diproses")
		return
	}
	resolvedFilter := filterConfig
	resolvedFilter.Status = models.ComplaintStatusResolved
	stats["resolved"], err = repo.CountComplaintsByFilters(resolvedFilter)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menghitung pengaduan selesai")
		return
	}
	categories := collectComplaintCategories(allComplaints)

	statusOptions := []map[string]string{}
	for value, label := range models.ComplaintStatusLabels {
		statusOptions = append(statusOptions, map[string]string{"value": value, "label": label})
	}

	priorityOptions := []map[string]string{}
	for value, label := range models.ComplaintPriorityLabels {
		priorityOptions = append(priorityOptions, map[string]string{"value": value, "label": label})
	}
	sort.Slice(statusOptions, func(i, j int) bool { return statusOptions[i]["label"] < statusOptions[j]["label"] })
	sort.Slice(priorityOptions, func(i, j int) bool { return priorityOptions[i]["label"] < priorityOptions[j]["label"] })

	paginationMeta := buildComplaintPaginationMeta(pagination.Page, pagination.Limit, totalComplaints)
	paginationLinks := buildComplaintPaginationLinks(c, pagination.Page, pagination.Limit, totalComplaints)

	c.JSON(http.StatusOK, gin.H{
		"filters": filters,
		"stats":   stats,
		"complaintTrend": gin.H{
			"weekly":  buildComplaintTrendSeries(allComplaints, "weekly", 12, time.Now()),
			"monthly": buildComplaintTrendSeries(allComplaints, "monthly", 12, time.Now()),
		},
		"complaints": gin.H{
			"data":  data,
			"links": paginationLinks,
			"meta":  paginationMeta,
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
	if strings.TrimSpace(payload.Status) != "" && status == "" {
		validationErrors["status"] = "Status tidak valid."
	}
	if strings.TrimSpace(payload.Priority) != "" && priority == "" {
		validationErrors["priority"] = "Prioritas tidak valid."
	}
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

	if err := repo.UpdateComplaint(dbrepo.ComplaintUpdateInput{
		ID:              complaintID,
		Status:          status,
		Priority:        priority,
		ResolutionNotes: resolution,
		HandledByID:     user.ID,
		ResolvedAt:      resolvedAt,
	}); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Pengaduan gagal diperbarui")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "Pengaduan berhasil diperbarui."})
}

func collectComplaintCategories(rows []models.Complaint) []string {
	seen := map[string]bool{}
	categories := make([]string, 0, len(rows))
	for _, row := range rows {
		category := strings.TrimSpace(row.Category)
		if category == "" || seen[category] {
			continue
		}
		seen[category] = true
		categories = append(categories, category)
	}
	sort.Strings(categories)
	return categories
}

func buildComplaintPaginationMeta(page, limit, total int) map[string]any {
	if page < 1 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}

	lastPage := 1
	if total > 0 {
		lastPage = int(math.Ceil(float64(total) / float64(limit)))
		if lastPage < 1 {
			lastPage = 1
		}
	}
	if page > lastPage {
		page = lastPage
	}

	var from any
	var to any
	if total > 0 {
		fromValue := ((page - 1) * limit) + 1
		toValue := fromValue + limit - 1
		if toValue > total {
			toValue = total
		}
		from = fromValue
		to = toValue
	}

	return map[string]any{
		"current_page": page,
		"last_page":    lastPage,
		"per_page":     limit,
		"total":        total,
		"from":         from,
		"to":           to,
	}
}

func buildComplaintPaginationLinks(c *gin.Context, page, limit, total int) []map[string]any {
	if page < 1 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}

	lastPage := 1
	if total > 0 {
		lastPage = int(math.Ceil(float64(total) / float64(limit)))
		if lastPage < 1 {
			lastPage = 1
		}
	}
	if page > lastPage {
		page = lastPage
	}

	links := make([]map[string]any, 0, lastPage+2)
	links = append(links, map[string]any{
		"url":    complaintPageURL(c, page-1, lastPage),
		"label":  "&laquo; Previous",
		"active": false,
	})
	for currentPage := 1; currentPage <= lastPage; currentPage++ {
		links = append(links, map[string]any{
			"url":    complaintPageURL(c, currentPage, lastPage),
			"label":  strconv.Itoa(currentPage),
			"active": currentPage == page,
		})
	}
	links = append(links, map[string]any{
		"url":    complaintPageURL(c, page+1, lastPage),
		"label":  "Next &raquo;",
		"active": false,
	})
	return links
}

func complaintPageURL(c *gin.Context, page, lastPage int) any {
	if page < 1 || page > lastPage {
		return nil
	}
	query := url.Values{}
	for key, values := range c.Request.URL.Query() {
		query[key] = append([]string(nil), values...)
	}
	if page <= 1 {
		query.Del("page")
	} else {
		query.Set("page", strconv.Itoa(page))
	}
	encoded := query.Encode()
	if encoded == "" {
		return c.Request.URL.Path
	}
	return c.Request.URL.Path + "?" + encoded
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
