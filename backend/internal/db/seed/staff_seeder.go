package seed

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"hris-backend/internal/models"
	"hris-backend/internal/services"

	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type staffSeed struct {
	Name      string
	Email     string
	Division  string
	Religion  string
	Gender    string
	Education string
}

var staffSeedData = []staffSeed{
	{Name: "Ahmad Rizki", Email: "staff01@hris.local", Division: "Finance", Religion: "Islam", Gender: "Laki-laki", Education: "S1"},
	{Name: "Siti Nur Aini", Email: "staff02@hris.local", Division: "Corporate", Religion: "Islam", Gender: "Perempuan", Education: "D3"},
	{Name: "Budi Santoso", Email: "staff03@hris.local", Division: "Government and Partner", Religion: "Kristen", Gender: "Laki-laki", Education: "SMA/SMK"},
	{Name: "Maria Fransiska", Email: "staff04@hris.local", Division: "Human Capital/HR", Religion: "Katolik", Gender: "Perempuan", Education: "S2"},
	{Name: "I Wayan Arta", Email: "staff05@hris.local", Division: "Infra and Backbone", Religion: "Hindu", Gender: "Laki-laki", Education: "D3"},
	{Name: "Ni Made Lestari", Email: "staff06@hris.local", Division: "IPrime", Religion: "Hindu", Gender: "Perempuan", Education: "S1"},
	{Name: "Kevin Jonathan", Email: "staff07@hris.local", Division: "NOC", Religion: "Buddha", Gender: "Laki-laki", Education: "S1"},
	{Name: "Cindy Olivia", Email: "staff08@hris.local", Division: "Corporate", Religion: "Kong Hu Chu", Gender: "Perempuan", Education: "SMA/SMK"},
	{Name: "Andi Pratama", Email: "staff09@hris.local", Division: "Finance", Religion: "Islam", Gender: "Laki-laki", Education: "S2"},
	{Name: "Rina Maharani", Email: "staff10@hris.local", Division: "Human Capital/HR", Religion: "Kristen", Gender: "Perempuan", Education: "S1"},
	{Name: "Dimas Saputra", Email: "staff11@hris.local", Division: "Infra and Backbone", Religion: "Buddha", Gender: "Laki-laki", Education: "D3"},
	{Name: "Lia Kartika", Email: "staff12@hris.local", Division: "Government and Partner", Religion: "Katolik", Gender: "Perempuan", Education: "S3"},
	{Name: "Fajar Nugroho", Email: "staff13@hris.local", Division: "IPrime", Religion: "Islam", Gender: "Laki-laki", Education: "SMA/SMK"},
	{Name: "Yuni Astuti", Email: "staff14@hris.local", Division: "NOC", Religion: "Lainnya", Gender: "Perempuan", Education: "Lainnya"},
	{Name: "Randy Wijaya", Email: "staff15@hris.local", Division: "Corporate", Religion: "Kong Hu Chu", Gender: "Laki-laki", Education: "S2"},
	{Name: "Desi Puspita", Email: "staff16@hris.local", Division: "Finance", Religion: "Kristen", Gender: "Perempuan", Education: "D3"},
	{Name: "Gilang Ramadhan", Email: "staff17@hris.local", Division: "Human Capital/HR", Religion: "Islam", Gender: "Laki-laki", Education: "S1"},
	{Name: "Monica Evelyn", Email: "staff18@hris.local", Division: "Infra and Backbone", Religion: "Katolik", Gender: "Perempuan", Education: "S2"},
	{Name: "Hendra Gunawan", Email: "staff19@hris.local", Division: "Government and Partner", Religion: "Buddha", Gender: "Laki-laki", Education: "SMA/SMK"},
	{Name: "Putri Nabila", Email: "staff20@hris.local", Division: "IPrime", Religion: "Islam", Gender: "Perempuan", Education: "S1"},
}

func RunStaffSeeder(database *sqlx.DB) error {
	if database == nil {
		return errors.New("database connection is nil")
	}

	password := "password"
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	now := time.Now()
	for _, item := range staffSeedData {
		email := strings.ToLower(strings.TrimSpace(item.Email))

		var existing models.User
		err := database.Get(&existing, "SELECT * FROM users WHERE email = ? LIMIT 1", email)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}

		if errors.Is(err, sql.ErrNoRows) {
			employeeCode, genErr := services.GenerateEmployeeCode(database, models.RoleStaff)
			if genErr != nil {
				return genErr
			}

			res, execErr := database.Exec(`INSERT INTO users (employee_code, name, email, role, division, status, registered_at, email_verified_at, password, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?)`,
				employeeCode, item.Name, email, models.RoleStaff, item.Division, now.Format("2006-01-02"), now, string(hash), now, now)
			if execErr != nil {
				return execErr
			}

			userID, idErr := res.LastInsertId()
			if idErr != nil {
				return idErr
			}

			if _, execErr = database.Exec(`INSERT INTO staff_profiles (user_id, religion, gender, education_level, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?)`,
				userID, item.Religion, item.Gender, item.Education, now, now); execErr != nil {
				return execErr
			}
			continue
		}

		employeeCode := ""
		if existing.EmployeeCode != nil {
			employeeCode = strings.TrimSpace(*existing.EmployeeCode)
		}
		if employeeCode == "" {
			employeeCode, err = services.GenerateEmployeeCode(database, models.RoleStaff)
			if err != nil {
				return err
			}
		}

		if _, err = database.Exec(`UPDATE users 
			SET employee_code = ?, name = ?, role = ?, division = ?, status = 'Active', registered_at = ?, inactive_at = NULL, email_verified_at = ?, password = ?, updated_at = ?
			WHERE id = ?`,
			employeeCode, item.Name, models.RoleStaff, item.Division, now.Format("2006-01-02"), now, string(hash), now, existing.ID); err != nil {
			return err
		}

		if _, err = database.Exec(`INSERT INTO staff_profiles (user_id, religion, gender, education_level, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE religion = VALUES(religion), gender = VALUES(gender), education_level = VALUES(education_level), updated_at = VALUES(updated_at)`,
			existing.ID, item.Religion, item.Gender, item.Education, now, now); err != nil {
			return err
		}
	}

	return nil
}
