package pelamar

import (
	"hris-backend/internal/http/handlers"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"
	"hris-backend/internal/services"
	"net/http"
	"strconv"
	"strings"
	"time"

	"encoding/json"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func PelamarApplicationsIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RolePelamar {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	pagination := handlers.ParsePagination(c, 20, 100)
	profile := getOrCreateApplicantProfile(db, user)
	if !isProfileComplete(profile) {
		c.JSON(http.StatusOK, gin.H{
			"redirect_to":      "/pelamar/profil",
			"profile_reminder": "Lengkapi data pribadi dan pendidikan Anda sebelum mengakses halaman lamaran.",
		})
		return
	}

	apps, _ := dbrepo.ListApplicationsByUserIDPaged(db, user.ID, pagination.Limit, pagination.Offset)
	totalApplications, _ := dbrepo.CountApplicationsByUserID(db, user.ID)
	applications := make([]map[string]any, 0, len(apps))
	for _, app := range apps {
		applications = append(applications, map[string]any{
			"id":           app.ID,
			"position":     app.Position,
			"division":     app.Division,
			"status":       app.Status,
			"submitted_at": handlers.FormatDate(app.SubmittedAt),
			"notes":        app.Notes,
		})
	}

	divisions := divisionSummaries(db)

	c.JSON(http.StatusOK, gin.H{
		"applications": applications,
		"defaultForm": gin.H{
			"full_name": handlers.FirstString(profile.FullName, user.Name),
			"email":     handlers.FirstString(profile.Email, user.Email),
			"phone":     handlers.FirstString(profile.Phone, ""),
		},
		"divisions": divisions,
		"pagination": handlers.BuildPaginationMeta(
			pagination.Page,
			pagination.Limit,
			totalApplications,
		),
		"flash": gin.H{
			"success": "",
			"error":   "",
		},
	})
}

func PelamarApplicationsStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RolePelamar {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	profile := getOrCreateApplicantProfile(db, user)
	if !isProfileComplete(profile) {
		handlers.ValidationErrors(c, handlers.FieldErrors{"message": "Lengkapi profil Anda sebelum mengirim lamaran."})
		return
	}

	divisionID := c.PostForm("division_id")
	fullName := handlers.NormalizePersonName(c.PostForm("full_name"))
	email := handlers.NormalizeEmail(c.PostForm("email"))
	phone := normalizePhoneNumber(c.PostForm("phone"))
	skills := strings.TrimSpace(c.PostForm("skills"))

	validationErrors := handlers.FieldErrors{}
	if divisionID == "" {
		validationErrors["division_id"] = "Divisi wajib diisi."
	}
	if fullName == "" {
		validationErrors["full_name"] = "Nama wajib diisi."
	}
	if email == "" {
		validationErrors["email"] = "Email wajib diisi."
	}
	if skills == "" {
		validationErrors["skills"] = "Keahlian wajib diisi."
	}
	handlers.ValidateFieldLength(validationErrors, "full_name", "Nama", fullName, 255)
	handlers.ValidatePersonName(validationErrors, "full_name", "Nama", fullName)
	handlers.ValidateFieldLength(validationErrors, "email", "Email", email, 254)
	handlers.ValidateFieldLength(validationErrors, "phone", "Nomor telepon", phone, 20)
	handlers.ValidateFieldLength(validationErrors, "skills", "Keahlian", skills, 2000)
	handlers.ValidateEmail(validationErrors, "email", email)
	if phone == "" || !isValidPhoneNumber(phone) {
		validationErrors["phone"] = "Nomor telepon harus berisi 8-15 digit yang valid."
	}
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	divisionIDInt, err := strconv.ParseInt(divisionID, 10, 64)
	if err != nil || divisionIDInt <= 0 {
		handlers.ValidationErrors(c, handlers.FieldErrors{"division_id": "Divisi tidak ditemukan."})
		return
	}

	division, err := dbrepo.GetDivisionProfileByID(db, divisionIDInt)
	if err != nil || division == nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"division_id": "Divisi tidak ditemukan."})
		return
	}
	if !division.IsHiring || division.JobTitle == nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"division_id": "Divisi ini tidak sedang membuka lowongan."})
		return
	}

	existing, _ := dbrepo.CountApplicationsByUserDivisionPosition(db, user.ID, division.Name, *division.JobTitle)
	if existing > 0 {
		handlers.ValidationErrors(c, handlers.FieldErrors{"division_id": "Anda sudah melamar untuk posisi ini."})
		return
	}

	cvPath, _, err := handlers.SaveValidatedUploadedFile(c, "cv", "applications/cv", handlers.PDFUploadRules())
	if err != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"cv": "CV harus berupa PDF dengan ukuran maksimal 5MB."})
		return
	}

	now := time.Now()
	applicationID, err := dbrepo.InsertApplication(db, dbrepo.ApplicationCreateInput{
		UserID:      user.ID,
		FullName:    fullName,
		Email:       email,
		Phone:       phone,
		Skills:      skills,
		Division:    division.Name,
		Position:    *division.JobTitle,
		CVFile:      cvPath,
		SubmittedAt: now,
		CreatedAt:   now,
		UpdatedAt:   now,
	})
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal mengirim lamaran")
		return
	}
	if applicationID > 0 {
		triggerRecruitmentAIScreening(db, middleware.GetConfig(c), applicationID, user.ID)
	}

	c.JSON(http.StatusOK, gin.H{"status": "Lamaran Anda berhasil dikirim."})
}

func PelamarCheckEligibility(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RolePelamar {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	divisionID := c.PostForm("division_id")
	if divisionID == "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"division_id": "Divisi wajib diisi."})
		return
	}

	divisionIDInt, err := strconv.ParseInt(divisionID, 10, 64)
	if err != nil || divisionIDInt <= 0 {
		handlers.ValidationErrors(c, handlers.FieldErrors{"division_id": "Divisi tidak ditemukan."})
		return
	}

	division, err := dbrepo.GetDivisionProfileByID(db, divisionIDInt)
	if err != nil || division == nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"division_id": "Divisi tidak ditemukan."})
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

func divisionSummaries(db *sqlx.DB) []map[string]any {
	profiles, err := services.EnsureDivisionProfiles(db)
	if err != nil {
		return []map[string]any{}
	}

	result := []map[string]any{}
	for _, profile := range profiles {
		currentStaff, _ := dbrepo.CountUsersByDivisionAndRoles(db, profile.Name, models.RoleAdmin, models.RoleStaff)
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
