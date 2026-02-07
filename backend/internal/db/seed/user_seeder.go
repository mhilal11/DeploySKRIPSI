package seed

import (
	"database/sql"
	"errors"
	"time"

	"hris-backend/internal/models"
	"hris-backend/internal/services"

	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

func RunUserSeeder(database *sqlx.DB) error {
	if database == nil {
		return errors.New("database connection is nil")
	}

	email := "superadmin@admin.com"
	password := "password"
	name := "Super Admin"

	var existing models.User
	err := database.Get(&existing, "SELECT * FROM users WHERE email = ? LIMIT 1", email)
	if err == nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		now := time.Now()
		_, err = database.Exec(`UPDATE users SET name = ?, role = ?, status = 'Active', password = ?, updated_at = ?, email_verified_at = ? WHERE id = ?`,
			name, models.RoleSuperAdmin, string(hash), now, now, existing.ID)
		if err != nil {
			return err
		}
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	employeeCode, err := services.GenerateEmployeeCode(database, models.RoleSuperAdmin)
	if err != nil {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	now := time.Now()
	_, err = database.Exec(`INSERT INTO users (employee_code, name, email, role, status, registered_at, email_verified_at, password, created_at, updated_at)
		VALUES (?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?)`,
		employeeCode, name, email, models.RoleSuperAdmin, now.Format("2006-01-02"), now, string(hash), now, now)
	if err != nil {
		return err
	}
	return nil
}
