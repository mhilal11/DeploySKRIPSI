package services

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	mysql "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

func GenerateEmployeeCode(db *sqlx.DB, role string) (string, error) {
	prefix := "EMP"
	switch role {
	case "Super Admin":
		prefix = "SA"
	case "Admin":
		prefix = "ADM"
	case "Staff":
		prefix = "STF"
	case "Pelamar":
		prefix = "PEL"
	}

	var lastCode sql.NullString
	err := db.Get(&lastCode, "SELECT employee_code FROM users WHERE employee_code LIKE ? ORDER BY employee_code DESC LIMIT 1", prefix+"%")
	if err != nil && err != sql.ErrNoRows {
		return "", err
	}

	if !lastCode.Valid || lastCode.String == "" {
		return fmt.Sprintf("%s%03d", prefix, 1), nil
	}

	numPart := strings.TrimPrefix(lastCode.String, prefix)
	var num int
	fmt.Sscanf(numPart, "%d", &num)
	num++
	return fmt.Sprintf("%s%03d", prefix, num), nil
}

func IsDuplicateEmployeeCodeError(err error) bool {
	if err == nil {
		return false
	}

	var mysqlErr *mysql.MySQLError
	if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
		return strings.Contains(strings.ToLower(mysqlErr.Message), "employee_code")
	}

	message := strings.ToLower(err.Error())
	return strings.Contains(message, "duplicate") && strings.Contains(message, "employee_code")
}

func WithGeneratedEmployeeCodeRetry(db *sqlx.DB, role string, operation func(code string) error) (string, error) {
	if operation == nil {
		return "", errors.New("employee code operation is required")
	}

	var lastErr error
	for attempt := 0; attempt < 5; attempt++ {
		code, err := GenerateEmployeeCode(db, role)
		if err != nil {
			return "", err
		}

		if err := operation(code); err != nil {
			if !IsDuplicateEmployeeCodeError(err) {
				return "", err
			}
			lastErr = err
			continue
		}

		return code, nil
	}

	if lastErr == nil {
		lastErr = errors.New("unknown employee code collision")
	}
	return "", fmt.Errorf("generate unique employee code retries exceeded: %w", lastErr)
}

func GenerateComplaintCode(db *sqlx.DB) (string, error) {
	var maxID sql.NullInt64
	if err := db.Get(&maxID, "SELECT MAX(id) FROM complaints"); err != nil {
		return "", err
	}
	sequence := maxID.Int64 + 1
	code := fmt.Sprintf("CPL%04d", sequence)

	// ensure uniqueness
	for {
		var exists int
		if err := db.Get(&exists, "SELECT COUNT(*) FROM complaints WHERE complaint_code = ?", code); err != nil {
			return "", err
		}
		if exists == 0 {
			break
		}
		sequence++
		code = fmt.Sprintf("CPL%04d", sequence)
	}

	return code, nil
}

func GenerateTerminationReference(db *sqlx.DB) (string, error) {
	var maxID sql.NullInt64
	if err := db.Get(&maxID, "SELECT MAX(id) FROM staff_terminations"); err != nil {
		return "", err
	}
	sequence := maxID.Int64 + 1
	return fmt.Sprintf("OFF-%04d", sequence), nil
}

func GenerateNomorSurat(db *sqlx.DB, departmentCode string, date time.Time) (string, error) {
	year := date.Format("2006")
	var count int
	if err := db.Get(&count, "SELECT COUNT(*) FROM surat WHERE YEAR(tanggal_surat) = ?", year); err != nil {
		return "", err
	}
	code := "GEN"
	if departmentCode != "" {
		code = strings.ToUpper(departmentCode)
	}
	return fmt.Sprintf("%03d/%s/%s", count+1, code, year), nil
}
