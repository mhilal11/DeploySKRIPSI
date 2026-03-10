package db

import (
	"database/sql"
	"errors"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type PasswordResetTokenRecord struct {
	Token     string    `db:"token"`
	CreatedAt time.Time `db:"created_at"`
}

func GetUserByEmail(db *sqlx.DB, email string) (*models.User, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var user models.User
	if err := db.Get(&user, "SELECT * FROM users WHERE email = ? LIMIT 1", email); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("get user by email", err)
	}
	return &user, nil
}

func SetUserLastLogin(db *sqlx.DB, userID int64, at time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if at.IsZero() {
		at = time.Now()
	}
	_, err := db.Exec("UPDATE users SET last_login_at = ? WHERE id = ?", at, userID)
	return wrapRepoErr("set user last login", err)
}

func CreatePelamarUser(
	db *sqlx.DB,
	employeeCode string,
	name string,
	email string,
	passwordHash string,
	registeredAt time.Time,
	emailVerifiedAt *time.Time,
	now time.Time,
) (int64, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	if registeredAt.IsZero() {
		registeredAt = time.Now()
	}
	if now.IsZero() {
		now = time.Now()
	}
	res, err := db.Exec(`
		INSERT INTO users (employee_code, name, email, role, status, registered_at, email_verified_at, password, created_at, updated_at)
		VALUES (?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?)
	`, employeeCode, name, email, models.RolePelamar, registeredAt.Format("2006-01-02"), emailVerifiedAt, passwordHash, now, now)
	if err != nil {
		return 0, wrapRepoErr("create pelamar user", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, wrapRepoErr("read pelamar user id", err)
	}
	return id, nil
}

func SavePasswordResetToken(db *sqlx.DB, email, token string, now time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if now.IsZero() {
		now = time.Now()
	}
	tx, err := db.Beginx()
	if err != nil {
		return wrapRepoErr("begin password reset token tx", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM password_reset_tokens WHERE email = ?", email); err != nil {
		return wrapRepoErr("delete password reset token", err)
	}
	if _, err := tx.Exec("INSERT INTO password_reset_tokens (email, token, created_at) VALUES (?, ?, ?)", email, token, now); err != nil {
		return wrapRepoErr("insert password reset token", err)
	}
	if err := tx.Commit(); err != nil {
		return wrapRepoErr("commit password reset token tx", err)
	}
	return nil
}

func GetPasswordResetTokenByEmail(db *sqlx.DB, email string) (*PasswordResetTokenRecord, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var record PasswordResetTokenRecord
	if err := db.Get(&record, "SELECT token, created_at FROM password_reset_tokens WHERE email = ? LIMIT 1", email); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("get password reset token", err)
	}
	return &record, nil
}

func DeletePasswordResetTokenByEmail(db *sqlx.DB, email string) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("DELETE FROM password_reset_tokens WHERE email = ?", email)
	return wrapRepoErr("delete password reset token by email", err)
}

func UpdateUserPasswordByEmail(db *sqlx.DB, email, passwordHash string) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("UPDATE users SET password = ? WHERE email = ?", passwordHash, email)
	return wrapRepoErr("update user password by email", err)
}

func UpdateUserBasicProfile(db *sqlx.DB, userID int64, name, email string, emailVerifiedAt *time.Time, now time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if now.IsZero() {
		now = time.Now()
	}
	_, err := db.Exec("UPDATE users SET name = ?, email = ?, email_verified_at = ?, updated_at = ? WHERE id = ?", name, email, emailVerifiedAt, now, userID)
	return wrapRepoErr("update user basic profile", err)
}

func MarkUserEmailVerified(db *sqlx.DB, userID int64, now time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if now.IsZero() {
		now = time.Now()
	}
	_, err := db.Exec("UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?", now, now, userID)
	return wrapRepoErr("mark user email verified", err)
}

func CreatePelamarUserWithProfile(
	db *sqlx.DB,
	employeeCode string,
	name string,
	email string,
	passwordHash string,
	registeredAt time.Time,
	emailVerifiedAt *time.Time,
	now time.Time,
) (int64, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	if registeredAt.IsZero() {
		registeredAt = time.Now()
	}
	if now.IsZero() {
		now = time.Now()
	}

	tx, err := db.Beginx()
	if err != nil {
		return 0, wrapRepoErr("begin create pelamar user tx", err)
	}
	defer tx.Rollback()

	res, err := tx.Exec(`
		INSERT INTO users (employee_code, name, email, role, status, registered_at, email_verified_at, password, created_at, updated_at)
		VALUES (?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?)
	`, employeeCode, name, email, models.RolePelamar, registeredAt.Format("2006-01-02"), emailVerifiedAt, passwordHash, now, now)
	if err != nil {
		return 0, wrapRepoErr("insert pelamar user", err)
	}
	userID, err := res.LastInsertId()
	if err != nil {
		return 0, wrapRepoErr("read inserted pelamar user id", err)
	}

	if _, err := tx.Exec(
		`INSERT INTO applicant_profiles (user_id, full_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
		userID,
		name,
		email,
		now,
		now,
	); err != nil {
		return 0, wrapRepoErr("insert pelamar profile", err)
	}

	if err := tx.Commit(); err != nil {
		return 0, wrapRepoErr("commit create pelamar user tx", err)
	}
	return userID, nil
}
