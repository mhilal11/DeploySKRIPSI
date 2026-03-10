package superadmin

import (
	"hris-backend/internal/http/handlers"
	dbrepo "hris-backend/internal/repository"

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

func SuperAdminAuditLogsIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
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

	repoFilters := dbrepo.AuditLogFilters{
		Search:   filters["search"],
		Module:   filters["module"],
		Action:   filters["action"],
		DateFrom: filters["date_from"],
		DateTo:   filters["date_to"],
	}
	total, _ := dbrepo.CountAuditLogs(db, repoFilters)

	lastPage := (total + perPage - 1) / perPage
	if lastPage == 0 {
		lastPage = 1
	}
	if page > lastPage {
		page = lastPage
	}
	offset := (page - 1) * perPage

	rows, _ := dbrepo.ListAuditLogs(db, user.ID, repoFilters, perPage, offset)

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
			"created_at":  handlers.FormatDateTime(row.CreatedAt),
			"is_viewed":   row.IsViewed == 1,
		})
	}

	moduleOptions, _ := dbrepo.ListAuditLogModules(db)

	actionOptions, _ := dbrepo.ListAuditLogActions(db)

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
		"sidebarNotifications": handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func SuperAdminAuditLogsMarkViewed(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	var payload struct {
		IDs []int64 `json:"ids"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"ids": "Daftar log yang dilihat tidak valid."})
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
			"sidebarNotifications": handlers.ComputeSuperAdminSidebarNotifications(middleware.GetDB(c), user.ID),
		})
		return
	}

	db := middleware.GetDB(c)
	existingIDs, err := dbrepo.ListExistingAuditLogIDs(db, ids)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat data audit log")
		return
	}

	for _, auditLogID := range existingIDs {
		_ = dbrepo.UpsertAuditLogView(db, auditLogID, user.ID)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":               "Log berhasil ditandai sudah dilihat.",
		"marked_count":         len(existingIDs),
		"sidebarNotifications": handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
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

	_ = dbrepo.InsertAuditLog(db, dbrepo.AuditLogInsertInput{
		UserID:      userID,
		UserName:    userName,
		UserEmail:   userEmail,
		UserRole:    userRole,
		Module:      module,
		Action:      action,
		EntityType:  entityType,
		EntityID:    entityID,
		Description: description,
		OldValues:   auditValueToJSON(payload.OldValues),
		NewValues:   auditValueToJSON(payload.NewValues),
		IPAddress:   ipAddress,
		UserAgent:   userAgent,
		CreatedAt:   time.Now(),
	})
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
