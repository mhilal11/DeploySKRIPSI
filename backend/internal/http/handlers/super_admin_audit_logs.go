package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type auditLogPayload struct {
	Module      string
	Action      string
	EntityType  string
	EntityID    string
	Description string
	OldValues   any
	NewValues   any
}

type auditLogListRow struct {
	models.AuditLog
	IsViewed int `db:"is_viewed"`
}

func SuperAdminAuditLogsIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	filters := map[string]string{
		"search":    strings.TrimSpace(c.Query("search")),
		"module":    strings.TrimSpace(c.Query("module")),
		"action":    strings.TrimSpace(c.Query("action")),
		"date_from": strings.TrimSpace(c.Query("date_from")),
		"date_to":   strings.TrimSpace(c.Query("date_to")),
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage := 20

	where := []string{}
	args := []any{}
	if filters["search"] != "" {
		keyword := "%" + filters["search"] + "%"
		where = append(where, "(al.user_name LIKE ? OR al.user_email LIKE ? OR al.description LIKE ? OR al.entity_id LIKE ?)")
		args = append(args, keyword, keyword, keyword, keyword)
	}
	if filters["module"] != "" && filters["module"] != "all" {
		where = append(where, "al.module = ?")
		args = append(args, filters["module"])
	}
	if filters["action"] != "" && filters["action"] != "all" {
		where = append(where, "al.action = ?")
		args = append(args, filters["action"])
	}
	if filters["date_from"] != "" {
		where = append(where, "DATE(al.created_at) >= ?")
		args = append(args, filters["date_from"])
	}
	if filters["date_to"] != "" {
		where = append(where, "DATE(al.created_at) <= ?")
		args = append(args, filters["date_to"])
	}

	countBaseQuery := "FROM audit_logs al"
	selectBaseQuery := `
		FROM audit_logs al
		LEFT JOIN audit_log_views av
		  ON av.audit_log_id = al.id
		 AND av.user_id = ?
	`
	if len(where) > 0 {
		whereClause := " WHERE " + strings.Join(where, " AND ")
		countBaseQuery += whereClause
		selectBaseQuery += whereClause
	}

	var total int
	_ = db.Get(&total, "SELECT COUNT(*) "+countBaseQuery, args...)

	lastPage := (total + perPage - 1) / perPage
	if lastPage == 0 {
		lastPage = 1
	}
	if page > lastPage {
		page = lastPage
	}
	offset := (page - 1) * perPage

	rows := []auditLogListRow{}
	argsWithLimit := append([]any{user.ID}, args...)
	argsWithLimit = append(argsWithLimit, perPage, offset)
	_ = db.Select(
		&rows,
		`SELECT al.*,
		        CASE WHEN av.id IS NULL THEN 0 ELSE 1 END AS is_viewed
		 `+" "+selectBaseQuery+`
		 ORDER BY al.id DESC LIMIT ? OFFSET ?`,
		argsWithLimit...,
	)

	data := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		data = append(data, map[string]any{
			"id":          row.ID,
			"user_id":     row.UserID,
			"user_name":   row.UserName,
			"user_email":  row.UserEmail,
			"user_role":   row.UserRole,
			"module":      row.Module,
			"action":      row.Action,
			"entity_type": row.EntityType,
			"entity_id":   row.EntityID,
			"description": row.Description,
			"old_values":  row.OldValues,
			"new_values":  row.NewValues,
			"ip_address":  row.IPAddress,
			"user_agent":  row.UserAgent,
			"created_at":  formatDateTime(row.CreatedAt),
			"is_viewed":   row.IsViewed == 1,
		})
	}

	moduleOptions := []string{}
	_ = db.Select(&moduleOptions, "SELECT DISTINCT module FROM audit_logs WHERE module IS NOT NULL AND module <> '' ORDER BY module ASC")

	actionOptions := []string{}
	_ = db.Select(&actionOptions, "SELECT DISTINCT action FROM audit_logs WHERE action IS NOT NULL AND action <> '' ORDER BY action ASC")

	c.JSON(http.StatusOK, gin.H{
		"auditLogs": gin.H{
			"data":         data,
			"links":        buildPaginationLinks("/super-admin/audit-log", page, lastPage, filters),
			"current_page": page,
			"last_page":    lastPage,
			"per_page":     perPage,
			"total":        total,
		},
		"filters":              filters,
		"moduleOptions":        moduleOptions,
		"actionOptions":        actionOptions,
		"sidebarNotifications": computeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func SuperAdminAuditLogsMarkViewed(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	var payload struct {
		IDs []int64 `json:"ids"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		ValidationErrors(c, FieldErrors{"ids": "Daftar log yang dilihat tidak valid."})
		return
	}

	seen := map[int64]struct{}{}
	ids := make([]int64, 0, len(payload.IDs))
	for _, id := range payload.IDs {
		if id <= 0 {
			continue
		}
		if _, exists := seen[id]; exists {
			continue
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}

	if len(ids) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"status":               "Tidak ada log yang ditandai.",
			"sidebarNotifications": computeSuperAdminSidebarNotifications(middleware.GetDB(c), user.ID),
		})
		return
	}

	db := middleware.GetDB(c)
	query, args, err := sqlx.In("SELECT id FROM audit_logs WHERE id IN (?)", ids)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal memproses data audit log")
		return
	}
	query = db.Rebind(query)
	existingIDs := []int64{}
	if err := db.Select(&existingIDs, query, args...); err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal memuat data audit log")
		return
	}

	for _, auditLogID := range existingIDs {
		_, _ = db.Exec(`
			INSERT INTO audit_log_views (audit_log_id, user_id, viewed_at)
			VALUES (?, ?, NOW())
			ON DUPLICATE KEY UPDATE viewed_at = VALUES(viewed_at)
		`, auditLogID, user.ID)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":               "Log berhasil ditandai sudah dilihat.",
		"marked_count":         len(existingIDs),
		"sidebarNotifications": computeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func appendAuditLog(c *gin.Context, db *sqlx.DB, payload auditLogPayload) {
	if c == nil || db == nil {
		return
	}

	module := strings.TrimSpace(payload.Module)
	action := strings.TrimSpace(payload.Action)
	if module == "" || action == "" {
		return
	}

	currentUser := middleware.CurrentUser(c)

	var userID any = nil
	var userName any = nil
	var userEmail any = nil
	var userRole any = nil
	if currentUser != nil {
		userID = currentUser.ID
		userName = currentUser.Name
		userEmail = currentUser.Email
		userRole = currentUser.Role
	}

	entityType := nullIfBlank(payload.EntityType)
	entityID := nullIfBlank(payload.EntityID)
	description := nullIfBlank(payload.Description)
	ipAddress := nullIfBlank(c.ClientIP())
	userAgent := nullIfBlank(c.Request.UserAgent())

	_, _ = db.Exec(`
		INSERT INTO audit_logs (
			user_id, user_name, user_email, user_role,
			module, action, entity_type, entity_id,
			description, old_values, new_values,
			ip_address, user_agent, created_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		userID,
		userName,
		userEmail,
		userRole,
		module,
		action,
		entityType,
		entityID,
		description,
		auditValueToJSON(payload.OldValues),
		auditValueToJSON(payload.NewValues),
		ipAddress,
		userAgent,
		time.Now(),
	)
}

func auditValueToJSON(value any) any {
	if value == nil {
		return nil
	}

	switch typed := value.(type) {
	case models.JSON:
		if len(typed) == 0 {
			return nil
		}
		return []byte(typed)
	case []byte:
		if len(typed) == 0 {
			return nil
		}
		if json.Valid(typed) {
			return typed
		}
		encoded, err := json.Marshal(string(typed))
		if err != nil {
			return nil
		}
		return encoded
	case string:
		trimmed := strings.TrimSpace(typed)
		if trimmed == "" {
			return nil
		}
		if json.Valid([]byte(trimmed)) {
			return []byte(trimmed)
		}
		encoded, err := json.Marshal(trimmed)
		if err != nil {
			return nil
		}
		return encoded
	default:
		encoded, err := json.Marshal(typed)
		if err != nil || len(encoded) == 0 {
			return nil
		}
		return encoded
	}
}

func nullIfBlank(value string) any {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return trimmed
}
