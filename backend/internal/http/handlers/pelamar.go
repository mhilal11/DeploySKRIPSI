package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func RegisterPelamarRoutes(rg *gin.RouterGroup) {
	rg.GET("/pelamar/dashboard", PelamarDashboard)
	rg.GET("/pelamar/profil", PelamarProfileShow)
	rg.POST("/pelamar/profil", PelamarProfileUpdate)
	rg.GET("/pelamar/references/education", PelamarEducationReferences)
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
	shouldSyncUserAccount := false

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
				trimmed := strings.TrimSpace(v)
				profile.FullName = &trimmed
				shouldSyncUserAccount = true
			}
			if v, ok := personal["email"]; ok {
				trimmed := strings.TrimSpace(v)
				profile.Email = &trimmed
				shouldSyncUserAccount = true
			}
			if v, ok := personal["phone"]; ok {
				normalizedPhone := normalizePhoneNumber(v)
				profile.Phone = &normalizedPhone
			}
			if v, ok := personal["date_of_birth"]; ok {
				trimmed := strings.TrimSpace(v)
				if trimmed == "" {
					profile.DateOfBirth = nil
				} else {
					t, err := time.Parse("2006-01-02", trimmed)
					if err != nil {
						ValidationErrors(c, FieldErrors{
							"personal.date_of_birth": "Format tanggal lahir tidak valid.",
						})
						return
					}
					profile.DateOfBirth = &t
				}
			}
			if v, ok := personal["gender"]; ok {
				trimmed := strings.TrimSpace(v)
				profile.Gender = &trimmed
			}
			if v, ok := personal["religion"]; ok {
				trimmed := strings.TrimSpace(v)
				profile.Religion = &trimmed
			}
			if v, ok := personal["address"]; ok {
				trimmed := strings.TrimSpace(v)
				profile.Address = &trimmed
			}
			if v, ok := personal["domicile_address"]; ok {
				trimmed := strings.TrimSpace(v)
				profile.DomicileAddress = &trimmed
			}
			if v, ok := personal["city"]; ok {
				trimmed := strings.TrimSpace(v)
				profile.City = &trimmed
			}
			if v, ok := personal["province"]; ok {
				trimmed := strings.TrimSpace(v)
				profile.Province = &trimmed
			}
		}

		if errs := validatePersonalRequired(profile); len(errs) > 0 {
			ValidationErrors(c, errs)
			return
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
		if strings.TrimSpace(educationsJSON) == "" {
			ValidationErrors(c, FieldErrors{"educations": "Minimal 1 riwayat pendidikan wajib diisi."})
			return
		}
		var educations []map[string]any
		if err := json.Unmarshal([]byte(educationsJSON), &educations); err != nil {
			ValidationErrors(c, FieldErrors{"educations": "Format data pendidikan tidak valid."})
			return
		}

		if errs := validateEducationRequired(educations); len(errs) > 0 {
			ValidationErrors(c, errs)
			return
		}

		if errs := validateEducationYears(educations); len(errs) > 0 {
			ValidationErrors(c, errs)
			return
		}

		// Non-blocking: profil pelamar tetap harus bisa disimpan
		// walau sinkron referensi manual gagal (mis. migration table belum dijalankan).
		_ = persistCustomEducationReferences(db, user.ID, educations)

		normalized, _ := json.Marshal(educations)
		profile.Educations = models.JSON(normalized)
	}

	if section == "experience" || section == "all" {
		experiencesJSON := c.PostForm("experiences")
		if experiencesJSON != "" {
			var experiences []map[string]any
			if err := json.Unmarshal([]byte(experiencesJSON), &experiences); err != nil {
				ValidationErrors(c, FieldErrors{"experiences": "Format data pengalaman tidak valid."})
				return
			}

			if errs := validateExperienceRequired(experiences); len(errs) > 0 {
				ValidationErrors(c, errs)
				return
			}

			if errs := validateExperiencePeriods(experiences); len(errs) > 0 {
				ValidationErrors(c, errs)
				return
			}

			normalized, _ := json.Marshal(experiences)
			profile.Experiences = models.JSON(normalized)
		}
	}

	if section == "certification" {
		certificationsJSON := c.PostForm("certifications")
		var certs []map[string]any
		if certificationsJSON != "" {
			_ = json.Unmarshal([]byte(certificationsJSON), &certs)
		}
		if certs == nil {
			certs = []map[string]any{}
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
		if errs := validateCertificationRequired(certs); len(errs) > 0 {
			ValidationErrors(c, errs)
			return
		}
		bytes, _ := json.Marshal(certs)
		profile.Certifications = models.JSON(bytes)
	}

	if shouldSyncUserAccount {
		_, _ = db.Exec("UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?", profile.FullName, profile.Email, user.ID)
	}

	syncCompletion(profile)

	now := time.Now()
	_, err := db.Exec(`UPDATE applicant_profiles SET full_name=?, email=?, phone=?, date_of_birth=?, gender=?, religion=?, address=?, domicile_address=?, city=?, province=?, profile_photo_path=?, educations=?, experiences=?, certifications=?, completed_at=?, updated_at=? WHERE user_id = ?`,
		profile.FullName, profile.Email, profile.Phone, profile.DateOfBirth, profile.Gender, profile.Religion, profile.Address, profile.DomicileAddress, profile.City, profile.Province, profile.ProfilePhotoPath, profile.Educations, profile.Experiences, profile.Certifications, profile.CompletedAt, now, user.ID)
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
	phone := normalizePhoneNumber(c.PostForm("phone"))
	skills := strings.TrimSpace(c.PostForm("skills"))

	if divisionID == "" || fullName == "" || email == "" {
		ValidationErrors(c, FieldErrors{"division_id": "Divisi wajib diisi.", "full_name": "Nama wajib diisi.", "email": "Email wajib diisi."})
		return
	}
	if !isValidPhoneNumber(phone) {
		ValidationErrors(c, FieldErrors{"phone": "Nomor telepon harus 8-13 digit angka."})
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
	insertResult, err := db.Exec(`INSERT INTO applications (user_id, full_name, email, phone, skills, division, position, cv_file, status, submitted_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Applied', ?, ?, ?)`,
		user.ID, fullName, email, phone, skills, division.Name, *division.JobTitle, cvPath, now, now, now)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal mengirim lamaran")
		return
	}
	applicationID, _ := insertResult.LastInsertId()
	if applicationID > 0 {
		triggerAutomaticRecruitmentAIScreening(db, middleware.GetConfig(c), applicationID, user.ID)
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

	appendFailure := func(field, message, actual, expected, recommendation string) {
		failures = append(failures, map[string]string{
			"field":          field,
			"message":        message,
			"detail":         message,
			"actual":         actual,
			"expected":       expected,
			"recommendation": recommendation,
		})
	}
	appendPassed := func(field, message, actual, expected string) {
		passed = append(passed, map[string]string{
			"field":    field,
			"message":  message,
			"detail":   message,
			"actual":   actual,
			"expected": expected,
		})
	}

	minAge, _ := toInt(criteria["min_age"])
	maxAge, _ := toInt(criteria["max_age"])
	if minAge > 0 || maxAge > 0 {
		expectedAge := expectedAgeText(minAge, maxAge)
		age := calculateAge(profile.DateOfBirth)
		if age == nil {
			appendFailure(
				"umur",
				"Tanggal lahir Anda belum diisi di profil.",
				"Belum ada data tanggal lahir",
				expectedAge,
				"Lengkapi tanggal lahir pada bagian Data Pribadi profil.",
			)
		} else {
			failed := false
			if minAge > 0 && *age < minAge {
				appendFailure(
					"umur",
					"Umur Anda tidak memenuhi kriteria minimal.",
					fmt.Sprintf("%d tahun", *age),
					expectedAge,
					"Periksa kembali tanggal lahir pada profil agar sesuai dengan persyaratan lowongan.",
				)
				failed = true
			}
			if maxAge > 0 && *age > maxAge {
				appendFailure(
					"umur",
					"Umur Anda tidak memenuhi kriteria maksimal.",
					fmt.Sprintf("%d tahun", *age),
					expectedAge,
					"Periksa kembali tanggal lahir pada profil agar sesuai dengan persyaratan lowongan.",
				)
				failed = true
			}
			if !failed {
				appendPassed(
					"umur",
					"Umur Anda memenuhi kriteria.",
					fmt.Sprintf("%d tahun", *age),
					expectedAge,
				)
			}
		}
	}

	gender, _ := criteria["gender"].(string)
	if gender != "" && gender != "any" {
		expectedGender := strings.TrimSpace(gender)
		if profile.Gender == nil || *profile.Gender == "" {
			appendFailure(
				"jenis_kelamin",
				"Jenis kelamin Anda belum diisi di profil.",
				"Belum diisi",
				expectedGender,
				"Lengkapi jenis kelamin pada bagian Data Pribadi profil.",
			)
		} else if *profile.Gender != gender {
			appendFailure(
				"jenis_kelamin",
				"Lowongan ini hanya untuk "+gender+".",
				strings.TrimSpace(*profile.Gender),
				expectedGender,
				"Pilih lowongan lain yang sesuai dengan profil Anda.",
			)
		} else {
			appendPassed(
				"jenis_kelamin",
				"Jenis kelamin sesuai kriteria.",
				strings.TrimSpace(*profile.Gender),
				expectedGender,
			)
		}
	}

	minEducation, _ := criteria["min_education"].(string)
	if minEducation != "" {
		highest := highestEducationLevel(profile.Educations)
		if highest == "" {
			appendFailure(
				"pendidikan",
				"Data pendidikan Anda belum diisi di profil.",
				"Belum ada riwayat pendidikan",
				"Minimal "+minEducation,
				"Tambahkan riwayat pendidikan pada tab Pendidikan profil.",
			)
		} else if educationRank(highest) < educationRank(minEducation) {
			appendFailure(
				"pendidikan",
				"Tingkat pendidikan tidak memenuhi kriteria minimal.",
				"Tertinggi: "+highest,
				"Minimal "+minEducation,
				"Pastikan jenjang pendidikan tertinggi Anda tercatat dengan benar di profil.",
			)
		} else {
			appendPassed(
				"pendidikan",
				"Tingkat pendidikan memenuhi kriteria.",
				"Tertinggi: "+highest,
				"Minimal "+minEducation,
			)
		}
	}

	minExp, _ := toInt(criteria["min_experience_years"])
	if minExp > 0 {
		totalExp := totalExperienceYears(profile.Experiences)
		expectedExp := fmt.Sprintf("Minimal %d tahun", minExp)
		actualExp := fmt.Sprintf("%.1f tahun", totalExp)
		if totalExp < float64(minExp) {
			appendFailure(
				"pengalaman",
				"Pengalaman kerja tidak memenuhi kriteria.",
				actualExp,
				expectedExp,
				"Lengkapi pengalaman kerja/magang pada tab Pengalaman Kerja/Magang di profil.",
			)
		} else {
			appendPassed(
				"pengalaman",
				"Pengalaman kerja memenuhi kriteria.",
				actualExp,
				expectedExp,
			)
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
		"domicile_address":      profile.DomicileAddress,
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
			if fileURL := attachmentURL(c, &path); fileURL != nil {
				cert["file_url"] = *fileURL
			}
			cert["file_name"] = filepathBase(path)
		}
		out = append(out, cert)
	}
	return out
}

func filepathBase(path string) string {
	path = strings.ReplaceAll(path, "\\", "/")
	parts := strings.Split(path, "/")
	return parts[len(parts)-1]
}

func computeProfileCompletion(profile *models.ApplicantProfile) int {
	fullNameFilled := profile.FullName != nil && strings.TrimSpace(*profile.FullName) != ""
	emailFilled := profile.Email != nil && strings.TrimSpace(*profile.Email) != ""
	phoneValid := false
	if profile.Phone != nil {
		phoneValid = isValidPhoneNumber(normalizePhoneNumber(*profile.Phone))
	}

	required := []bool{
		fullNameFilled,
		emailFilled,
		phoneValid,
		profile.DateOfBirth != nil,
		profile.Gender != nil && *profile.Gender != "",
		profile.Religion != nil && *profile.Religion != "",
		profile.Address != nil && *profile.Address != "",
		profile.DomicileAddress != nil && *profile.DomicileAddress != "",
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
	if profile.FullName == nil || strings.TrimSpace(*profile.FullName) == "" ||
		profile.Email == nil || strings.TrimSpace(*profile.Email) == "" ||
		profile.Phone == nil || !isValidPhoneNumber(normalizePhoneNumber(*profile.Phone)) ||
		profile.DateOfBirth == nil ||
		profile.Gender == nil || strings.TrimSpace(*profile.Gender) == "" ||
		profile.Religion == nil || strings.TrimSpace(*profile.Religion) == "" ||
		profile.Address == nil || strings.TrimSpace(*profile.Address) == "" ||
		profile.DomicileAddress == nil || strings.TrimSpace(*profile.DomicileAddress) == "" ||
		profile.City == nil || strings.TrimSpace(*profile.City) == "" ||
		profile.Province == nil || strings.TrimSpace(*profile.Province) == "" {
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

func normalizePhoneNumber(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}

	var builder strings.Builder
	builder.Grow(len(value))
	for _, r := range value {
		if r >= '0' && r <= '9' {
			builder.WriteRune(r)
		}
	}
	return builder.String()
}

func isValidPhoneNumber(value string) bool {
	length := len(value)
	return length >= 8 && length <= 13
}

func validatePersonalRequired(profile *models.ApplicantProfile) FieldErrors {
	errs := FieldErrors{}

	fullName := strings.TrimSpace(firstString(profile.FullName, ""))
	email := strings.TrimSpace(firstString(profile.Email, ""))
	phone := normalizePhoneNumber(firstString(profile.Phone, ""))
	gender := strings.TrimSpace(firstString(profile.Gender, ""))
	religion := strings.TrimSpace(firstString(profile.Religion, ""))
	address := strings.TrimSpace(firstString(profile.Address, ""))
	domicileAddress := strings.TrimSpace(firstString(profile.DomicileAddress, ""))
	city := strings.TrimSpace(firstString(profile.City, ""))
	province := strings.TrimSpace(firstString(profile.Province, ""))

	if fullName == "" {
		errs["personal.full_name"] = "Nama lengkap wajib diisi."
	}
	if email == "" {
		errs["personal.email"] = "Email wajib diisi."
	} else if !strings.Contains(email, "@") {
		errs["personal.email"] = "Format email tidak valid."
	}
	if phone == "" {
		errs["personal.phone"] = "Nomor telepon wajib diisi."
	} else if !isValidPhoneNumber(phone) {
		errs["personal.phone"] = "Nomor telepon harus 8-13 digit angka."
	}
	if profile.DateOfBirth == nil {
		errs["personal.date_of_birth"] = "Tanggal lahir wajib diisi."
	}
	if gender == "" {
		errs["personal.gender"] = "Jenis kelamin wajib diisi."
	}
	if religion == "" {
		errs["personal.religion"] = "Agama wajib diisi."
	}
	if address == "" {
		errs["personal.address"] = "Alamat lengkap wajib diisi."
	}
	if domicileAddress == "" {
		errs["personal.domicile_address"] = "Alamat domisili wajib diisi."
	}
	if province == "" {
		errs["personal.province"] = "Provinsi wajib diisi."
	}
	if city == "" {
		errs["personal.city"] = "Kota/Kabupaten wajib diisi."
	}

	return errs
}

func validateEducationRequired(educations []map[string]any) FieldErrors {
	errs := FieldErrors{}
	if len(educations) == 0 {
		errs["educations"] = "Minimal 1 riwayat pendidikan wajib diisi."
		return errs
	}

	for i, education := range educations {
		institution := strings.TrimSpace(anyToTrimmedString(education["institution"]))
		degree := strings.TrimSpace(anyToTrimmedString(education["degree"]))
		fieldOfStudy := strings.TrimSpace(anyToTrimmedString(education["field_of_study"]))
		startYear := strings.TrimSpace(anyToTrimmedString(education["start_year"]))
		endYear := strings.TrimSpace(anyToTrimmedString(education["end_year"]))
		gpa := strings.TrimSpace(anyToTrimmedString(education["gpa"]))

		prefix := "educations." + strconv.Itoa(i) + "."
		if institution == "" {
			errs[prefix+"institution"] = "Nama institusi wajib diisi."
		}
		if degree == "" {
			errs[prefix+"degree"] = "Jenjang wajib diisi."
		}
		if fieldOfStudy == "" {
			errs[prefix+"field_of_study"] = "Program studi wajib diisi."
		}
		if startYear == "" {
			errs[prefix+"start_year"] = "Tahun mulai wajib diisi."
		} else if _, ok := toInt(education["start_year"]); !ok {
			errs[prefix+"start_year"] = "Tahun mulai harus berupa angka."
		}
		if endYear == "" {
			errs[prefix+"end_year"] = "Tahun selesai wajib diisi."
		} else if _, ok := toInt(education["end_year"]); !ok {
			errs[prefix+"end_year"] = "Tahun selesai harus berupa angka."
		}
		if requiresEducationGPA(degree) && gpa == "" {
			errs[prefix+"gpa"] = "IPK wajib diisi untuk jenjang ini."
		} else if gpa != "" {
			value, err := strconv.ParseFloat(gpa, 64)
			if err != nil {
				errs[prefix+"gpa"] = "Format IPK tidak valid."
			} else if value < 0 || value > 4 {
				errs[prefix+"gpa"] = "IPK harus antara 0.00 sampai 4.00."
			}
		}
	}

	return errs
}

func validateExperienceRequired(experiences []map[string]any) FieldErrors {
	errs := FieldErrors{}

	for i, experience := range experiences {
		company := strings.TrimSpace(anyToTrimmedString(experience["company"]))
		position := strings.TrimSpace(anyToTrimmedString(experience["position"]))
		start := strings.TrimSpace(anyToTrimmedString(experience["start_date"]))
		end := strings.TrimSpace(anyToTrimmedString(experience["end_date"]))
		description := strings.TrimSpace(anyToTrimmedString(experience["description"]))
		isCurrent, _ := experience["is_current"].(bool)

		prefix := "experiences." + strconv.Itoa(i) + "."
		if company == "" {
			errs[prefix+"company"] = "Nama perusahaan wajib diisi."
		}
		if position == "" {
			errs[prefix+"position"] = "Posisi wajib diisi."
		}
		if start == "" {
			errs[prefix+"start_date"] = "Tanggal mulai wajib diisi."
		}
		if !isCurrent && end == "" {
			errs[prefix+"end_date"] = "Tanggal selesai wajib diisi."
		}
		if description == "" {
			errs[prefix+"description"] = "Deskripsi tugas wajib diisi."
		}
	}

	return errs
}

func validateCertificationRequired(certs []map[string]any) FieldErrors {
	errs := FieldErrors{}

	for i, cert := range certs {
		name := strings.TrimSpace(anyToTrimmedString(cert["name"]))
		organization := strings.TrimSpace(anyToTrimmedString(cert["issuing_organization"]))
		issueDate := strings.TrimSpace(anyToTrimmedString(cert["issue_date"]))
		expiryDate := strings.TrimSpace(anyToTrimmedString(cert["expiry_date"]))

		prefix := "certifications." + strconv.Itoa(i) + "."
		if name == "" {
			errs[prefix+"name"] = "Nama sertifikasi wajib diisi."
		}
		if organization == "" {
			errs[prefix+"issuing_organization"] = "Organisasi penerbit wajib diisi."
		}
		if issueDate == "" {
			errs[prefix+"issue_date"] = "Tanggal terbit wajib diisi."
		}
		if issueDate != "" && !isValidYearMonth(issueDate) {
			errs[prefix+"issue_date"] = "Format tanggal terbit tidak valid (YYYY-MM)."
		}
		if expiryDate != "" && !isValidYearMonth(expiryDate) {
			errs[prefix+"expiry_date"] = "Format tanggal kadaluarsa tidak valid (YYYY-MM)."
		}
		if issueDate != "" && expiryDate != "" && isValidYearMonth(issueDate) && isValidYearMonth(expiryDate) && expiryDate < issueDate {
			errs[prefix+"expiry_date"] = "Tanggal kadaluarsa tidak boleh sebelum tanggal terbit."
		}
	}

	return errs
}

func requiresEducationGPA(degree string) bool {
	normalized := strings.ToUpper(strings.TrimSpace(degree))
	switch normalized {
	case "D3", "D4", "S1", "S2", "S3":
		return true
	default:
		return false
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

func validateExperiencePeriods(experiences []map[string]any) FieldErrors {
	errs := FieldErrors{}

	for i, experience := range experiences {
		start := strings.TrimSpace(anyToTrimmedString(experience["start_date"]))
		end := strings.TrimSpace(anyToTrimmedString(experience["end_date"]))
		isCurrent, _ := experience["is_current"].(bool)

		startField := "experiences." + strconv.Itoa(i) + ".start_date"
		endField := "experiences." + strconv.Itoa(i) + ".end_date"

		if start != "" && !isValidYearMonth(start) {
			errs[startField] = "Format tanggal mulai tidak valid (YYYY-MM)."
		}
		if end != "" && !isValidYearMonth(end) {
			errs[endField] = "Format tanggal selesai tidak valid (YYYY-MM)."
		}

		if isCurrent {
			// Normalize running experience to avoid stale end_date values.
			experience["end_date"] = ""
			continue
		}

		if start != "" && end != "" && isValidYearMonth(start) && isValidYearMonth(end) && end < start {
			errs[endField] = "Tanggal selesai tidak boleh sebelum tanggal mulai."
		}
	}

	return errs
}

func isValidYearMonth(value string) bool {
	if len(value) != len("2006-01") {
		return false
	}
	_, err := time.Parse("2006-01", value)
	return err == nil
}

func anyToTrimmedString(value any) string {
	switch v := value.(type) {
	case string:
		return strings.TrimSpace(v)
	case float64:
		return strings.TrimSpace(strconv.FormatFloat(v, 'f', -1, 64))
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	default:
		return ""
	}
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
	now := time.Now()

	for _, exp := range experiences {
		startValue := strings.TrimSpace(anyToTrimmedString(exp["start_date"]))
		if startValue == "" {
			if startYear, ok := toInt(exp["start_year"]); ok && startYear > 0 {
				startValue = fmt.Sprintf("%04d-01", startYear)
			}
		}
		if !isValidYearMonth(startValue) {
			continue
		}

		startDate, err := time.Parse("2006-01", startValue)
		if err != nil {
			continue
		}

		endDate := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		if curr, ok := exp["is_current"].(bool); !ok || !curr {
			endValue := strings.TrimSpace(anyToTrimmedString(exp["end_date"]))
			if endValue == "" {
				if endYear, ok := toInt(exp["end_year"]); ok && endYear > 0 {
					endValue = fmt.Sprintf("%04d-12", endYear)
				}
			}
			if isValidYearMonth(endValue) {
				if parsedEndDate, parseErr := time.Parse("2006-01", endValue); parseErr == nil {
					endDate = parsedEndDate
				}
			}
		}

		months := (endDate.Year()-startDate.Year())*12 + int(endDate.Month()-startDate.Month()) + 1
		if months > 0 {
			totalMonths += months
		}
	}

	return float64(totalMonths) / 12.0
}

func expectedAgeText(minAge, maxAge int) string {
	if minAge > 0 && maxAge > 0 {
		return fmt.Sprintf("%d - %d tahun", minAge, maxAge)
	}
	if minAge > 0 {
		return fmt.Sprintf("Minimal %d tahun", minAge)
	}
	if maxAge > 0 {
		return fmt.Sprintf("Maksimal %d tahun", maxAge)
	}
	return "Tidak ada batas usia"
}

func divisionSummaries(db *sqlx.DB) []map[string]any {
	profiles, err := services.EnsureDivisionProfiles(db)
	if err != nil {
		return []map[string]any{}
	}

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
