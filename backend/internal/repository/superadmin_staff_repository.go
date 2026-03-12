package db

import (
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type StaffPickerRow struct {
	ID           int64   `db:"id"`
	EmployeeCode string  `db:"employee_code"`
	Name         string  `db:"name"`
	Division     *string `db:"division"`
}

func ListStaffTerminationsByEffectiveDateDesc(db *sqlx.DB) ([]models.StaffTermination, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.StaffTermination{}
	err := db.Select(&rows, "SELECT * FROM staff_terminations ORDER BY effective_date DESC")
	return rows, wrapRepoErr("list staff terminations by effective date desc", err)
}

func ListActiveStaffTerminationsPaged(db *sqlx.DB, limit, offset int) ([]models.StaffTermination, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}
	rows := []models.StaffTermination{}
	err := db.Select(
		&rows,
		"SELECT * FROM staff_terminations WHERE status <> 'Selesai' ORDER BY effective_date DESC, id DESC LIMIT ? OFFSET ?",
		limit,
		offset,
	)
	return rows, wrapRepoErr("list active staff terminations paged", err)
}

func ListArchivedStaffTerminationsPaged(db *sqlx.DB, limit, offset int) ([]models.StaffTermination, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}
	rows := []models.StaffTermination{}
	err := db.Select(
		&rows,
		"SELECT * FROM staff_terminations WHERE status = 'Selesai' ORDER BY effective_date DESC, id DESC LIMIT ? OFFSET ?",
		limit,
		offset,
	)
	return rows, wrapRepoErr("list archived staff terminations paged", err)
}

func CountActiveStaffTerminations(db *sqlx.DB) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM staff_terminations WHERE status <> 'Selesai'")
	return count, wrapRepoErr("count active staff terminations", err)
}

func CountArchivedStaffTerminations(db *sqlx.DB) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM staff_terminations WHERE status = 'Selesai'")
	return count, wrapRepoErr("count archived staff terminations", err)
}

func CountStaffTerminationsByStatus(db *sqlx.DB, status string) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM staff_terminations WHERE status = ?", status)
	return count, wrapRepoErr("count staff terminations by status", err)
}

func ListEligibleActiveStaffRows(db *sqlx.DB) ([]StaffPickerRow, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []StaffPickerRow{}
	err := db.Select(&rows, `
		SELECT u.id, u.employee_code, u.name, u.division
		FROM users u
		WHERE u.role = ?
		  AND u.status = 'Active'
		  AND u.employee_code IS NOT NULL
		  AND u.employee_code <> ''
		  AND NOT EXISTS (
			  SELECT 1
			  FROM staff_terminations st
			  WHERE st.user_id = u.id
			    AND st.status IN ('Diajukan', 'Proses')
		  )
		ORDER BY u.name ASC
	`, models.RoleStaff)
	return rows, wrapRepoErr("list eligible active staff rows", err)
}

func GetUserRegisteredAtByID(db *sqlx.DB, userID int64) (*time.Time, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var registeredAt time.Time
	err := db.Get(&registeredAt, "SELECT registered_at FROM users WHERE id = ?", userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("get user registered at by id", err)
	}
	return &registeredAt, nil
}

func GetUserByEmployeeCode(db *sqlx.DB, employeeCode string) (*models.User, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var user models.User
	if err := db.Get(&user, "SELECT * FROM users WHERE employee_code = ?", employeeCode); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("get user by employee code", err)
	}
	return &user, nil
}

func GetStaffTerminationByID(db *sqlx.DB, id int64) (*models.StaffTermination, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var termination models.StaffTermination
	if err := db.Get(&termination, "SELECT * FROM staff_terminations WHERE id = ?", id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("get staff termination by id", err)
	}
	return &termination, nil
}

func UpdateStaffTerminationProgress(db *sqlx.DB, id int64, status string, notes string, checklist map[string]bool, progress int, updatedAt time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if updatedAt.IsZero() {
		updatedAt = time.Now()
	}
	checklistJSON, _ := json.Marshal(checklist)
	_, err := db.Exec("UPDATE staff_terminations SET status = ?, notes = ?, checklist = ?, progress = ?, updated_at = ? WHERE id = ?", status, notes, checklistJSON, progress, updatedAt, id)
	return wrapRepoErr("update staff termination progress", err)
}

func SetUserInactive(db *sqlx.DB, userID int64, inactiveAt time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if inactiveAt.IsZero() {
		inactiveAt = time.Now()
	}
	_, err := db.Exec("UPDATE users SET status = 'Inactive', inactive_at = ? WHERE id = ?", inactiveAt, userID)
	return wrapRepoErr("set user inactive", err)
}

func DeleteStaffTerminationByID(db *sqlx.DB, id int64) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("DELETE FROM staff_terminations WHERE id = ?", id)
	return wrapRepoErr("delete staff termination by id", err)
}

func CountCompletedStaffTerminationsBetween(db *sqlx.DB, start, end time.Time) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM staff_terminations WHERE status = 'Selesai' AND effective_date BETWEEN ? AND ?", start, end)
	return count, wrapRepoErr("count completed staff terminations between", err)
}

func UpdateStaffTerminationAndDeactivateIfCompleted(
	db *sqlx.DB,
	id int64,
	status string,
	notes string,
	checklist map[string]bool,
	progress int,
	userID *int64,
	updatedAt time.Time,
) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if updatedAt.IsZero() {
		updatedAt = time.Now()
	}

	tx, err := db.Beginx()
	if err != nil {
		return wrapRepoErr("begin update staff termination tx", err)
	}
	defer tx.Rollback()

	checklistJSON, _ := json.Marshal(checklist)
	if _, err := tx.Exec(
		"UPDATE staff_terminations SET status = ?, notes = ?, checklist = ?, progress = ?, updated_at = ? WHERE id = ?",
		status,
		notes,
		checklistJSON,
		progress,
		updatedAt,
		id,
	); err != nil {
		return wrapRepoErr("update staff termination in tx", err)
	}

	if status == "Selesai" && userID != nil && *userID > 0 {
		if _, err := tx.Exec("UPDATE users SET status = 'Inactive', inactive_at = ? WHERE id = ?", updatedAt, *userID); err != nil {
			return wrapRepoErr("deactivate user in tx", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return wrapRepoErr("commit update staff termination tx", err)
	}
	return nil
}
