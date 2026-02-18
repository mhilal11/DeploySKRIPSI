package services

import (
	"database/sql"
	"errors"
	"sort"
	"strings"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

func EnsureDivisionProfiles(db *sqlx.DB) ([]models.DivisionProfile, error) {
	if err := SyncDivisionProfilesFromUsers(db); err != nil {
		return nil, err
	}
	profiles := make([]models.DivisionProfile, 0)
	if err := db.Select(&profiles, "SELECT * FROM division_profiles ORDER BY name"); err != nil {
		return nil, err
	}
	return profiles, nil
}

func StaffForDivision(db *sqlx.DB, division string) ([]map[string]any, error) {
	rows := []models.User{}
	err := db.Select(&rows, "SELECT id, name, email, role, registered_at, created_at FROM users WHERE division = ? AND role IN (?, ?) ORDER BY name", division, models.RoleAdmin, models.RoleStaff)
	if err != nil {
		return nil, err
	}
	staff := make([]map[string]any, 0, len(rows))
	for _, u := range rows {
		joinDate := ""
		if u.RegisteredAt != nil {
			joinDate = u.RegisteredAt.Format("2006-01-02")
		} else if u.CreatedAt != nil {
			joinDate = u.CreatedAt.Format("2006-01-02")
		}
		staff = append(staff, map[string]any{
			"id":        u.ID,
			"name":      u.Name,
			"email":     u.Email,
			"position":  u.Role,
			"join_date": joinDate,
		})
	}
	return staff, nil
}

func DivisionCodeFromName(name string) string {
	clean := strings.Map(func(r rune) rune {
		if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') {
			return r
		}
		return -1
	}, name)
	if clean == "" {
		return ""
	}
	clean = strings.ToUpper(clean)
	if len(clean) <= 3 {
		return clean
	}
	return clean[:3]
}

func NormalizeDivisionName(value string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(value)), " ")
}

func EnsureDivisionProfile(db *sqlx.DB, name string) (*models.DivisionProfile, error) {
	name = NormalizeDivisionName(name)
	if name == "" {
		return nil, errors.New("division name is required")
	}

	var profile models.DivisionProfile
	err := db.Get(&profile, "SELECT * FROM division_profiles WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1", name)
	if err == nil {
		return &profile, nil
	}
	if err != sql.ErrNoRows {
		return nil, err
	}

	now := time.Now()
	if _, execErr := db.Exec(
		"INSERT INTO division_profiles (name, capacity, is_hiring, created_at, updated_at) VALUES (?, 0, 0, ?, ?)",
		name,
		now,
		now,
	); execErr != nil {
		var existing models.DivisionProfile
		if getErr := db.Get(&existing, "SELECT * FROM division_profiles WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1", name); getErr == nil {
			return &existing, nil
		}
		return nil, execErr
	}

	if err := db.Get(&profile, "SELECT * FROM division_profiles WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1", name); err != nil {
		return nil, err
	}
	return &profile, nil
}

func SyncDivisionProfilesFromUsers(db *sqlx.DB) error {
	userDivisions := []string{}
	if err := db.Select(&userDivisions, "SELECT DISTINCT TRIM(division) FROM users WHERE division IS NOT NULL AND TRIM(division) != ''"); err != nil {
		return err
	}

	for _, raw := range userDivisions {
		name := NormalizeDivisionName(raw)
		if name == "" {
			continue
		}
		if _, err := EnsureDivisionProfile(db, name); err != nil {
			return err
		}
	}
	return nil
}

func DivisionNames(db *sqlx.DB) ([]string, error) {
	if err := SyncDivisionProfilesFromUsers(db); err != nil {
		return nil, err
	}

	rows := []string{}
	if err := db.Select(&rows, "SELECT name FROM division_profiles WHERE name IS NOT NULL AND TRIM(name) != '' ORDER BY name"); err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		if err := db.Select(&rows, "SELECT DISTINCT TRIM(division) FROM users WHERE division IS NOT NULL AND TRIM(division) != '' ORDER BY division"); err != nil {
			return nil, err
		}
	}

	seen := map[string]struct{}{}
	out := make([]string, 0, len(rows))
	for _, row := range rows {
		name := NormalizeDivisionName(row)
		if name == "" {
			continue
		}
		key := strings.ToLower(name)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, name)
	}
	sort.Strings(out)
	return out, nil
}

func DivisionExists(db *sqlx.DB, name string) (bool, error) {
	name = NormalizeDivisionName(name)
	if name == "" {
		return false, nil
	}
	if err := SyncDivisionProfilesFromUsers(db); err != nil {
		return false, err
	}

	var count int
	if err := db.Get(&count, "SELECT COUNT(*) FROM division_profiles WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))", name); err != nil {
		return false, err
	}
	return count > 0, nil
}
