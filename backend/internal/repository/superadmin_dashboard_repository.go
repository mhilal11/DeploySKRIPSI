package db

import (
	"errors"
	"strings"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type RoleCountRow struct {
	Role  string `db:"role"`
	Total int    `db:"total"`
}

type KeyCountRow struct {
	Name  *string `db:"name"`
	Total int     `db:"total"`
}

type DivisionApplicationCountRow struct {
	Division *string `db:"division"`
	Total    int     `db:"total"`
}

func ListUserRoleCounts(db *sqlx.DB) ([]RoleCountRow, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []RoleCountRow{}
	err := db.Select(&rows, "SELECT role, COUNT(*) as total FROM users GROUP BY role")
	return rows, wrapRepoErr("list user role counts", err)
}

func CountRegisteredUsersBetween(db *sqlx.DB, role *string, start, end time.Time) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	query := "SELECT COUNT(*) FROM users WHERE COALESCE(registered_at, created_at) BETWEEN ? AND ?"
	args := []any{start, end}
	if role != nil {
		query += " AND role = ?"
		args = append(args, *role)
	}
	var count int
	err := db.Get(&count, query, args...)
	return count, wrapRepoErr("count registered users between", err)
}

func CountUsersByRoleAndStatus(db *sqlx.DB, role string, status *string) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	query := "SELECT COUNT(*) FROM users WHERE role = ?"
	args := []any{role}
	if status != nil {
		query += " AND status = ?"
		args = append(args, *status)
	}
	var count int
	err := db.Get(&count, query, args...)
	return count, wrapRepoErr("count users by role and status", err)
}

func CountUsersByStatus(db *sqlx.DB, status string) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM users WHERE status = ?", status)
	return count, wrapRepoErr("count users by status", err)
}

func CountUsersByStatusCreatedBetween(db *sqlx.DB, status string, start, end time.Time) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM users WHERE status = ? AND created_at BETWEEN ? AND ?", status, start, end)
	return count, wrapRepoErr("count users by status created between", err)
}

func ListStaffReligionCounts(db *sqlx.DB) ([]KeyCountRow, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []KeyCountRow{}
	err := db.Select(&rows, "SELECT religion as name, COUNT(*) as total FROM staff_profiles GROUP BY religion")
	return rows, wrapRepoErr("list staff religion counts", err)
}

func ListStaffGenderCounts(db *sqlx.DB) ([]KeyCountRow, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []KeyCountRow{}
	err := db.Select(&rows, "SELECT gender as name, COUNT(*) as total FROM staff_profiles GROUP BY gender")
	return rows, wrapRepoErr("list staff gender counts", err)
}

func ListStaffEducationCounts(db *sqlx.DB) ([]KeyCountRow, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []KeyCountRow{}
	err := db.Select(&rows, "SELECT education_level as name, COUNT(*) as total FROM staff_profiles GROUP BY education_level")
	return rows, wrapRepoErr("list staff education counts", err)
}

func ListApplicationCountsByDivision(db *sqlx.DB) ([]DivisionApplicationCountRow, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []DivisionApplicationCountRow{}
	err := db.Select(&rows, "SELECT division, COUNT(*) as total FROM applications GROUP BY division ORDER BY division")
	return rows, wrapRepoErr("list application counts by division", err)
}

func CountApplicationsByDivisionBetween(db *sqlx.DB, division *string, start, end time.Time) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	if division == nil {
		err := db.Get(&count, "SELECT COUNT(*) FROM applications WHERE division IS NULL AND submitted_at BETWEEN ? AND ?", start, end)
		return count, wrapRepoErr("count applications by nil division between", err)
	}
	err := db.Get(&count, "SELECT COUNT(*) FROM applications WHERE division = ? AND submitted_at BETWEEN ? AND ?", *division, start, end)
	return count, wrapRepoErr("count applications by division between", err)
}

func CountApplicationsSubmittedBetween(db *sqlx.DB, start, end time.Time) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM applications WHERE COALESCE(submitted_at, created_at) BETWEEN ? AND ?", start, end)
	return count, wrapRepoErr("count applications submitted between", err)
}

func CountApplicationsBySubmittedBetween(db *sqlx.DB, start, end time.Time) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM applications WHERE submitted_at BETWEEN ? AND ?", start, end)
	return count, wrapRepoErr("count applications by submitted between", err)
}

func CountApplicationsByStatusSubmittedBetween(db *sqlx.DB, status string, start, end time.Time) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM applications WHERE status = ? AND submitted_at BETWEEN ? AND ?", status, start, end)
	return count, wrapRepoErr("count applications by status submitted between", err)
}

func CountStaffTerminationsByStatuses(db *sqlx.DB, statuses ...string) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	if len(statuses) == 0 {
		return 0, nil
	}
	placeholders := strings.Repeat("?,", len(statuses))
	placeholders = strings.TrimSuffix(placeholders, ",")
	query := "SELECT COUNT(*) FROM staff_terminations WHERE status IN (" + placeholders + ")"
	args := make([]any, 0, len(statuses))
	for _, status := range statuses {
		args = append(args, status)
	}
	var count int
	err := db.Get(&count, query, args...)
	return count, wrapRepoErr("count staff terminations by statuses", err)
}

func CountStaffTerminationsByStatusesAndRequestDateBetween(db *sqlx.DB, start, end time.Time, statuses ...string) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	if len(statuses) == 0 {
		return 0, nil
	}
	placeholders := strings.Repeat("?,", len(statuses))
	placeholders = strings.TrimSuffix(placeholders, ",")
	query := "SELECT COUNT(*) FROM staff_terminations WHERE status IN (" + placeholders + ") AND request_date BETWEEN ? AND ?"
	args := make([]any, 0, len(statuses)+2)
	for _, status := range statuses {
		args = append(args, status)
	}
	args = append(args, start, end)
	var count int
	err := db.Get(&count, query, args...)
	return count, wrapRepoErr("count staff terminations by statuses and request date between", err)
}

func CountStaffTerminationsByTypeAndStatuses(db *sqlx.DB, terminationType string, statuses ...string) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	if len(statuses) == 0 {
		return 0, nil
	}
	placeholders := strings.Repeat("?,", len(statuses))
	placeholders = strings.TrimSuffix(placeholders, ",")
	query := "SELECT COUNT(*) FROM staff_terminations WHERE type = ? AND status IN (" + placeholders + ")"
	args := make([]any, 0, len(statuses)+1)
	args = append(args, terminationType)
	for _, status := range statuses {
		args = append(args, status)
	}
	var count int
	err := db.Get(&count, query, args...)
	return count, wrapRepoErr("count staff terminations by type and statuses", err)
}

func CountStaffTerminationsByTypeStatusesAndRequestDateBetween(db *sqlx.DB, terminationType string, start, end time.Time, statuses ...string) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	if len(statuses) == 0 {
		return 0, nil
	}
	placeholders := strings.Repeat("?,", len(statuses))
	placeholders = strings.TrimSuffix(placeholders, ",")
	query := "SELECT COUNT(*) FROM staff_terminations WHERE type = ? AND status IN (" + placeholders + ") AND request_date BETWEEN ? AND ?"
	args := make([]any, 0, len(statuses)+3)
	args = append(args, terminationType)
	for _, status := range statuses {
		args = append(args, status)
	}
	args = append(args, start, end)
	var count int
	err := db.Get(&count, query, args...)
	return count, wrapRepoErr("count staff terminations by type statuses and request date between", err)
}

func CountStaffTerminationsByTypeAndCompleted(db *sqlx.DB, terminationType string) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM staff_terminations WHERE type = ? AND status = 'Selesai'", terminationType)
	return count, wrapRepoErr("count staff terminations by type and completed", err)
}

func CountIncomingLettersBetween(db *sqlx.DB, start, end time.Time) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM surat WHERE tipe_surat = 'masuk' AND tanggal_surat BETWEEN ? AND ?", start, end)
	return count, wrapRepoErr("count incoming letters between", err)
}

func ListApplicationsByStatus(db *sqlx.DB, status string, limit int) ([]models.Application, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 5
	}
	rows := []models.Application{}
	err := db.Select(&rows, "SELECT * FROM applications WHERE status = ? ORDER BY submitted_at DESC LIMIT ?", status, limit)
	return rows, wrapRepoErr("list applications by status", err)
}

func ListRecentApplicationsForDashboard(db *sqlx.DB, limit int) ([]models.Application, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 5
	}
	rows := []models.Application{}
	err := db.Select(&rows, "SELECT * FROM applications ORDER BY submitted_at DESC LIMIT ?", limit)
	return rows, wrapRepoErr("list recent applications for dashboard", err)
}

func ListRecentLetters(db *sqlx.DB, limit int) ([]models.Surat, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 5
	}
	rows := []models.Surat{}
	err := db.Select(&rows, "SELECT * FROM surat ORDER BY tanggal_surat DESC LIMIT ?", limit)
	return rows, wrapRepoErr("list recent letters", err)
}

func ListRecentStaffTerminations(db *sqlx.DB, limit int) ([]models.StaffTermination, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 5
	}
	rows := []models.StaffTermination{}
	err := db.Select(&rows, "SELECT * FROM staff_terminations ORDER BY updated_at DESC LIMIT ?", limit)
	return rows, wrapRepoErr("list recent staff terminations", err)
}
