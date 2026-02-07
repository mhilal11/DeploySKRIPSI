package services

import (
	"database/sql"
	"strings"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

func EnsureDivisionProfiles(db *sqlx.DB) ([]models.DivisionProfile, error) {
	profiles := make([]models.DivisionProfile, 0)
	for _, name := range models.UserDivisions {
		var profile models.DivisionProfile
		err := db.Get(&profile, "SELECT * FROM division_profiles WHERE name = ? LIMIT 1", name)
		if err == sql.ErrNoRows {
			res, err := db.Exec("INSERT INTO division_profiles (name, capacity, is_hiring) VALUES (?, 0, 0)", name)
			if err != nil {
				return nil, err
			}
			id, _ := res.LastInsertId()
			profile = models.DivisionProfile{ID: id, Name: name, Capacity: 0, IsHiring: false}
		} else if err != nil {
			return nil, err
		}
		profiles = append(profiles, profile)
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
