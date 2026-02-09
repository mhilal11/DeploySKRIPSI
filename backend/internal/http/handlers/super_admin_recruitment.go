package handlers

import (
	"encoding/json"
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

func SuperAdminRecruitmentIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	apps := []models.Application{}
	_ = db.Select(&apps, "SELECT * FROM applications ORDER BY submitted_at DESC")

	// preload profiles
	profileByUser := map[int64]*models.ApplicantProfile{}
	for _, app := range apps {
		if app.UserID != nil {
			if _, ok := profileByUser[*app.UserID]; !ok {
				profile := getApplicantProfile(db, *app.UserID)
				if profile != nil {
					profileByUser[*app.UserID] = profile
				}
			}
		}
	}

	applications := make([]map[string]any, 0, len(apps))
	interviews := make([]map[string]any, 0)
	onboarding := make([]map[string]any, 0)

	for _, app := range apps {
		var profile *models.ApplicantProfile
		if app.UserID != nil {
			profile = profileByUser[*app.UserID]
		}

		interviewTime := trimTime(app.InterviewTime)
		interviewEndTime := trimTime(app.InterviewEndTime)
		hasInterview := app.InterviewDate != nil || interviewTime != nil || app.InterviewMode != nil

		profileFullName := app.FullName
		profileEmail := app.Email
		profilePhone := app.Phone
		var profileAddress, profileCity, profileProvince, profileGender, profileReligion *string
		var profileDOB *time.Time
		educations := []map[string]any{}
		experiences := []map[string]any{}
		certifications := []map[string]any{}
		if profile != nil {
			if profile.FullName != nil {
				profileFullName = *profile.FullName
			}
			if profile.Email != nil {
				profileEmail = *profile.Email
			}
			if profile.Phone != nil {
				profilePhone = profile.Phone
			}
			profileAddress = profile.Address
			profileCity = profile.City
			profileProvince = profile.Province
			profileGender = profile.Gender
			profileReligion = profile.Religion
			profileDOB = profile.DateOfBirth
			educations = decodeJSONArray(profile.Educations)
			experiences = decodeJSONArray(profile.Experiences)
			certifications = formatCertifications(c, decodeJSONArray(profile.Certifications))
		}

		educationSummary := summarizeEducation(educations)
		experienceSummary := summarizeExperience(experiences)

		applications = append(applications, map[string]any{
			"id":                     app.ID,
			"name":                   profileFullName,
			"position":               app.Position,
			"education":              chooseString(educationSummary, app.Education),
			"experience":             chooseString(experienceSummary, app.Experience),
			"profile_name":           profileFullName,
			"profile_email":          profileEmail,
			"profile_phone":          profilePhone,
			"profile_address":        profileAddress,
			"profile_city":           profileCity,
			"profile_province":       profileProvince,
			"profile_gender":         profileGender,
			"profile_religion":       profileReligion,
			"profile_date_of_birth":  formatDateISO(profileDOB),
			"educations":             educations,
			"experiences":            experiences,
			"certifications":         certifications,
			"interview_date":         formatDateISO(app.InterviewDate),
			"interview_time":         interviewTime,
			"interview_mode":         app.InterviewMode,
			"interviewer_name":       app.InterviewerName,
			"meeting_link":           app.MeetingLink,
			"interview_notes":        app.InterviewNotes,
			"interview_end_time":     interviewEndTime,
			"has_interview_schedule": hasInterview,
			"status":                 app.Status,
			"date":                   formatDate(app.SubmittedAt),
			"submitted_date":         formatDateISO(app.SubmittedAt),
			"email":                  app.Email,
			"phone":                  app.Phone,
			"skills":                 app.Skills,
			"cv_file":                app.CvFile,
			"cv_url":                 attachmentURL(c, app.CvFile),
			"profile_photo_url": func() any {
				if profile != nil {
					return attachmentURL(c, profile.ProfilePhotoPath)
				}
				return nil
			}(),
			"rejection_reason": app.RejectionReason,
		})

		if app.Status == "Interview" {
			endTime := interviewEndTime
			if endTime == nil && interviewTime != nil {
				if t, err := time.Parse("15:04", *interviewTime); err == nil {
					t2 := t.Add(30 * time.Minute)
					endStr := t2.Format("15:04")
					endTime = &endStr
				}
			}
			interviews = append(interviews, map[string]any{
				"application_id": app.ID,
				"candidate":      app.FullName,
				"position":       app.Position,
				"date":           formatDate(app.InterviewDate),
				"date_value":     formatDateISO(app.InterviewDate),
				"time":           firstString(interviewTime, "-"),
				"end_time":       endTime,
				"mode":           firstString(app.InterviewMode, "-"),
				"interviewer":    firstString(app.InterviewerName, "-"),
				"meeting_link":   app.MeetingLink,
			})
		}

		if app.Status == "Hired" {
			checklist := loadChecklist(db, app.ID)
			contractDone := checklist.ContractSigned
			inventoryDone := checklist.InventoryHandover
			trainingDone := checklist.TrainingOrientation
			allComplete := contractDone && inventoryDone && trainingDone

			onboarding = append(onboarding, map[string]any{
				"application_id": app.ID,
				"name":           app.FullName,
				"position":       app.Position,
				"startedAt":      formatDate(app.SubmittedAt),
				"status": func() string {
					if allComplete {
						return "Selesai"
					}
					return "In Progress"
				}(),
				"is_staff": isUserStaff(db, app.UserID),
				"steps": []map[string]any{
					{"label": "Kontrak ditandatangani", "complete": contractDone},
					{"label": "Serah terima inventaris", "complete": inventoryDone, "pending": !inventoryDone && contractDone},
					{"label": "Training & orientasi", "complete": trainingDone, "pending": !trainingDone && inventoryDone},
				},
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"applications":         applications,
		"statusOptions":        models.ApplicationStatuses,
		"interviews":           interviews,
		"onboarding":           onboarding,
		"sidebarNotifications": computeSuperAdminSidebarNotifications(db),
	})
}

func SuperAdminRecruitmentUpdateStatus(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	status := strings.TrimSpace(c.PostForm("status"))
	rejection := strings.TrimSpace(c.PostForm("rejection_reason"))

	if status == "" || rejection == "" {
		var payload map[string]any
		if err := c.ShouldBindJSON(&payload); err == nil {
			if status == "" {
				if raw, ok := payload["status"].(string); ok {
					status = strings.TrimSpace(raw)
				}
			}
			if rejection == "" {
				if raw, ok := payload["rejection_reason"].(string); ok {
					rejection = strings.TrimSpace(raw)
				}
			}
		}
	}

	if status == "" {
		ValidationErrors(c, FieldErrors{"status": "Status wajib diisi."})
		return
	}

	if !isValidApplicationStatus(status) {
		ValidationErrors(c, FieldErrors{"status": "Status tidak valid."})
		return
	}

	db := middleware.GetDB(c)
	now := time.Now()

	updateFields := []string{"status = ?", "updated_at = ?"}
	args := []any{status, now}

	switch status {
	case "Screening":
		updateFields = append(updateFields, "screening_at = IFNULL(screening_at, ?)")
		args = append(args, now)
	case "Interview":
		updateFields = append(updateFields, "interview_at = IFNULL(interview_at, ?)")
		args = append(args, now)
	case "Offering":
		updateFields = append(updateFields, "offering_at = IFNULL(offering_at, ?)")
		args = append(args, now)
	case "Hired":
		updateFields = append(updateFields, "hired_at = IFNULL(hired_at, ?)")
		args = append(args, now)
	case "Rejected":
		if rejection == "" {
			ValidationErrors(c, FieldErrors{"rejection_reason": "Alasan penolakan wajib diisi."})
			return
		}
		updateFields = append(updateFields, "rejection_reason = ?", "rejected_at = ?")
		args = append(args, rejection, now)
	}

	if status != "Rejected" {
		updateFields = append(updateFields, "rejection_reason = NULL")
	}

	args = append(args, id)
	query := "UPDATE applications SET " + strings.Join(updateFields, ", ") + " WHERE id = ?"
	_, _ = db.Exec(query, args...)

	c.JSON(http.StatusOK, gin.H{"status": "Status pelamar berhasil diperbarui."})
}

func SuperAdminRecruitmentReject(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	rejection := strings.TrimSpace(c.PostForm("rejection_reason"))
	if rejection == "" {
		var payload map[string]any
		if err := c.ShouldBindJSON(&payload); err == nil {
			if raw, ok := payload["rejection_reason"].(string); ok {
				rejection = strings.TrimSpace(raw)
			}
		}
	}
	if rejection == "" {
		ValidationErrors(c, FieldErrors{"rejection_reason": "Alasan penolakan wajib diisi."})
		return
	}

	db := middleware.GetDB(c)
	_, _ = db.Exec("UPDATE applications SET status = 'Rejected', rejection_reason = ?, rejected_at = ?, updated_at = ? WHERE id = ?", rejection, time.Now(), time.Now(), id)

	c.JSON(http.StatusOK, gin.H{"status": "Pelamar berhasil ditolak."})
}

func SuperAdminRecruitmentScheduleInterview(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	date := c.PostForm("date")
	timeStart := c.PostForm("time")
	timeEnd := c.PostForm("end_time")
	mode := c.PostForm("mode")
	interviewer := c.PostForm("interviewer")
	meetingLink := c.PostForm("meeting_link")
	notes := c.PostForm("notes")

	if date == "" || timeStart == "" || timeEnd == "" || mode == "" || interviewer == "" {
		ValidationErrors(c, FieldErrors{"date": "Tanggal, waktu, mode, interviewer wajib diisi."})
		return
	}

	dateVal, err := time.Parse("2006-01-02", date)
	if err != nil {
		ValidationErrors(c, FieldErrors{"date": "Format tanggal tidak valid."})
		return
	}
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	if dateVal.Before(today) {
		ValidationErrors(c, FieldErrors{"date": "Tanggal interview tidak boleh di masa lalu."})
		return
	}

	startTime, err := time.Parse("15:04", timeStart)
	if err != nil {
		ValidationErrors(c, FieldErrors{"time": "Format waktu mulai tidak valid."})
		return
	}
	endTime, err := time.Parse("15:04", timeEnd)
	if err != nil {
		ValidationErrors(c, FieldErrors{"end_time": "Format waktu selesai tidak valid."})
		return
	}
	if !endTime.After(startTime) {
		ValidationErrors(c, FieldErrors{"end_time": "Waktu selesai harus lebih besar dari waktu mulai."})
		return
	}

	if mode != "Online" && mode != "Offline" {
		ValidationErrors(c, FieldErrors{"mode": "Mode interview harus Online atau Offline."})
		return
	}

	if mode == "Online" && meetingLink == "" {
		ValidationErrors(c, FieldErrors{"meeting_link": "Link meeting wajib diisi untuk interview Online."})
		return
	}

	if conflictInterview(middleware.GetDB(c), id, date, timeStart, timeEnd) {
		ValidationErrors(c, FieldErrors{"time": "Slot waktu ini sudah digunakan untuk interview lain pada tanggal tersebut."})
		return
	}

	db := middleware.GetDB(c)
	_, _ = db.Exec(`UPDATE applications SET interview_date=?, interview_time=?, interview_end_time=?, interview_mode=?, interviewer_name=?, meeting_link=?, interview_notes=?, interview_at=?, status='Interview', updated_at=? WHERE id = ?`,
		date, timeStart, timeEnd, mode, interviewer, meetingLink, notes, time.Now(), time.Now(), id)

	c.JSON(http.StatusOK, gin.H{"status": "Jadwal interview berhasil disimpan."})
}

func SuperAdminRecruitmentDelete(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	db := middleware.GetDB(c)
	_, _ = db.Exec("DELETE FROM applications WHERE id = ?", id)
	c.JSON(http.StatusOK, gin.H{"status": "Lamaran berhasil dihapus."})
}

func SuperAdminOnboardingUpdateChecklist(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	contract := c.PostForm("contract_signed")
	inventory := c.PostForm("inventory_handover")
	training := c.PostForm("training_orientation")

	db := middleware.GetDB(c)

	_, err := db.Exec(`INSERT INTO onboarding_checklists (application_id, contract_signed, inventory_handover, training_orientation, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE contract_signed=VALUES(contract_signed), inventory_handover=VALUES(inventory_handover), training_orientation=VALUES(training_orientation), updated_at=NOW()`,
		id, parseBool(contract), parseBool(inventory), parseBool(training))
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal memperbarui checklist")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "Progress onboarding berhasil disimpan."})
}

func SuperAdminOnboardingConvertToStaff(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	db := middleware.GetDB(c)

	var app models.Application
	if err := db.Get(&app, "SELECT * FROM applications WHERE id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "Lamaran tidak ditemukan")
		return
	}

	if app.Status != "Hired" {
		ValidationErrors(c, FieldErrors{"message": "Hanya pelamar dengan status Hired yang dapat dijadikan staff."})
		return
	}

	if app.UserID == nil {
		JSONError(c, http.StatusNotFound, "User tidak ditemukan.")
		return
	}

	var userModel models.User
	if err := db.Get(&userModel, "SELECT * FROM users WHERE id = ?", *app.UserID); err != nil {
		JSONError(c, http.StatusNotFound, "User tidak ditemukan.")
		return
	}

	if userModel.Role == models.RoleStaff {
		c.JSON(http.StatusOK, gin.H{"status": "User sudah menjadi staff."})
		return
	}

	employeeCode, _ := services.GenerateEmployeeCode(db, models.RoleStaff)
	_, _ = db.Exec("UPDATE users SET role = ?, employee_code = ?, division = ? WHERE id = ?", models.RoleStaff, employeeCode, app.Division, userModel.ID)

	profile := getApplicantProfile(db, userModel.ID)
	if profile != nil {
		educationLevel := "Lainnya"
		educations := decodeJSONArray(profile.Educations)
		if len(educations) > 0 {
			if degree, ok := educations[0]["degree"].(string); ok && degree != "" {
				educationLevel = degree
			}
		}
		_, _ = db.Exec(`INSERT INTO staff_profiles (user_id, religion, gender, education_level, created_at, updated_at)
            VALUES (?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE religion=VALUES(religion), gender=VALUES(gender), education_level=VALUES(education_level), updated_at=NOW()`,
			userModel.ID, profile.Religion, profile.Gender, educationLevel)
	}

	c.JSON(http.StatusOK, gin.H{"status": "Akun berhasil diubah menjadi Staff."})
}

// helpers
func trimTime(value *string) *string {
	if value == nil {
		return nil
	}
	v := *value
	if len(v) >= 5 {
		v = v[:5]
	}
	return &v
}

func summarizeEducation(educations []map[string]any) *string {
	if len(educations) == 0 {
		return nil
	}
	edu := educations[0]
	parts := []string{}
	if v, ok := edu["degree"].(string); ok && v != "" {
		parts = append(parts, v)
	}
	if v, ok := edu["field_of_study"].(string); ok && v != "" {
		parts = append(parts, v)
	}
	if v, ok := edu["institution"].(string); ok && v != "" {
		parts = append(parts, v)
	}
	if len(parts) == 0 {
		return nil
	}
	s := strings.Join(parts, " - ")
	return &s
}

func summarizeExperience(experiences []map[string]any) *string {
	if len(experiences) == 0 {
		return nil
	}
	exp := experiences[0]
	parts := []string{}
	if v, ok := exp["position"].(string); ok && v != "" {
		parts = append(parts, v)
	}
	if v, ok := exp["company"].(string); ok && v != "" {
		parts = append(parts, v)
	}
	if len(parts) == 0 {
		return nil
	}
	s := strings.Join(parts, " @ ")
	return &s
}

func chooseString(primary *string, fallback *string) string {
	if primary != nil && *primary != "" {
		return *primary
	}
	if fallback != nil {
		return *fallback
	}
	return ""
}

func loadChecklist(db *sqlx.DB, applicationID int64) models.OnboardingChecklist {
	var checklist models.OnboardingChecklist
	err := db.Get(&checklist, "SELECT * FROM onboarding_checklists WHERE application_id = ?", applicationID)
	if err != nil {
		return models.OnboardingChecklist{ApplicationID: applicationID}
	}
	return checklist
}

func isUserStaff(db *sqlx.DB, userID *int64) bool {
	if userID == nil {
		return false
	}
	var role string
	_ = db.Get(&role, "SELECT role FROM users WHERE id = ?", *userID)
	return role == models.RoleStaff
}

func conflictInterview(db *sqlx.DB, currentID, date, start, end string) bool {
	rows := []models.Application{}
	_ = db.Select(&rows, "SELECT * FROM applications WHERE id != ? AND interview_date = ? AND interview_time IS NOT NULL", currentID, date)
	startTime, err := time.Parse("15:04", start)
	if err != nil {
		return false
	}
	endTime, err := time.Parse("15:04", end)
	if err != nil {
		return false
	}

	for _, app := range rows {
		if app.InterviewTime == nil {
			continue
		}
		startVal := trimTime(app.InterviewTime)
		if startVal == nil {
			continue
		}
		otherStart, err := time.Parse("15:04", *startVal)
		if err != nil {
			continue
		}
		otherEnd := otherStart.Add(30 * time.Minute)
		if app.InterviewEndTime != nil {
			endVal := trimTime(app.InterviewEndTime)
			if endVal != nil {
				if t, err := time.Parse("15:04", *endVal); err == nil {
					otherEnd = t
				}
			}
		}
		if otherStart.Before(endTime) && otherEnd.After(startTime) {
			return true
		}
	}
	return false
}

func parseBool(value string) int {
	if value == "true" || value == "1" {
		return 1
	}
	return 0
}

func isValidApplicationStatus(status string) bool {
	for _, s := range models.ApplicationStatuses {
		if s == status {
			return true
		}
	}
	return false
}

// satisfy unused
var _ = json.RawMessage{}
var _ = strconv.Itoa
