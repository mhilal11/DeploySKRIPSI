package handlers

import (
	"net/http"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func SuperAdminDashboard(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	roleCounts := map[string]int{}
	rows, _ := db.Queryx("SELECT role, COUNT(*) as total FROM users GROUP BY role")
	defer rows.Close()
	for rows.Next() {
		var role string
		var total int
		_ = rows.Scan(&role, &total)
		roleCounts[role] = total
	}

	now := time.Now()
	currentMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	countRegistered := func(role *string, start, end time.Time) int {
		query := "SELECT COUNT(*) FROM users WHERE COALESCE(registered_at, created_at) BETWEEN ? AND ?"
		args := []any{start, end}
		if role != nil {
			query += " AND role = ?"
			args = append(args, *role)
		}
		var count int
		_ = db.Get(&count, query, args...)
		return count
	}

	stats := map[string]int{
		"totalUsers":  roleCounts[models.RoleSuperAdmin] + roleCounts[models.RoleAdmin] + roleCounts[models.RoleStaff] + roleCounts[models.RolePelamar],
		"superAdmins": roleCounts[models.RoleSuperAdmin],
		"admins":      roleCounts[models.RoleAdmin],
		"staff":       roleCounts[models.RoleStaff],
		"pelamar":     roleCounts[models.RolePelamar],
	}

	statChanges := map[string]int{
		"totalUsers":  countRegistered(nil, currentMonthStart, now),
		"superAdmins": countRegistered(ptr(models.RoleSuperAdmin), currentMonthStart, now),
		"admins":      countRegistered(ptr(models.RoleAdmin), currentMonthStart, now),
		"staff":       countRegistered(ptr(models.RoleStaff), currentMonthStart, now),
		"pelamar":     countRegistered(ptr(models.RolePelamar), currentMonthStart, now),
	}

	userDistribution := []map[string]any{
		{"name": models.RoleSuperAdmin, "value": roleCounts[models.RoleSuperAdmin], "color": "#7c3aed"},
		{"name": models.RoleAdmin, "value": roleCounts[models.RoleAdmin], "color": "#3b82f6"},
		{"name": models.RoleStaff, "value": roleCounts[models.RoleStaff], "color": "#10b981"},
		{"name": models.RolePelamar, "value": roleCounts[models.RolePelamar], "color": "#f97316"},
	}

	var staffTotal, staffActive, staffInactive int
	_ = db.Get(&staffTotal, "SELECT COUNT(*) FROM users WHERE role = ?", models.RoleStaff)
	_ = db.Get(&staffActive, "SELECT COUNT(*) FROM users WHERE role = ? AND status = 'Active'", models.RoleStaff)
	_ = db.Get(&staffInactive, "SELECT COUNT(*) FROM users WHERE role = ? AND status = 'Inactive'", models.RoleStaff)

	staffStats := map[string]int{
		"total":    staffTotal,
		"active":   staffActive,
		"inactive": staffInactive,
	}

	religionCounts := map[string]int{}
	rows2, _ := db.Queryx("SELECT religion, COUNT(*) as total FROM staff_profiles GROUP BY religion")
	for rows2.Next() {
		var religion *string
		var total int
		_ = rows2.Scan(&religion, &total)
		if religion != nil {
			religionCounts[*religion] = total
		} else {
			religionCounts["Belum Diisi"] = total
		}
	}

	religionColors := []string{"#0ea5e9", "#6366f1", "#f97316", "#22c55e", "#eab308", "#ec4899", "#14b8a6"}
	religionData := []map[string]any{}
	for i, religion := range models.StaffReligions {
		religionData = append(religionData, map[string]any{
			"name":  religion,
			"value": religionCounts[religion],
			"color": religionColors[i%len(religionColors)],
		})
	}
	if count, ok := religionCounts["Belum Diisi"]; ok {
		religionData = append(religionData, map[string]any{"name": "Belum Diisi", "value": count, "color": "#94a3b8"})
	}

	genderCounts := map[string]int{}
	rows3, _ := db.Queryx("SELECT gender, COUNT(*) as total FROM staff_profiles GROUP BY gender")
	for rows3.Next() {
		var gender *string
		var total int
		_ = rows3.Scan(&gender, &total)
		if gender != nil {
			genderCounts[*gender] = total
		} else {
			genderCounts["Belum Diisi"] = total
		}
	}

	totalStaff := staffStats["total"]
	if totalStaff == 0 {
		totalStaff = 1
	}

	genderColors := []string{"#2563eb", "#f97316"}
	genderData := []map[string]any{}
	for i, gender := range models.StaffGenders {
		value := genderCounts[gender]
		genderData = append(genderData, map[string]any{
			"name":       gender,
			"value":      value,
			"percentage": int(float64(value) / float64(totalStaff) * 100),
			"color":      genderColors[i%len(genderColors)],
		})
	}
	if count, ok := genderCounts["Belum Diisi"]; ok {
		genderData = append(genderData, map[string]any{
			"name":       "Belum Diisi",
			"value":      count,
			"percentage": int(float64(count) / float64(totalStaff) * 100),
			"color":      "#94a3b8",
		})
	}

	educationCounts := map[string]int{}
	rows4, _ := db.Queryx("SELECT education_level, COUNT(*) as total FROM staff_profiles GROUP BY education_level")
	for rows4.Next() {
		var level *string
		var total int
		_ = rows4.Scan(&level, &total)
		if level != nil {
			educationCounts[*level] = total
		} else {
			educationCounts["Belum Diisi"] = total
		}
	}

	educationData := []map[string]any{}
	for _, level := range models.StaffEducationLevels {
		educationData = append(educationData, map[string]any{"level": level, "value": educationCounts[level]})
	}
	if count, ok := educationCounts["Belum Diisi"]; ok {
		educationData = append(educationData, map[string]any{"level": "Belum Diisi", "value": count})
	}

	divisionApplicants := []map[string]any{}
	rows5, _ := db.Queryx("SELECT division, COUNT(*) as total FROM applications GROUP BY division ORDER BY division")
	for rows5.Next() {
		var division *string
		var total int
		_ = rows5.Scan(&division, &total)
		name := "Tidak ada divisi"
		if division != nil {
			name = *division
		}
		var newCount int
		_ = db.Get(&newCount, "SELECT COUNT(*) FROM applications WHERE division = ? AND submitted_at BETWEEN ? AND ?", division, currentMonthStart, now)
		divisionApplicants = append(divisionApplicants, map[string]any{
			"id":    name,
			"name":  name,
			"count": total,
			"new":   newCount,
		})
	}

	activityData := []map[string]any{}
	for i := 5; i >= 0; i-- {
		monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -i, 0)
		monthEnd := monthStart.AddDate(0, 1, 0).Add(-time.Second)
		var registrations int
		_ = db.Get(&registrations, "SELECT COUNT(*) FROM users WHERE COALESCE(registered_at, created_at) BETWEEN ? AND ?", monthStart, monthEnd)
		var applications int
		_ = db.Get(&applications, "SELECT COUNT(*) FROM applications WHERE COALESCE(submitted_at, created_at) BETWEEN ? AND ?", monthStart, monthEnd)
		activityData = append(activityData, map[string]any{
			"month":         monthStart.Format("Jan"),
			"registrations": registrations,
			"applications":  applications,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"stats":              stats,
		"statChanges":        statChanges,
		"userDistribution":   userDistribution,
		"activityData":       activityData,
		"staffStats":         staffStats,
		"religionData":       religionData,
		"genderData":         genderData,
		"educationData":      educationData,
		"divisionApplicants": divisionApplicants,
	})
}

func SuperAdminAdminHrDashboard(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	now := time.Now()
	currentMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	previousMonthStart := currentMonthStart.AddDate(0, -1, 0)
	previousMonthEnd := currentMonthStart.Add(-time.Second)

	monthDelta := func(query string, args ...any) int {
		var current int
		currentArgs := append([]any{}, args...)
		currentArgs = append(currentArgs, currentMonthStart, now)
		_ = db.Get(&current, query, currentArgs...)
		var previous int
		previousArgs := append([]any{}, args...)
		previousArgs = append(previousArgs, previousMonthStart, previousMonthEnd)
		_ = db.Get(&previous, query, previousArgs...)
		return current - previous
	}

	var activeEmployees int
	_ = db.Get(&activeEmployees, "SELECT COUNT(*) FROM users WHERE status = 'Active'")
	activeChange := monthDelta("SELECT COUNT(*) FROM users WHERE status = 'Active' AND created_at BETWEEN ? AND ?")

	var positionsOpen int
	_ = db.Get(&positionsOpen, "SELECT COUNT(*) FROM staff_terminations WHERE status IN ('Diajukan','Proses')")
	positionsChange := monthDelta("SELECT COUNT(*) FROM staff_terminations WHERE status IN ('Diajukan','Proses') AND request_date BETWEEN ? AND ?")

	var newApplicants int
	_ = db.Get(&newApplicants, "SELECT COUNT(*) FROM applications WHERE submitted_at BETWEEN ? AND ?", currentMonthStart, now)
	newApplicantsChange := monthDelta("SELECT COUNT(*) FROM applications WHERE submitted_at BETWEEN ? AND ?")

	var incomingLetters int
	_ = db.Get(&incomingLetters, "SELECT COUNT(*) FROM surat WHERE tipe_surat = 'masuk' AND tanggal_surat BETWEEN ? AND ?", currentMonthStart, now)
	lettersChange := monthDelta("SELECT COUNT(*) FROM surat WHERE tipe_surat = 'masuk' AND tanggal_surat BETWEEN ? AND ?")

	var activeComplaints int
	_ = db.Get(&activeComplaints, "SELECT COUNT(*) FROM staff_terminations WHERE type = 'PHK' AND status IN ('Diajukan','Proses')")
	complaintsChange := monthDelta("SELECT COUNT(*) FROM staff_terminations WHERE type = 'PHK' AND status IN ('Diajukan','Proses') AND request_date BETWEEN ? AND ?")

	stats := []map[string]any{
		statCard("Karyawan Aktif", "users", activeEmployees, activeChange),
		statCard("Posisi Kosong", "briefcase", positionsOpen, positionsChange),
		statCard("Pelamar Baru", "userPlus", newApplicants, newApplicantsChange),
		statCard("Surat Masuk", "mail", incomingLetters, lettersChange),
		statCard("Keluhan Aktif", "alert", activeComplaints, complaintsChange),
	}

	recruitmentData := []map[string]any{}
	for i := 5; i >= 0; i-- {
		monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -i, 0)
		monthEnd := monthStart.AddDate(0, 1, 0).Add(-time.Second)
		var applied int
		_ = db.Get(&applied, "SELECT COUNT(*) FROM applications WHERE submitted_at BETWEEN ? AND ?", monthStart, monthEnd)
		var hired int
		_ = db.Get(&hired, "SELECT COUNT(*) FROM applications WHERE status = 'Hired' AND submitted_at BETWEEN ? AND ?", monthStart, monthEnd)
		recruitmentData = append(recruitmentData, map[string]any{
			"month":   monthStart.Format("Jan"),
			"applied": applied,
			"hired":   hired,
		})
	}

	turnoverData := []map[string]any{
		{"name": "Aktif", "value": activeEmployees, "color": "#1e3a8a"},
		{"name": "Resign", "value": countByTerminationType(db, "Resign"), "color": "#f59e0b"},
		{"name": "PHK", "value": countByTerminationType(db, "PHK"), "color": "#ef4444"},
	}

	recentActivities := recentAdminHrActivities(db)

	upcomingInterviews := []map[string]any{}
	apps := []models.Application{}
	_ = db.Select(&apps, "SELECT * FROM applications WHERE status = 'Interview' ORDER BY submitted_at DESC LIMIT 5")
	for _, app := range apps {
		dt := app.SubmittedAt
		if dt == nil {
			dt = app.CreatedAt
		}
		upcomingInterviews = append(upcomingInterviews, map[string]any{
			"name":     app.FullName,
			"position": app.Position,
			"time":     formatTimeHM(dt),
			"date":     formatDate(dt),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"stats":              stats,
		"recruitmentData":    recruitmentData,
		"turnoverData":       turnoverData,
		"recentActivities":   recentActivities,
		"upcomingInterviews": upcomingInterviews,
	})
}

func statCard(label string, icon string, value int, change int) map[string]any {
	trend := "up"
	if change < 0 {
		trend = "down"
	}
	return map[string]any{
		"label":  label,
		"icon":   icon,
		"value":  value,
		"change": change,
		"trend":  trend,
	}
}

func countByTerminationType(db *sqlx.DB, terminationType string) int {
	var count int
	_ = db.Get(&count, "SELECT COUNT(*) FROM staff_terminations WHERE type = ? AND status = 'Selesai'", terminationType)
	return count
}

func recentAdminHrActivities(db *sqlx.DB) []map[string]any {
	activities := []map[string]any{}

	apps := []models.Application{}
	_ = db.Select(&apps, "SELECT * FROM applications ORDER BY submitted_at DESC LIMIT 5")
	for _, app := range apps {
		ts := app.SubmittedAt
		if ts == nil {
			ts = app.CreatedAt
		}
		activities = append(activities, map[string]any{
			"title": func() string {
				if app.Status == "Interview" {
					return "Interview terjadwal"
				}
				return "Pelamar baru"
			}(),
			"desc": app.FullName + " - " + app.Position,
			"time": formatDateTime(ts),
			"type": func() string {
				if app.Status == "Interview" {
					return "interview"
				}
				return "applicant"
			}(),
			"timestamp": ts,
		})
	}

	letters := []models.Surat{}
	_ = db.Select(&letters, "SELECT * FROM surat ORDER BY tanggal_surat DESC LIMIT 5")
	for _, surat := range letters {
		activities = append(activities, map[string]any{
			"title":     "Surat masuk",
			"desc":      surat.Perihal,
			"time":      formatDate(surat.TanggalSurat),
			"type":      "mail",
			"timestamp": surat.TanggalSurat,
		})
	}

	terminations := []models.StaffTermination{}
	_ = db.Select(&terminations, "SELECT * FROM staff_terminations ORDER BY updated_at DESC LIMIT 5")
	for _, termination := range terminations {
		activities = append(activities, map[string]any{
			"title": func() string {
				if termination.Type == "PHK" {
					return "Keluhan aktif"
				}
				return "Offboarding"
			}(),
			"desc": termination.EmployeeName + " - " + termination.Type,
			"time": formatDateTime(termination.UpdatedAt),
			"type": func() string {
				if termination.Type == "PHK" {
					return "complaint"
				}
				return "termination"
			}(),
			"timestamp": termination.UpdatedAt,
		})
	}

	// sort by timestamp desc
	// simple bubble sort
	for i := 0; i < len(activities); i++ {
		for j := i + 1; j < len(activities); j++ {
			t1, _ := activities[i]["timestamp"].(*time.Time)
			t2, _ := activities[j]["timestamp"].(*time.Time)
			if t2 != nil && t1 != nil && t2.After(*t1) {
				activities[i], activities[j] = activities[j], activities[i]
			}
		}
	}

	if len(activities) > 5 {
		activities = activities[:5]
	}
	for i := range activities {
		delete(activities[i], "timestamp")
	}

	return activities
}

func ptr(v string) *string { return &v }
