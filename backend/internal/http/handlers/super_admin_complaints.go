package handlers

import (
	"database/sql"
	"net/http"
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
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	filters := map[string]string{
		"search":   strings.TrimSpace(c.Query("search")),
		"status":   strings.TrimSpace(c.Query("status")),
		"priority": strings.TrimSpace(c.Query("priority")),
		"category": strings.TrimSpace(c.Query("category")),
	}

	query := "SELECT * FROM complaints"
	clauses := []string{}
	args := []any{}
	if filters["search"] != "" {
		like := "%" + filters["search"] + "%"
		clauses = append(clauses, "(complaint_code LIKE ? OR subject LIKE ? OR description LIKE ?)")
		args = append(args, like, like, like)
	}
	if filters["status"] != "" && filters["status"] != "all" {
		clauses = append(clauses, "status = ?")
		args = append(args, filters["status"])
	}
	if filters["priority"] != "" && filters["priority"] != "all" {
		clauses = append(clauses, "priority = ?")
		args = append(args, filters["priority"])
	}
	if filters["category"] != "" && filters["category"] != "all" {
		clauses = append(clauses, "category = ?")
		args = append(args, filters["category"])
	}
	if len(clauses) > 0 {
		query += " WHERE " + strings.Join(clauses, " AND ")
	}
	query += " ORDER BY submitted_at DESC"

	complaints := []models.Complaint{}
	_ = db.Select(&complaints, query, args...)

	data := make([]map[string]any, 0, len(complaints))
	categoryOptions := map[string]bool{}
	for _, complaint := range complaints {
		if complaint.Category != "" {
			categoryOptions[complaint.Category] = true
		}
		reporterName := "Anonim"
		reporterEmail := ""
		if !complaint.IsAnonymous {
			reporterName = lookupUserName(db, complaint.UserID)
			reporterEmail = lookupUserEmail(db, complaint.UserID)
		}
		handlerName := ""
		if complaint.HandledByID != nil {
			handlerName = lookupUserName(db, *complaint.HandledByID)
		}
		data = append(data, map[string]any{
			"id":              complaint.ID,
			"code":            complaint.ComplaintCode,
			"reporter":        reporterName,
			"reporterEmail":   reporterEmail,
			"category":        complaint.Category,
			"subject":         complaint.Subject,
			"description":     complaint.Description,
			"submittedAt":     formatDateTime(complaint.SubmittedAt),
			"status":          complaint.Status,
			"statusLabel":     models.ComplaintStatusLabels[complaint.Status],
			"priority":        complaint.Priority,
			"priorityLabel":   models.ComplaintPriorityLabels[complaint.Priority],
			"isAnonymous":     complaint.IsAnonymous,
			"handler":         handlerName,
			"resolutionNotes": complaint.ResolutionNotes,
			"resolvedAt":      formatDateTime(complaint.ResolvedAt),
			"attachment": map[string]any{
				"name": complaint.AttachmentName,
				"url":  attachmentURL(c, complaint.AttachmentPath),
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
		"sidebarNotifications": computeSuperAdminSidebarNotifications(db),
	})
}

func SuperAdminComplaintsUpdate(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	status := c.PostForm("status")
	priority := c.PostForm("priority")
	resolution := c.PostForm("resolution_notes")

	db := middleware.GetDB(c)

	resolvedAt := sql.NullTime{}
	if status == models.ComplaintStatusResolved {
		resolvedAt.Valid = true
		resolvedAt.Time = time.Now()
	}

	_, _ = db.Exec(`UPDATE complaints SET status = ?, priority = ?, resolution_notes = ?, handled_by_id = ?, resolved_at = ? WHERE id = ?`,
		status, priority, resolution, user.ID, resolvedAt, id)

	c.JSON(http.StatusOK, gin.H{"status": "Pengaduan berhasil diperbarui."})
}

func countComplaintsByStatus(list []models.Complaint, status string) int {
	count := 0
	for _, complaint := range list {
		if complaint.Status == status {
			count++
		}
	}
	return count
}

func lookupUserEmail(db *sqlx.DB, userID int64) string {
	var email string
	_ = db.Get(&email, "SELECT email FROM users WHERE id = ?", userID)
	return email
}
