package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func RegisterPelamarRoutes(rg *gin.RouterGroup) {
	rg.GET("/pelamar/dashboard", PelamarDashboard)
	rg.GET("/pelamar/profil", PelamarProfileShow)
	rg.POST("/pelamar/profil", PelamarProfileUpdate)
	rg.GET("/pelamar/lamaran-saya", PelamarApplicationsIndex)
	rg.POST("/pelamar/lamaran-saya", PelamarApplicationsStore)
	rg.POST("/pelamar/lamaran-saya/check-eligibility", PelamarCheckEligibility)
}

func PelamarDashboard(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RolePelamar {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	applications := []models.Application{}
	_ = db.Select(&applications, "SELECT * FROM applications WHERE user_id = ? ORDER BY submitted_at DESC", user.ID)

	var latestApp *models.Application
	if len(applications) > 0 {
		latestApp = &applications[0]
	}

	var upcomingInterview any
	if latestApp != nil && latestApp.InterviewDate != nil {
		upcomingInterview = map[string]any{
			"position":    latestApp.Position,
			"date":        formatDate(latestApp.InterviewDate),
			"time":        firstString(latestApp.InterviewTime, "-"),
			"mode":        firstString(latestApp.InterviewMode, "-"),
			"interviewer": firstString(latestApp.InterviewerName, "-"),
			"link":        latestApp.MeetingLink,
			"notes":       latestApp.InterviewNotes,
		}
	}

	applicationsStatus := make([]map[string]any, 0, len(applications))
	for _, app := range applications {
		stages := []string{"Applied", "Screening", "Interview", "Offering", "Hired"}
		if app.Status == "Rejected" {
			stages = []string{"Applied", "Screening", "Interview", "Offering", "Rejected"}
		}

		statusIndex := -1
		for i, s := range stages {
			if s == app.Status {
				statusIndex = i
				break
			}
		}

		stageEntries := make([]map[string]any, 0, len(stages))
		fallbackDate := app.UpdatedAt
		if fallbackDate == nil || fallbackDate.IsZero() {
			fallbackDate = app.SubmittedAt
		}

		for i, stage := range stages {
			status := "pending"
			if statusIndex >= 0 {
				if i < statusIndex {
					status = "completed"
				} else if i == statusIndex {
					status = "current"
				}
			}
			date := stageDate(app, stage)
			if date == nil || date.IsZero() {
				date = fallbackDate
			}
			stageEntries = append(stageEntries, map[string]any{
				"name":   stage,
				"status": status,
				"date": func() string {
					if status == "pending" {
						return "-"
					}
					return formatDate(date)
				}(),
			})
		}

		progress := 0
		if app.Status == "Hired" {
			progress = 100
		} else if app.Status == "Rejected" {
			completed := 0
			for _, stage := range stageEntries {
				if stage["status"] == "completed" {
					completed++
				}
			}
			totalStages := len(stageEntries) - 1
			if totalStages < 1 {
				totalStages = 1
			}
			progress = int(float64(completed) / float64(totalStages) * 100)
		} else if statusIndex > 0 && len(stageEntries) > 1 {
			progress = int(float64(statusIndex) / float64(len(stageEntries)-1) * 100)
		}

		applicationsStatus = append(applicationsStatus, map[string]any{
			"id":                     app.ID,
			"position":               app.Position,
			"division":               app.Division,
			"status":                 app.Status,
			"progress":               progress,
			"stages":                 stageEntries,
			"rejection_reason":       app.RejectionReason,
			"updated_at_diff":        diffForHumans(fallbackDate),
			"submitted_at_formatted": formatDate(app.SubmittedAt),
			"interview": func() any {
				if app.Status != "Interview" {
					return nil
				}
				return map[string]any{
					"date":        formatDate(app.InterviewDate),
					"time":        app.InterviewTime,
					"mode":        app.InterviewMode,
					"link":        app.MeetingLink,
					"interviewer": app.InterviewerName,
					"notes":       app.InterviewNotes,
				}
			}(),
		})
	}

	applicationsData := make([]map[string]any, 0, len(applications))
	for _, app := range applications {
		applicationsData = append(applicationsData, map[string]any{
			"id":               app.ID,
			"position":         app.Position,
			"division":         app.Division,
			"status":           app.Status,
			"submitted_at":     formatDate(app.SubmittedAt),
			"full_name":        app.FullName,
			"email":            app.Email,
			"phone":            app.Phone,
			"education":        app.Education,
			"experience":       app.Experience,
			"skills":           app.Skills,
			"cv_file":          app.CvFile,
			"notes":            app.Notes,
			"rejection_reason": app.RejectionReason,
		})
	}

	profile := getApplicantProfile(db, user.ID)
	isProfileComplete := profile != nil && profile.CompletedAt != nil
	showProfileReminder := !isProfileComplete && len(applications) == 0

	c.JSON(http.StatusOK, gin.H{
		"applicationsStatus": applicationsStatus,
		"applications":       applicationsData,
		"stats": gin.H{
			"totalApplications": len(applications),
			"latestStatus": func() any {
				if latestApp != nil {
					return latestApp.Status
				}
				return nil
			}(),
			"rejectionReason": func() any {
				if latestApp != nil {
					return latestApp.RejectionReason
				}
				return nil
			}(),
		},
		"upcomingInterview":   upcomingInterview,
		"isProfileComplete":   isProfileComplete,
		"showProfileReminder": showProfileReminder,
	})
}

func PelamarProfileShow(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RolePelamar {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	profile := getOrCreateApplicantProfile(db, user)
	completion := computeProfileCompletion(profile)

	var activeCount int
	_ = db.Get(&activeCount, "SELECT COUNT(*) FROM applications WHERE user_id = ? AND status IN ('Applied','Screening','Interview','Offering')", user.ID)
	var completedCount int
	_ = db.Get(&completedCount, "SELECT COUNT(*) FROM applications WHERE user_id = ? AND status IN ('Hired','Rejected')", user.ID)

	payload := applicantProfilePayload(c, profile, completion)

	c.JSON(http.StatusOK, gin.H{
		"profile":                 payload,
		"profileReminderMessage":  "",
		"hasActiveApplication":    activeCount > 0,
		"hasCompletedApplication": completedCount > 0,
	})
}

func PelamarProfileUpdate(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RolePelamar {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	var activeCount int
	_ = db.Get(&activeCount, "SELECT COUNT(*) FROM applications WHERE user_id = ? AND status IN ('Applied','Screening','Interview','Offering')", user.ID)
	if activeCount > 0 {
		ValidationErrors(c, FieldErrors{"message": "Profil tidak dapat diubah karena lamaran Anda sedang dalam proses."})
		return
	}

	profile := getOrCreateApplicantProfile(db, user)

	section := c.PostForm("section")
	if section == "" {
		section = "all"
	}

	if section == "personal" || section == "all" {
		personalJSON := c.PostForm("personal")
		if personalJSON != "" {
			var personal map[string]string
			_ = json.Unmarshal([]byte(personalJSON), &personal)
			if v, ok := personal["full_name"]; ok {
				profile.FullName = &v
			}
			if v, ok := personal["email"]; ok {
				profile.Email = &v
			}
			if v, ok := personal["phone"]; ok {
				profile.Phone = &v
			}
			if v, ok := personal["date_of_birth"]; ok {
				if t, err := time.Parse("2006-01-02", v); err == nil {
					profile.DateOfBirth = &t
				}
			}
			if v, ok := personal["gender"]; ok {
				profile.Gender = &v
			}
			if v, ok := personal["religion"]; ok {
				profile.Religion = &v
			}
			if v, ok := personal["address"]; ok {
				profile.Address = &v
			}
			if v, ok := personal["city"]; ok {
				profile.City = &v
			}
			if v, ok := personal["province"]; ok {
				profile.Province = &v
			}
			if profile.FullName != nil || profile.Email != nil {
				_, _ = db.Exec("UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?", profile.FullName, profile.Email, user.ID)
			}
		}
	}

	if section == "photo" || section == "personal" {
		if _, err := c.FormFile("profile_photo"); err == nil {
			path, _, err := saveUploadedFile(c, "profile_photo", "applicant-profiles")
			if err == nil {
				profile.ProfilePhotoPath = &path
			}
		}
	}

	if section == "education" || section == "all" {
		educationsJSON := c.PostForm("educations")
		if educationsJSON != "" {
			var educations []map[string]any
			if err := json.Unmarshal([]byte(educationsJSON), &educations); err != nil {
				ValidationErrors(c, FieldErrors{"educations": "Format data pendidikan tidak valid."})
				return
			}

			if errs := validateEducationYears(educations); len(errs) > 0 {
				ValidationErrors(c, errs)
				return
			}

			normalized, _ := json.Marshal(educations)
			profile.Educations = models.JSON(normalized)
		}
	}

	if section == "experience" || section == "all" {
		experiencesJSON := c.PostForm("experiences")
		if experiencesJSON != "" {
			profile.Experiences = models.JSON([]byte(experiencesJSON))
		}
	}

	if section == "certification" {
		certificationsJSON := c.PostForm("certifications")
		var certs []map[string]any
		if certificationsJSON != "" {
			_ = json.Unmarshal([]byte(certificationsJSON), &certs)
		}
		for i := range certs {
			key := "certification_files." + strconv.Itoa(i)
			if _, err := c.FormFile(key); err == nil {
				path, _, err := saveUploadedFile(c, key, "applicant-certifications")
				if err == nil {
					certs[i]["file_path"] = path
				}
			} else {
				key2 := "certification_files_" + strconv.Itoa(i)
				if _, err2 := c.FormFile(key2); err2 == nil {
					path, _, err2 := saveUploadedFile(c, key2, "applicant-certifications")
					if err2 == nil {
						certs[i]["file_path"] = path
					}
				}
			}
		}
		if len(certs) > 0 {
			bytes, _ := json.Marshal(certs)
			profile.Certifications = models.JSON(bytes)
		}
	}

	syncCompletion(profile)

	now := time.Now()
	_, err := db.Exec(`UPDATE applicant_profiles SET full_name=?, email=?, phone=?, date_of_birth=?, gender=?, religion=?, address=?, city=?, province=?, profile_photo_path=?, educations=?, experiences=?, certifications=?, completed_at=?, updated_at=? WHERE user_id = ?`,
		profile.FullName, profile.Email, profile.Phone, profile.DateOfBirth, profile.Gender, profile.Religion, profile.Address, profile.City, profile.Province, profile.ProfilePhotoPath, profile.Educations, profile.Experiences, profile.Certifications, profile.CompletedAt, now, user.ID)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal memperbarui profil")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "Profil berhasil diperbarui."})
}

func PelamarApplicationsIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RolePelamar {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	profile := getOrCreateApplicantProfile(db, user)
	if !isProfileComplete(profile) {
		c.JSON(http.StatusOK, gin.H{
			"redirect_to":      "/pelamar/profil",
			"profile_reminder": "Lengkapi data pribadi dan pendidikan Anda sebelum mengakses halaman lamaran.",
		})
		return
	}

	apps := []models.Application{}
	_ = db.Select(&apps, "SELECT * FROM applications WHERE user_id = ? ORDER BY submitted_at DESC", user.ID)

	applications := make([]map[string]any, 0, len(apps))
	for _, app := range apps {
		applications = append(applications, map[string]any{
			"id":           app.ID,
			"position":     app.Position,
			"division":     app.Division,
			"status":       app.Status,
			"submitted_at": formatDate(app.SubmittedAt),
			"notes":        app.Notes,
		})
	}

	divisions := divisionSummaries(db)

	c.JSON(http.StatusOK, gin.H{
		"applications": applications,
		"defaultForm": gin.H{
			"full_name": firstString(profile.FullName, user.Name),
			"email":     firstString(profile.Email, user.Email),
			"phone":     firstString(profile.Phone, ""),
		},
		"divisions": divisions,
		"flash": gin.H{
			"success": "",
			"error":   "",
		},
	})
}

func PelamarApplicationsStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RolePelamar {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	profile := getOrCreateApplicantProfile(db, user)
	if !isProfileComplete(profile) {
		ValidationErrors(c, FieldErrors{"message": "Lengkapi profil Anda sebelum mengirim lamaran."})
		return
	}

	divisionID := c.PostForm("division_id")
	fullName := strings.TrimSpace(c.PostForm("full_name"))
	email := strings.TrimSpace(c.PostForm("email"))
	phone := strings.TrimSpace(c.PostForm("phone"))
	skills := strings.TrimSpace(c.PostForm("skills"))

	if divisionID == "" || fullName == "" || email == "" {
		ValidationErrors(c, FieldErrors{"division_id": "Divisi wajib diisi.", "full_name": "Nama wajib diisi.", "email": "Email wajib diisi."})
		return
	}

	var division models.DivisionProfile
	err := db.Get(&division, "SELECT * FROM division_profiles WHERE id = ?", divisionID)
	if err != nil {
		ValidationErrors(c, FieldErrors{"division_id": "Divisi tidak ditemukan."})
		return
	}

	if !division.IsHiring || division.JobTitle == nil {
		ValidationErrors(c, FieldErrors{"division_id": "Divisi ini tidak sedang membuka lowongan."})
		return
	}

	var existing int
	_ = db.Get(&existing, "SELECT COUNT(*) FROM applications WHERE user_id = ? AND division = ? AND position = ?", user.ID, division.Name, *division.JobTitle)
	if existing > 0 {
		ValidationErrors(c, FieldErrors{"division_id": "Anda sudah melamar untuk posisi ini."})
		return
	}

	cvPath, _, err := saveUploadedFile(c, "cv", "applications/cv")
	if err != nil {
		ValidationErrors(c, FieldErrors{"cv": "CV wajib diunggah."})
		return
	}

	now := time.Now()
	_, err = db.Exec(`INSERT INTO applications (user_id, full_name, email, phone, skills, division, position, cv_file, status, submitted_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Applied', ?, ?, ?)`,
		user.ID, fullName, email, phone, skills, division.Name, *division.JobTitle, cvPath, now, now, now)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal mengirim lamaran")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "Lamaran Anda berhasil dikirim."})
}

func PelamarCheckEligibility(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RolePelamar {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	divisionID := c.PostForm("division_id")
	if divisionID == "" {
		ValidationErrors(c, FieldErrors{"division_id": "Divisi wajib diisi."})
		return
	}

	var division models.DivisionProfile
	err := db.Get(&division, "SELECT * FROM division_profiles WHERE id = ?", divisionID)
	if err != nil {
		ValidationErrors(c, FieldErrors{"division_id": "Divisi tidak ditemukan."})
		return
	}

	if division.JobEligibility == nil || len(division.JobEligibility) == 0 {
		c.JSON(http.StatusOK, gin.H{"eligible": true, "failures": []any{}, "passed": []any{}})
		return
	}

	profile := getOrCreateApplicantProfile(db, user)
	var criteria map[string]any
	_ = json.Unmarshal([]byte(division.JobEligibility), &criteria)

	failures := []map[string]string{}
	passed := []map[string]string{}

	minAge, _ := toInt(criteria["min_age"])
	maxAge, _ := toInt(criteria["max_age"])
	if minAge > 0 || maxAge > 0 {
		age := calculateAge(profile.DateOfBirth)
		if age == nil {
			failures = append(failures, map[string]string{"field": "umur", "message": "Tanggal lahir Anda belum diisi di profil."})
		} else {
			failed := false
			if minAge > 0 && *age < minAge {
				failures = append(failures, map[string]string{"field": "umur", "message": "Umur Anda tidak memenuhi kriteria minimal."})
				failed = true
			}
			if maxAge > 0 && *age > maxAge {
				failures = append(failures, map[string]string{"field": "umur", "message": "Umur Anda tidak memenuhi kriteria maksimal."})
				failed = true
			}
			if !failed {
				passed = append(passed, map[string]string{"field": "umur", "message": "Umur Anda memenuhi kriteria."})
			}
		}
	}

	gender, _ := criteria["gender"].(string)
	if gender != "" && gender != "any" {
		if profile.Gender == nil || *profile.Gender == "" {
			failures = append(failures, map[string]string{"field": "jenis_kelamin", "message": "Jenis kelamin Anda belum diisi di profil."})
		} else if *profile.Gender != gender {
			failures = append(failures, map[string]string{"field": "jenis_kelamin", "message": "Lowongan ini hanya untuk " + gender + "."})
		} else {
			passed = append(passed, map[string]string{"field": "jenis_kelamin", "message": "Jenis kelamin sesuai kriteria."})
		}
	}

	minEducation, _ := criteria["min_education"].(string)
	if minEducation != "" {
		highest := highestEducationLevel(profile.Educations)
		if highest == "" {
			failures = append(failures, map[string]string{"field": "pendidikan", "message": "Data pendidikan Anda belum diisi di profil."})
		} else if educationRank(highest) < educationRank(minEducation) {
			failures = append(failures, map[string]string{"field": "pendidikan", "message": "Tingkat pendidikan tidak memenuhi kriteria minimal."})
		} else {
			passed = append(passed, map[string]string{"field": "pendidikan", "message": "Tingkat pendidikan memenuhi kriteria."})
		}
	}

	minExp, _ := toInt(criteria["min_experience_years"])
	if minExp > 0 {
		totalExp := totalExperienceYears(profile.Experiences)
		if totalExp < float64(minExp) {
			failures = append(failures, map[string]string{"field": "pengalaman", "message": "Pengalaman kerja tidak memenuhi kriteria."})
		} else {
			passed = append(passed, map[string]string{"field": "pengalaman", "message": "Pengalaman kerja memenuhi kriteria."})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"eligible": len(failures) == 0,
		"failures": failures,
		"passed":   passed,
	})
}

func getApplicantProfile(db *sqlx.DB, userID int64) *models.ApplicantProfile {
	var profile models.ApplicantProfile
	if err := db.Get(&profile, "SELECT * FROM applicant_profiles WHERE user_id = ?", userID); err != nil {
		return nil
	}
	return &profile
}

func getOrCreateApplicantProfile(db *sqlx.DB, user *models.User) *models.ApplicantProfile {
	profile := getApplicantProfile(db, user.ID)
	if profile != nil {
		return profile
	}
	now := time.Now()
	_, _ = db.Exec(`INSERT INTO applicant_profiles (user_id, full_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`, user.ID, user.Name, user.Email, now, now)
	return &models.ApplicantProfile{UserID: user.ID, FullName: &user.Name, Email: &user.Email}
}

func applicantProfilePayload(c *gin.Context, profile *models.ApplicantProfile, completion int) map[string]any {
	return map[string]any{
		"id":                    profile.ID,
		"full_name":             profile.FullName,
		"email":                 profile.Email,
		"phone":                 profile.Phone,
		"date_of_birth":         formatDateISO(profile.DateOfBirth),
		"gender":                profile.Gender,
		"religion":              profile.Religion,
		"address":               profile.Address,
		"city":                  profile.City,
		"province":              profile.Province,
		"profile_photo_url":     attachmentURL(c, profile.ProfilePhotoPath),
		"educations":            decodeJSONArray(profile.Educations),
		"experiences":           decodeJSONArray(profile.Experiences),
		"certifications":        formatCertifications(c, decodeJSONArray(profile.Certifications)),
		"is_complete":           profile.CompletedAt != nil,
		"completion_percentage": completion,
	}
}

func decodeJSONArray(raw models.JSON) []map[string]any {
	if len(raw) == 0 {
		return []map[string]any{}
	}
	var data []map[string]any
	_ = json.Unmarshal([]byte(raw), &data)
	if data == nil {
		return []map[string]any{}
	}
	return data
}

func decodeJSONMap(raw models.JSON) map[string]any {
	if len(raw) == 0 {
		return nil
	}
	var data map[string]any
	_ = json.Unmarshal([]byte(raw), &data)
	return data
}

func decodeJSONStringArray(raw models.JSON) []string {
	if len(raw) == 0 {
		return []string{}
	}

	var data []string
	if err := json.Unmarshal([]byte(raw), &data); err == nil {
		if data == nil {
			return []string{}
		}
		return data
	}

	// Backward-compatible fallback when JSON array contains non-string values.
	var anyData []any
	if err := json.Unmarshal([]byte(raw), &anyData); err != nil {
		return []string{}
	}
	out := make([]string, 0, len(anyData))
	for _, item := range anyData {
		if str, ok := item.(string); ok && strings.TrimSpace(str) != "" {
			out = append(out, str)
		}
	}
	return out
}

func formatCertifications(c *gin.Context, certs []map[string]any) []map[string]any {
	out := make([]map[string]any, 0, len(certs))
	for _, cert := range certs {
		path, _ := cert["file_path"].(string)
		if path != "" {
			url := "/storage/" + strings.TrimPrefix(path, "/")
			cert["file_url"] = url
			cert["file_name"] = filepathBase(path)
		}
		out = append(out, cert)
	}
	return out
}

func filepathBase(path string) string {
	parts := strings.Split(path, "/")
	return parts[len(parts)-1]
}

func computeProfileCompletion(profile *models.ApplicantProfile) int {
	required := []bool{
		profile.Phone != nil && *profile.Phone != "",
		profile.DateOfBirth != nil,
		profile.Gender != nil && *profile.Gender != "",
		profile.Religion != nil && *profile.Religion != "",
		profile.Address != nil && *profile.Address != "",
		profile.City != nil && *profile.City != "",
		profile.Province != nil && *profile.Province != "",
	}
	filled := 0
	for _, ok := range required {
		if ok {
			filled++
		}
	}
	completion := int(float64(filled) / float64(len(required)) * 100)
	return completion
}

func isProfileComplete(profile *models.ApplicantProfile) bool {
	if profile == nil {
		return false
	}
	if profile.Phone == nil || *profile.Phone == "" || profile.DateOfBirth == nil || profile.Gender == nil || profile.Religion == nil || profile.Address == nil || profile.City == nil || profile.Province == nil {
		return false
	}
	return len(profile.Educations) > 0
}

func syncCompletion(profile *models.ApplicantProfile) {
	if isProfileComplete(profile) {
		if profile.CompletedAt == nil {
			now := time.Now()
			profile.CompletedAt = &now
		}
	} else {
		profile.CompletedAt = nil
	}
}

func validateEducationYears(educations []map[string]any) FieldErrors {
	errs := FieldErrors{}
	currentYear := time.Now().Year()
	minYear := 1900

	for i, education := range educations {
		startYear, hasStartYear := toInt(education["start_year"])
		endYear, hasEndYear := toInt(education["end_year"])
		startYearField := "educations." + strconv.Itoa(i) + ".start_year"
		endYearField := "educations." + strconv.Itoa(i) + ".end_year"

		if hasStartYear && (startYear < minYear || startYear > currentYear) {
			errs[startYearField] = "Tahun mulai harus antara 1900 dan tahun sekarang."
		}

		if hasEndYear && endYear < minYear {
			errs[endYearField] = "Tahun selesai minimal 1900."
		}

		if hasStartYear && hasEndYear && endYear < startYear {
			errs[endYearField] = "Tahun selesai tidak boleh lebih kecil dari tahun mulai."
		}

		if hasStartYear && hasEndYear && endYear > startYear+7 {
			errs[endYearField] = "Tahun selesai maksimal 7 tahun dari tahun mulai."
		}
	}

	return errs
}

func stageDate(app models.Application, stage string) *time.Time {
	switch stage {
	case "Applied":
		return app.SubmittedAt
	case "Screening":
		return app.ScreeningAt
	case "Interview":
		if app.InterviewDate != nil {
			return app.InterviewDate
		}
		return app.InterviewAt
	case "Offering":
		return app.OfferingAt
	case "Rejected":
		return app.RejectedAt
	case "Hired":
		return app.HiredAt
	default:
		return app.SubmittedAt
	}
}

func toInt(value any) (int, bool) {
	switch v := value.(type) {
	case float64:
		return int(v), true
	case int:
		return v, true
	case string:
		if v == "" {
			return 0, false
		}
		i, err := strconv.Atoi(v)
		return i, err == nil
	default:
		return 0, false
	}
}

func calculateAge(dob *time.Time) *int {
	if dob == nil || dob.IsZero() {
		return nil
	}
	age := int(time.Since(*dob).Hours() / 24 / 365)
	return &age
}

func highestEducationLevel(raw models.JSON) string {
	educations := decodeJSONArray(raw)
	highestRank := -1
	highest := ""
	for _, edu := range educations {
		degree, _ := edu["degree"].(string)
		if degree == "" {
			continue
		}
		rank := educationRank(degree)
		if rank > highestRank {
			highestRank = rank
			highest = degree
		}
	}
	return highest
}

func educationRank(level string) int {
	ranks := map[string]int{
		"SMA": 1,
		"SMK": 1,
		"D1":  2,
		"D2":  3,
		"D3":  4,
		"D4":  5,
		"S1":  5,
		"S2":  6,
		"S3":  7,
	}
	return ranks[strings.ToUpper(level)]
}

func totalExperienceYears(raw models.JSON) float64 {
	experiences := decodeJSONArray(raw)
	totalMonths := 0
	for _, exp := range experiences {
		startYear, _ := toInt(exp["start_year"])
		endYear, _ := toInt(exp["end_year"])
		if curr, ok := exp["is_current"].(bool); ok && curr {
			endYear = time.Now().Year()
		}
		if startYear > 0 {
			if endYear <= 0 {
				endYear = time.Now().Year()
			}
			totalMonths += (endYear - startYear) * 12
		}
	}
	return float64(totalMonths) / 12.0
}

func divisionSummaries(db *sqlx.DB) []map[string]any {
	for _, name := range models.UserDivisions {
		var count int
		_ = db.Get(&count, "SELECT COUNT(*) FROM division_profiles WHERE name = ?", name)
		if count == 0 {
			_, _ = db.Exec("INSERT INTO division_profiles (name, capacity, is_hiring) VALUES (?, 0, 0)", name)
		}
	}

	profiles := []models.DivisionProfile{}
	_ = db.Select(&profiles, "SELECT * FROM division_profiles ORDER BY name")

	result := []map[string]any{}
	for _, profile := range profiles {
		var currentStaff int
		_ = db.Get(&currentStaff, "SELECT COUNT(*) FROM users WHERE division = ? AND role IN (?, ?)", profile.Name, models.RoleAdmin, models.RoleStaff)
		availableSlots := profile.Capacity - currentStaff
		if availableSlots < 0 {
			availableSlots = 0
		}
		isHiring := profile.IsHiring && profile.JobTitle != nil
		if isHiring {
			result = append(result, map[string]any{
				"id":                       profile.ID,
				"name":                     profile.Name,
				"description":              profile.Description,
				"manager_name":             profile.ManagerName,
				"capacity":                 profile.Capacity,
				"current_staff":            currentStaff,
				"available_slots":          availableSlots,
				"is_hiring":                isHiring,
				"job_title":                profile.JobTitle,
				"job_description":          profile.JobDescription,
				"job_requirements":         decodeJSONStringArray(profile.JobRequirements),
				"job_eligibility_criteria": decodeJSONMap(profile.JobEligibility),
			})
		}
	}
	return result
}
