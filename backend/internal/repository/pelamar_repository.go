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

type ApplicationCreateInput struct {
	UserID      int64
	FullName    string
	Email       string
	Phone       string
	Skills      string
	Division    string
	Position    string
	CVFile      string
	SubmittedAt time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type EducationReferenceCustomRow struct {
	Institution sql.NullString `db:"institution"`
	Program     sql.NullString `db:"program"`
}

type EducationReferenceCustomUpsertEntry struct {
	Institution           string
	Program               string
	InstitutionNormalized string
	ProgramNormalized     string
}

func ListApplicationsByUserID(db *sqlx.DB, userID int64) ([]models.Application, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	applications := []models.Application{}
	err := db.Select(&applications, "SELECT * FROM applications WHERE user_id = ? ORDER BY submitted_at DESC", userID)
	return applications, wrapRepoErr("list applications by user id", err)
}

func CountApplicationsByUserID(db *sqlx.DB, userID int64) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM applications WHERE user_id = ?", userID)
	return count, wrapRepoErr("count applications by user id", err)
}

func ListApplicationsByUserIDPaged(db *sqlx.DB, userID int64, limit, offset int) ([]models.Application, error) {
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
	applications := []models.Application{}
	err := db.Select(
		&applications,
		"SELECT * FROM applications WHERE user_id = ? ORDER BY submitted_at DESC LIMIT ? OFFSET ?",
		userID,
		limit,
		offset,
	)
	return applications, wrapRepoErr("list applications by user id paged", err)
}

func CountActiveApplicationsByUserID(db *sqlx.DB, userID int64) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM applications WHERE user_id = ? AND status IN ('Applied','Screening','Interview','Offering')", userID)
	return count, wrapRepoErr("count active applications by user id", err)
}

func CountCompletedApplicationsByUserID(db *sqlx.DB, userID int64) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM applications WHERE user_id = ? AND status IN ('Hired','Rejected')", userID)
	return count, wrapRepoErr("count completed applications by user id", err)
}

func UpdateUserNameEmailByID(db *sqlx.DB, userID int64, fullName, email *string) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?", fullName, email, userID)
	return wrapRepoErr("update user name email by id", err)
}

func UpdateApplicantProfileByUserID(db *sqlx.DB, profile *models.ApplicantProfile, updatedAt time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if profile == nil {
		return errors.New("profil pelamar tidak tersedia")
	}
	if updatedAt.IsZero() {
		updatedAt = time.Now()
	}
	_, err := db.Exec(`UPDATE applicant_profiles SET full_name=?, email=?, phone=?, date_of_birth=?, gender=?, religion=?, address=?, domicile_address=?, city=?, province=?, profile_photo_path=?, educations=?, experiences=?, certifications=?, completed_at=?, updated_at=? WHERE user_id = ?`,
		profile.FullName,
		profile.Email,
		profile.Phone,
		profile.DateOfBirth,
		profile.Gender,
		profile.Religion,
		profile.Address,
		profile.DomicileAddress,
		profile.City,
		profile.Province,
		profile.ProfilePhotoPath,
		profile.Educations,
		profile.Experiences,
		profile.Certifications,
		profile.CompletedAt,
		updatedAt,
		profile.UserID,
	)
	return wrapRepoErr("update applicant profile by user id", err)
}

func CountApplicationsByUserDivisionPosition(db *sqlx.DB, userID int64, division string, position string) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM applications WHERE user_id = ? AND division = ? AND position = ?", userID, division, position)
	return count, wrapRepoErr("count applications by user division position", err)
}

func InsertApplication(db *sqlx.DB, input ApplicationCreateInput) (int64, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	if input.SubmittedAt.IsZero() {
		input.SubmittedAt = time.Now()
	}
	if input.CreatedAt.IsZero() {
		input.CreatedAt = input.SubmittedAt
	}
	if input.UpdatedAt.IsZero() {
		input.UpdatedAt = input.SubmittedAt
	}
	insertResult, err := db.Exec(`INSERT INTO applications (user_id, full_name, email, phone, skills, division, position, cv_file, status, submitted_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Applied', ?, ?, ?)`,
		input.UserID,
		input.FullName,
		input.Email,
		input.Phone,
		input.Skills,
		input.Division,
		input.Position,
		input.CVFile,
		input.SubmittedAt,
		input.CreatedAt,
		input.UpdatedAt,
	)
	if err != nil {
		return 0, wrapRepoErr("insert application", err)
	}
	applicationID, err := insertResult.LastInsertId()
	if err != nil {
		return 0, wrapRepoErr("insert application last insert id", err)
	}
	return applicationID, nil
}

func InsertApplicantProfile(db *sqlx.DB, userID int64, fullName, email string, now time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if now.IsZero() {
		now = time.Now()
	}
	_, err := db.Exec(`INSERT INTO applicant_profiles (user_id, full_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`, userID, fullName, email, now, now)
	return wrapRepoErr("insert applicant profile", err)
}

func CountUsersByDivisionAndRoles(db *sqlx.DB, division string, roles ...string) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	if len(roles) == 0 {
		return 0, nil
	}

	placeholders := strings.Repeat("?,", len(roles))
	placeholders = strings.TrimSuffix(placeholders, ",")
	query := fmt.Sprintf("SELECT COUNT(*) FROM users WHERE division = ? AND role IN (%s)", placeholders)
	args := make([]any, 0, len(roles)+1)
	args = append(args, division)
	for _, role := range roles {
		args = append(args, role)
	}

	var count int
	err := db.Get(&count, query, args...)
	return count, wrapRepoErr("count users by division and roles", err)
}

func ListCustomEducationReferenceRows(db *sqlx.DB, query string, limit int) ([]EducationReferenceCustomRow, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 300
	}

	rows := make([]EducationReferenceCustomRow, 0)
	sqlQuery := "SELECT institution, program FROM education_reference_custom"
	args := make([]any, 0, 3)
	if query != "" {
		like := "%" + strings.ToLower(strings.TrimSpace(query)) + "%"
		sqlQuery += " WHERE LOWER(institution) LIKE ? OR LOWER(program) LIKE ?"
		args = append(args, like, like)
	}
	sqlQuery += " ORDER BY updated_at DESC, id DESC LIMIT ?"
	args = append(args, limit)

	err := db.Select(&rows, sqlQuery, args...)
	if err != nil && IsMissingEducationReferenceCustomTableError(err) {
		return []EducationReferenceCustomRow{}, nil
	}
	return rows, wrapRepoErr("list custom education reference rows", err)
}

func UpsertEducationReferenceCustomEntries(db *sqlx.DB, userID int64, entries []EducationReferenceCustomUpsertEntry, now time.Time) error {
	if db == nil || len(entries) == 0 {
		return nil
	}
	if now.IsZero() {
		now = time.Now()
	}

	tx, err := db.Beginx()
	if err != nil {
		return wrapRepoErr("begin upsert education reference custom tx", err)
	}
	defer tx.Rollback()

	const query = `INSERT INTO education_reference_custom
		(institution, program, institution_normalized, program_normalized, source_user_id, created_at, updated_at)
	VALUES (?, ?, ?, ?, ?, ?, ?)
	ON DUPLICATE KEY UPDATE
		institution = CASE
			WHEN VALUES(institution) = '' THEN institution
			WHEN institution IS NULL OR institution = '' OR CHAR_LENGTH(VALUES(institution)) < CHAR_LENGTH(institution) THEN VALUES(institution)
			ELSE institution
		END,
		program = CASE
			WHEN VALUES(program) = '' THEN program
			WHEN program IS NULL OR program = '' OR CHAR_LENGTH(VALUES(program)) < CHAR_LENGTH(program) THEN VALUES(program)
			ELSE program
		END,
		source_user_id = VALUES(source_user_id),
		updated_at = VALUES(updated_at)`

	for _, entry := range entries {
		_, execErr := tx.Exec(
			query,
			entry.Institution,
			entry.Program,
			entry.InstitutionNormalized,
			entry.ProgramNormalized,
			userID,
			now,
			now,
		)
		if execErr != nil {
			if IsMissingEducationReferenceCustomTableError(execErr) {
				return nil
			}
			return wrapRepoErr("upsert education reference custom entry", execErr)
		}
	}

	if err := tx.Commit(); err != nil {
		return wrapRepoErr("commit upsert education reference custom tx", err)
	}
	return nil
}

func IsMissingEducationReferenceCustomTableError(err error) bool {
	if err == nil {
		return false
	}
	lower := strings.ToLower(err.Error())
	if !strings.Contains(lower, "education_reference_custom") {
		return false
	}
	return strings.Contains(lower, "doesn't exist") ||
		strings.Contains(lower, "no such table") ||
		strings.Contains(lower, "1146")
}
