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

func SuperAdminComplaintsIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	filters := map[string]string{
		"search":   strings.TrimSpace(c.Query("search")),
		"status":   strings.TrimSpace(c.Query("status")),
		"priority": strings.TrimSpace(c.Query("priority")),
		"category": strings.TrimSpace(c.Query("category")),
	}

	complaints, _ := dbrepo.ListComplaintsByFilters(db, dbrepo.ComplaintListFilters{
		Search:   filters["search"],
		Status:   normalizeComplaintStatus(filters["status"]),
		Priority: normalizeComplaintPriority(filters["priority"]),
		Category: filters["category"],
	})

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
			reporterEmail = lookupUserEmail(db, complaint.UserID)
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
		"total":       len(complaints),
		"new":         countComplaintsByStatus(complaints, models.ComplaintStatusNew),
		"in_progress": countComplaintsByStatus(complaints, models.ComplaintStatusInProgress),
		"resolved":    countComplaintsByStatus(complaints, models.ComplaintStatusResolved),
	}

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
		"complaints": gin.H{
			"data":  data,
			"links": []any{},
		},
		"statusOptions":        statusOptions,
		"priorityOptions":      priorityOptions,
		"categoryOptions":      categories,
		"regulations":          []any{},
		"announcements":        []any{},
		"sidebarNotifications": handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
	})
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

	db := middleware.GetDB(c)
	complaintID, err := strconv.ParseInt(id, 10, 64)
	if err != nil || complaintID <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID pengaduan tidak valid")
		return
	}

	existing, err := dbrepo.GetComplaintByID(db, complaintID)
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
		now := time.Now()
		resolvedAt = &now
	}

	_ = dbrepo.UpdateComplaint(db, dbrepo.ComplaintUpdateInput{
		ID:              complaintID,
		Status:          status,
		Priority:        priority,
		ResolutionNotes: resolution,
		HandledByID:     user.ID,
		ResolvedAt:      resolvedAt,
	})

	c.JSON(http.StatusOK, gin.H{"status": "Pengaduan berhasil diperbarui."})
}

func countComplaintsByStatus(list []models.Complaint, status string) int {
	count := 0
	for _, complaint := range list {
		if normalizeComplaintStatus(complaint.Status) == status {
			count++
		}
	}
	return count
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

func lookupUserEmail(db *sqlx.DB, userID int64) string {
	user, err := dbrepo.GetUserByID(db, userID)
	if err != nil || user == nil {
		return ""
	}
	return user.Email
}
