package db

import (
	"errors"
	"strings"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type AuditLogFilters struct {
	Search   string
	Module   string
	Action   string
	DateFrom string
	DateTo   string
}

type AuditLogListRow struct {
	models.AuditLog
	IsViewed int `db:"is_viewed"`
}

type AuditLogInsertInput struct {
	UserID      any
	UserName    any
	UserEmail   any
	UserRole    any
	Module      string
	Action      string
	EntityType  any
	EntityID    any
	Description any
	OldValues   any
	NewValues   any
	IPAddress   any
	UserAgent   any
	CreatedAt   time.Time
}

func CountAuditLogs(db *sqlx.DB, filters AuditLogFilters) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	where, args := buildAuditLogWhere(filters)
	query := "SELECT COUNT(*) FROM audit_logs al" + where
	var total int
	err := db.Get(&total, query, args...)
	return total, err
}

func ListAuditLogs(db *sqlx.DB, userID int64, filters AuditLogFilters, limit, offset int) ([]AuditLogListRow, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	where, args := buildAuditLogWhere(filters)
	query := `SELECT al.*,
	        CASE WHEN av.id IS NULL THEN 0 ELSE 1 END AS is_viewed
	 FROM audit_logs al
	 LEFT JOIN audit_log_views av
	   ON av.audit_log_id = al.id
	  AND av.user_id = ?` + where + `
	 ORDER BY al.id DESC LIMIT ? OFFSET ?`
	argsWithLimit := append([]any{userID}, args...)
	argsWithLimit = append(argsWithLimit, limit, offset)
	rows := []AuditLogListRow{}
	err := db.Select(&rows, query, argsWithLimit...)
	return rows, err
}

func ListAuditLogModules(db *sqlx.DB) ([]string, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []string{}
	err := db.Select(&rows, "SELECT DISTINCT module FROM audit_logs WHERE module IS NOT NULL AND module <> '' ORDER BY module ASC")
	return rows, err
}

func ListAuditLogActions(db *sqlx.DB) ([]string, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []string{}
	err := db.Select(&rows, "SELECT DISTINCT action FROM audit_logs WHERE action IS NOT NULL AND action <> '' ORDER BY action ASC")
	return rows, err
}

func ListExistingAuditLogIDs(db *sqlx.DB, ids []int64) ([]int64, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if len(ids) == 0 {
		return []int64{}, nil
	}
	query, args, err := sqlx.In("SELECT id FROM audit_logs WHERE id IN (?)", ids)
	if err != nil {
		return nil, err
	}
	query = db.Rebind(query)
	rows := []int64{}
	err = db.Select(&rows, query, args...)
	return rows, err
}

func UpsertAuditLogView(db *sqlx.DB, auditLogID int64, userID int64) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec(`
		INSERT INTO audit_log_views (audit_log_id, user_id, viewed_at)
		VALUES (?, ?, NOW())
		ON DUPLICATE KEY UPDATE viewed_at = VALUES(viewed_at)
	`, auditLogID, userID)
	return err
}

func InsertAuditLog(db *sqlx.DB, input AuditLogInsertInput) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if input.CreatedAt.IsZero() {
		input.CreatedAt = time.Now()
	}
	_, err := db.Exec(`
		INSERT INTO audit_logs (
			user_id, user_name, user_email, user_role,
			module, action, entity_type, entity_id,
			description, old_values, new_values,
			ip_address, user_agent, created_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		input.UserID,
		input.UserName,
		input.UserEmail,
		input.UserRole,
		input.Module,
		input.Action,
		input.EntityType,
		input.EntityID,
		input.Description,
		input.OldValues,
		input.NewValues,
		input.IPAddress,
		input.UserAgent,
		input.CreatedAt,
	)
	return err
}

func buildAuditLogWhere(filters AuditLogFilters) (string, []any) {
	where := []string{}
	args := []any{}
	if strings.TrimSpace(filters.Search) != "" {
		keyword := "%" + strings.TrimSpace(filters.Search) + "%"
		where = append(where, "(al.user_name LIKE ? OR al.user_email LIKE ? OR al.description LIKE ? OR al.entity_id LIKE ?)")
		args = append(args, keyword, keyword, keyword, keyword)
	}
	if strings.TrimSpace(filters.Module) != "" && !strings.EqualFold(strings.TrimSpace(filters.Module), "all") {
		where = append(where, "al.module = ?")
		args = append(args, strings.TrimSpace(filters.Module))
	}
	if strings.TrimSpace(filters.Action) != "" && !strings.EqualFold(strings.TrimSpace(filters.Action), "all") {
		where = append(where, "al.action = ?")
		args = append(args, strings.TrimSpace(filters.Action))
	}
	if strings.TrimSpace(filters.DateFrom) != "" {
		where = append(where, "DATE(al.created_at) >= ?")
		args = append(args, strings.TrimSpace(filters.DateFrom))
	}
	if strings.TrimSpace(filters.DateTo) != "" {
		where = append(where, "DATE(al.created_at) <= ?")
		args = append(args, strings.TrimSpace(filters.DateTo))
	}
	if len(where) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(where, " AND "), args
}
