package db

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type UserListFilters struct {
	Search   string
	Role     string
	Status   string
	Division string
}

type CreateUserInput struct {
	EmployeeCode string
	Name         string
	Email        string
	Role         string
	Division     string
	Status       string
	RegisteredAt string
	InactiveAt   *string
	PasswordHash string
	Now          time.Time
}

type UpdateUserInput struct {
	ID           int64
	Name         string
	Email        string
	Role         string
	Division     string
	Status       string
	RegisteredAt string
	InactiveAt   *string
	PasswordHash *string
	Now          time.Time
}

type UserRoleStats struct {
	Total      int
	SuperAdmin int
	Admin      int
	Staff      int
	Pelamar    int
}

type UpsertStaffProfileDetailsInput struct {
	UserID          int64
	Phone           string
	DateOfBirth     *time.Time
	Religion        string
	Gender          string
	Address         string
	DomicileAddress string
	City            string
	Province        string
	EducationLevel  string
	Educations      models.JSON
}

func ListUsers(db *sqlx.DB, filters UserListFilters, page, perPage int) ([]models.User, int, error) {
	if db == nil {
		return nil, 0, errors.New("database tidak tersedia")
	}
	if page < 1 {
		page = 1
	}
	if perPage <= 0 {
		perPage = 10
	}

	where, args := buildUsersWhereClause(filters)

	countQuery := "SELECT COUNT(*) FROM users" + where
	var total int
	if err := db.Get(&total, countQuery, args...); err != nil {
		return nil, 0, wrapRepoErr("list users count", err)
	}

	offset := (page - 1) * perPage
	query := "SELECT * FROM users" + where + " ORDER BY id DESC LIMIT ? OFFSET ?"
	queryArgs := append(append([]any{}, args...), perPage, offset)

	rows := []models.User{}
	if err := db.Select(&rows, query, queryArgs...); err != nil {
		return nil, 0, wrapRepoErr("list users select", err)
	}

	return rows, total, nil
}

func CountUsersByRoleStats(db *sqlx.DB) (UserRoleStats, error) {
	if db == nil {
		return UserRoleStats{}, errors.New("database tidak tersedia")
	}

	out := UserRoleStats{}
	query := `
		SELECT
			COUNT(*) AS total,
			SUM(CASE WHEN role = ? THEN 1 ELSE 0 END) AS total_super_admin,
			SUM(CASE WHEN role = ? THEN 1 ELSE 0 END) AS total_admin,
			SUM(CASE WHEN role = ? THEN 1 ELSE 0 END) AS total_staff,
			SUM(CASE WHEN role = ? THEN 1 ELSE 0 END) AS total_pelamar
		FROM users
	`

	row := struct {
		Total           int `db:"total"`
		TotalSuperAdmin int `db:"total_super_admin"`
		TotalAdmin      int `db:"total_admin"`
		TotalStaff      int `db:"total_staff"`
		TotalPelamar    int `db:"total_pelamar"`
	}{}

	if err := db.Get(&row, query, models.RoleSuperAdmin, models.RoleAdmin, models.RoleStaff, models.RolePelamar); err != nil {
		return out, wrapRepoErr("count users by role stats", err)
	}

	out.Total = row.Total
	out.SuperAdmin = row.TotalSuperAdmin
	out.Admin = row.TotalAdmin
	out.Staff = row.TotalStaff
	out.Pelamar = row.TotalPelamar
	return out, nil
}

func GetUserByID(db *sqlx.DB, id int64) (*models.User, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var user models.User
	if err := db.Get(&user, "SELECT * FROM users WHERE id = ?", id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("get user by id", err)
	}
	return &user, nil
}

func GetStaffProfileByUserID(db *sqlx.DB, userID int64) (*models.StaffProfile, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var profile models.StaffProfile
	if err := db.Get(&profile, "SELECT * FROM staff_profiles WHERE user_id = ?", userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("get staff profile by user id", err)
	}
	return &profile, nil
}

func UserEmailExists(db *sqlx.DB, email string, excludeID *int64) (bool, error) {
	if db == nil {
		return false, errors.New("database tidak tersedia")
	}

	var count int
	if excludeID != nil && *excludeID > 0 {
		err := db.Get(&count, "SELECT COUNT(*) FROM users WHERE email = ? AND id != ?", email, *excludeID)
		if err != nil {
			return false, wrapRepoErr("user email exists with exclude id", err)
		}
		return count > 0, nil
	}

	err := db.Get(&count, "SELECT COUNT(*) FROM users WHERE email = ?", email)
	if err != nil {
		return false, wrapRepoErr("user email exists", err)
	}
	return count > 0, nil
}

func CreateUser(db *sqlx.DB, input CreateUserInput) (int64, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}

	result, err := db.Exec(`
		INSERT INTO users (
			employee_code, name, email, role, division, status,
			registered_at, inactive_at, password, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		nullableString(input.EmployeeCode),
		input.Name,
		input.Email,
		input.Role,
		nullableString(input.Division),
		input.Status,
		input.RegisteredAt,
		nullableStringPtr(input.InactiveAt),
		input.PasswordHash,
		input.Now,
		input.Now,
	)
	if err != nil {
		return 0, wrapRepoErr("create user insert", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, wrapRepoErr("create user last insert id", err)
	}
	return id, nil
}

func UpdateUser(db *sqlx.DB, input UpdateUserInput) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}

	if input.ID <= 0 {
		return fmt.Errorf("id user tidak valid")
	}

	updateFields := []string{
		"name = ?",
		"email = ?",
		"role = ?",
		"division = ?",
		"status = ?",
		"registered_at = ?",
		"inactive_at = ?",
		"updated_at = ?",
	}
	args := []any{
		input.Name,
		input.Email,
		input.Role,
		nullableString(input.Division),
		input.Status,
		input.RegisteredAt,
		nullableStringPtr(input.InactiveAt),
		input.Now,
	}
	if input.PasswordHash != nil && strings.TrimSpace(*input.PasswordHash) != "" {
		updateFields = append(updateFields, "password = ?")
		args = append(args, *input.PasswordHash)
	}
	args = append(args, input.ID)

	query := "UPDATE users SET " + strings.Join(updateFields, ", ") + " WHERE id = ?"
	_, err := db.Exec(query, args...)
	return wrapRepoErr("update user", err)
}

func DeleteUserByID(db *sqlx.DB, id int64) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("DELETE FROM users WHERE id = ?", id)
	return wrapRepoErr("delete user by id", err)
}

func UpdateUserStatus(db *sqlx.DB, id int64, status string, inactiveAt *string) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("UPDATE users SET status = ?, inactive_at = ? WHERE id = ?", status, nullableStringPtr(inactiveAt), id)
	return wrapRepoErr("update user status", err)
}

func UpdateUserPassword(db *sqlx.DB, id int64, passwordHash string) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("UPDATE users SET password = ? WHERE id = ?", passwordHash, id)
	return wrapRepoErr("update user password", err)
}

func InsertStaffProfile(db *sqlx.DB, userID int64, religion, gender, educationLevel string, now time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec(`
		INSERT INTO staff_profiles (user_id, religion, gender, education_level, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, userID, nullableString(religion), nullableString(gender), nullableString(educationLevel), now, now)
	return wrapRepoErr("insert staff profile", err)
}

func UpsertStaffProfile(db *sqlx.DB, userID int64, religion, gender, educationLevel string) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec(`
		INSERT INTO staff_profiles (user_id, religion, gender, education_level, created_at, updated_at)
		VALUES (?, ?, ?, ?, NOW(), NOW())
		ON DUPLICATE KEY UPDATE
			religion = VALUES(religion),
			gender = VALUES(gender),
			education_level = VALUES(education_level),
			updated_at = NOW()
	`, userID, nullableString(religion), nullableString(gender), nullableString(educationLevel))
	return wrapRepoErr("upsert staff profile", err)
}

func UpsertStaffProfileDetails(db *sqlx.DB, input UpsertStaffProfileDetailsInput) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec(`
		INSERT INTO staff_profiles (
			user_id, phone, date_of_birth, religion, gender, address, domicile_address, city, province,
			education_level, educations, created_at, updated_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
		ON DUPLICATE KEY UPDATE
			phone = VALUES(phone),
			date_of_birth = VALUES(date_of_birth),
			religion = VALUES(religion),
			gender = VALUES(gender),
			address = VALUES(address),
			domicile_address = VALUES(domicile_address),
			city = VALUES(city),
			province = VALUES(province),
			education_level = VALUES(education_level),
			educations = VALUES(educations),
			updated_at = NOW()
	`,
		input.UserID,
		nullableString(input.Phone),
		input.DateOfBirth,
		nullableString(input.Religion),
		nullableString(input.Gender),
		nullableString(input.Address),
		nullableString(input.DomicileAddress),
		nullableString(input.City),
		nullableString(input.Province),
		nullableString(input.EducationLevel),
		input.Educations,
	)
	return wrapRepoErr("upsert staff profile details", err)
}

func DeleteStaffProfileByUserID(db *sqlx.DB, userID int64) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("DELETE FROM staff_profiles WHERE user_id = ?", userID)
	return wrapRepoErr("delete staff profile by user id", err)
}

func buildUsersWhereClause(filters UserListFilters) (string, []any) {
	clauses := []string{}
	args := []any{}

	search := strings.TrimSpace(filters.Search)
	if search != "" {
		like := "%" + search + "%"
		clauses = append(clauses, "(name LIKE ? OR email LIKE ? OR employee_code LIKE ?)")
		args = append(args, like, like, like)
	}

	role := strings.TrimSpace(filters.Role)
	if role != "" && !strings.EqualFold(role, "all") {
		clauses = append(clauses, "role = ?")
		args = append(args, role)
	}

	status := strings.TrimSpace(filters.Status)
	if status != "" && !strings.EqualFold(status, "all") {
		clauses = append(clauses, "status = ?")
		args = append(args, status)
	}

	division := strings.TrimSpace(filters.Division)
	if division != "" && !strings.EqualFold(division, "all") {
		clauses = append(clauses, "division = ?")
		args = append(args, division)
	}

	if len(clauses) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

func nullableString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return strings.TrimSpace(value)
}

func nullableStringPtr(value *string) any {
	if value == nil {
		return nil
	}
	return nullableString(*value)
}
