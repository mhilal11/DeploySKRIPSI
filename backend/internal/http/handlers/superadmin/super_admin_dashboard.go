package superadmin

import (
	"hris-backend/internal/http/handlers"
	dbrepo "hris-backend/internal/repository"

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
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	roleCounts := map[string]int{}
	roleRows, _ := dbrepo.ListUserRoleCounts(db)
	for _, row := range roleRows {
		role := row.Role
		total := row.Total
		roleCounts[role] = total
	}

	now := time.Now()
	currentMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	countRegistered := func(role *string, start, end time.Time) int {
		count, _ := dbrepo.CountRegisteredUsersBetween(db, role, start, end)
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

	activeStatus := "Active"
	inactiveStatus := "Inactive"
	staffTotal, _ := dbrepo.CountUsersByRoleAndStatus(db, models.RoleStaff, nil)
	staffActive, _ := dbrepo.CountUsersByRoleAndStatus(db, models.RoleStaff, &activeStatus)
	staffInactive, _ := dbrepo.CountUsersByRoleAndStatus(db, models.RoleStaff, &inactiveStatus)

	staffStats := map[string]int{
		"total":    staffTotal,
		"active":   staffActive,
		"inactive": staffInactive,
	}

	religionCounts := map[string]int{}
	religionRows, _ := dbrepo.ListStaffReligionCounts(db)
	for _, row := range religionRows {
		if row.Name != nil {
			religionCounts[*row.Name] = row.Total
		} else {
			religionCounts["Belum Diisi"] = row.Total
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
	genderRows, _ := dbrepo.ListStaffGenderCounts(db)
	for _, row := range genderRows {
		if row.Name != nil {
			genderCounts[*row.Name] = row.Total
		} else {
			genderCounts["Belum Diisi"] = row.Total
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
	educationRows, _ := dbrepo.ListStaffEducationCounts(db)
	for _, row := range educationRows {
		if row.Name != nil {
			educationCounts[*row.Name] = row.Total
		} else {
			educationCounts["Belum Diisi"] = row.Total
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
	divisionRows, _ := dbrepo.ListApplicationCountsByDivision(db)
	for _, row := range divisionRows {
		division := row.Division
		total := row.Total
		name := "Tidak ada divisi"
		if division != nil {
			name = *division
		}
		newCount, _ := dbrepo.CountApplicationsByDivisionBetween(db, division, currentMonthStart, now)
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
		registrations, _ := dbrepo.CountRegisteredUsersBetween(db, nil, monthStart, monthEnd)
		applications, _ := dbrepo.CountApplicationsSubmittedBetween(db, monthStart, monthEnd)
		activityData = append(activityData, map[string]any{
			"month":         monthStart.Format("Jan"),
			"registrations": registrations,
			"applications":  applications,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"stats":                stats,
		"statChanges":          statChanges,
		"userDistribution":     userDistribution,
		"activityData":         activityData,
		"staffStats":           staffStats,
		"religionData":         religionData,
		"genderData":           genderData,
		"educationData":        educationData,
		"divisionApplicants":   divisionApplicants,
		"sidebarNotifications": handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func SuperAdminAdminHrDashboard(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	now := time.Now()
	currentMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	previousMonthStart := currentMonthStart.AddDate(0, -1, 0)
	previousMonthEnd := currentMonthStart.Add(-time.Second)

	monthDelta := func(counter func(start, end time.Time) int) int {
		current := counter(currentMonthStart, now)
		previous := counter(previousMonthStart, previousMonthEnd)
		return current - previous
	}

	activeEmployees, _ := dbrepo.CountUsersByStatus(db, "Active")
	activeChange := monthDelta(func(start, end time.Time) int {
		count, _ := dbrepo.CountUsersByStatusCreatedBetween(db, "Active", start, end)
		return count
	})

	positionsOpen, _ := dbrepo.CountStaffTerminationsByStatuses(db, "Diajukan", "Proses")
	positionsChange := monthDelta(func(start, end time.Time) int {
		count, _ := dbrepo.CountStaffTerminationsByStatusesAndRequestDateBetween(db, start, end, "Diajukan", "Proses")
		return count
	})

	newApplicants, _ := dbrepo.CountApplicationsBySubmittedBetween(db, currentMonthStart, now)
	newApplicantsChange := monthDelta(func(start, end time.Time) int {
		count, _ := dbrepo.CountApplicationsBySubmittedBetween(db, start, end)
		return count
	})

	incomingLetters, _ := dbrepo.CountIncomingLettersBetween(db, currentMonthStart, now)
	lettersChange := monthDelta(func(start, end time.Time) int {
		count, _ := dbrepo.CountIncomingLettersBetween(db, start, end)
		return count
	})

	activeComplaints, _ := dbrepo.CountStaffTerminationsByTypeAndStatuses(db, "PHK", "Diajukan", "Proses")
	complaintsChange := monthDelta(func(start, end time.Time) int {
		count, _ := dbrepo.CountStaffTerminationsByTypeStatusesAndRequestDateBetween(db, "PHK", start, end, "Diajukan", "Proses")
		return count
	})

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
		applied, _ := dbrepo.CountApplicationsBySubmittedBetween(db, monthStart, monthEnd)
		hired, _ := dbrepo.CountApplicationsByStatusSubmittedBetween(db, "Hired", monthStart, monthEnd)
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
	apps, _ := dbrepo.ListApplicationsByStatus(db, "Interview", 5)
	for _, app := range apps {
		dt := app.SubmittedAt
		if dt == nil {
			dt = app.CreatedAt
		}
		upcomingInterviews = append(upcomingInterviews, map[string]any{
			"name":     app.FullName,
			"position": app.Position,
			"time":     handlers.FormatTimeHM(dt),
			"date":     handlers.FormatDate(dt),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"stats":                stats,
		"recruitmentData":      recruitmentData,
		"turnoverData":         turnoverData,
		"recentActivities":     recentActivities,
		"upcomingInterviews":   upcomingInterviews,
		"sidebarNotifications": handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
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
	count, _ := dbrepo.CountStaffTerminationsByTypeAndCompleted(db, terminationType)
	return count
}

func recentAdminHrActivities(db *sqlx.DB) []map[string]any {
	activities := []map[string]any{}

	apps, _ := dbrepo.ListRecentApplicationsForDashboard(db, 5)
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
			"time": handlers.FormatDateTime(ts),
			"type": func() string {
				if app.Status == "Interview" {
					return "interview"
				}
				return "applicant"
			}(),
			"timestamp": ts,
		})
	}

	letters, _ := dbrepo.ListRecentLetters(db, 5)
	for _, surat := range letters {
		activities = append(activities, map[string]any{
			"title":     "Surat masuk",
			"desc":      surat.Perihal,
			"time":      handlers.FormatDate(surat.TanggalSurat),
			"type":      "mail",
			"timestamp": surat.TanggalSurat,
		})
	}

	terminations, _ := dbrepo.ListRecentStaffTerminations(db, 5)
	for _, termination := range terminations {
		activities = append(activities, map[string]any{
			"title": func() string {
				if termination.Type == "PHK" {
					return "Keluhan aktif"
				}
				return "Offboarding"
			}(),
			"desc": termination.EmployeeName + " - " + termination.Type,
			"time": handlers.FormatDateTime(termination.UpdatedAt),
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
