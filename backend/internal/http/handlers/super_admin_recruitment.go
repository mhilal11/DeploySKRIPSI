package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"sort"
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
	slaSettings := loadRecruitmentSLASettings(db)
	now := time.Now()
	slaOverview := map[string]any{
		"active_applications": 0,
		"on_track_count":      0,
		"warning_count":       0,
		"overdue_count":       0,
		"compliance_rate":     100.0,
	}
	slaReminders := make([]map[string]any, 0)

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
	scoreByApplicationID := buildRecruitmentScoreIndex(db, apps, profileByUser)
	scoringAudits := loadRecruitmentScoringAudits(db, 25)

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
		recruitmentScore, hasRecruitmentScore := scoreByApplicationID[app.ID]
		var slaIndicator map[string]any
		if isRecruitmentSLAStage(app.Status) {
			startAt := applicationStageStartedAt(app)
			if startAt != nil {
				targetDays := slaSettings[app.Status]
				if targetDays < 1 {
					targetDays = defaultRecruitmentSLASettings()[app.Status]
				}
				daysInStage := calculateElapsedDays(*startAt, now)
				dueAt := startAt.AddDate(0, 0, targetDays)
				remainingDays := calculateRemainingDays(dueAt, now)
				overdueDays := 0
				slaState := "on_track"
				if dueAt.Before(now) {
					overdueDays = calculateElapsedDays(dueAt, now)
					if overdueDays < 1 {
						overdueDays = 1
					}
					slaState = "overdue"
				} else if remainingDays <= 1 {
					slaState = "warning"
				}

				slaIndicator = map[string]any{
					"stage":          app.Status,
					"target_days":    targetDays,
					"days_in_stage":  daysInStage,
					"due_date":       dueAt.Format("2006-01-02"),
					"remaining_days": remainingDays,
					"overdue_days":   overdueDays,
					"state":          slaState,
					"is_overdue":     slaState == "overdue",
				}

				slaOverview["active_applications"] = slaOverview["active_applications"].(int) + 1
				switch slaState {
				case "overdue":
					slaOverview["overdue_count"] = slaOverview["overdue_count"].(int) + 1
				case "warning":
					slaOverview["warning_count"] = slaOverview["warning_count"].(int) + 1
				default:
					slaOverview["on_track_count"] = slaOverview["on_track_count"].(int) + 1
				}

				if slaState == "overdue" || slaState == "warning" {
					slaReminders = append(slaReminders, map[string]any{
						"application_id": app.ID,
						"name":           profileFullName,
						"position":       app.Position,
						"division":       app.Division,
						"stage":          app.Status,
						"days_in_stage":  daysInStage,
						"target_days":    targetDays,
						"due_date":       dueAt.Format("2006-01-02"),
						"remaining_days": remainingDays,
						"overdue_days":   overdueDays,
						"state":          slaState,
					})
				}
			}
		}

		applications = append(applications, map[string]any{
			"id":                     app.ID,
			"name":                   profileFullName,
			"division":               app.Division,
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
			"cv_url":                 superAdminRecruitmentCVURL(c, app.ID, app.CvFile),
			"profile_photo_url": func() any {
				if profile != nil {
					return attachmentURL(c, profile.ProfilePhotoPath)
				}
				return nil
			}(),
			"rejection_reason": app.RejectionReason,
			"recruitment_score": func() any {
				if hasRecruitmentScore {
					return recruitmentScore
				}
				return nil
			}(),
			"sla": slaIndicator,
		})

		if hasInterview {
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
				"status":         app.Status,
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

	activeSLA := slaOverview["active_applications"].(int)
	if activeSLA > 0 {
		overdue := slaOverview["overdue_count"].(int)
		slaOverview["compliance_rate"] = float64(activeSLA-overdue) / float64(activeSLA) * 100
	}
	sort.SliceStable(slaReminders, func(i, j int) bool {
		left := slaReminders[i]
		right := slaReminders[j]
		leftState, _ := left["state"].(string)
		rightState, _ := right["state"].(string)
		if leftState != rightState {
			return leftState == "overdue"
		}
		leftOverdue, _ := left["overdue_days"].(int)
		rightOverdue, _ := right["overdue_days"].(int)
		if leftOverdue != rightOverdue {
			return leftOverdue > rightOverdue
		}
		leftRemain, _ := left["remaining_days"].(int)
		rightRemain, _ := right["remaining_days"].(int)
		return leftRemain < rightRemain
	})
	if len(slaReminders) > 12 {
		slaReminders = slaReminders[:12]
	}

	c.JSON(http.StatusOK, gin.H{
		"applications":         applications,
		"statusOptions":        models.ApplicationStatuses,
		"interviews":           interviews,
		"onboarding":           onboarding,
		"slaSettings":          slaSettings,
		"slaOverview":          slaOverview,
		"slaReminders":         slaReminders,
		"scoringAudits":        scoringAudits,
		"sidebarNotifications": computeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func SuperAdminRecruitmentAnalyticsIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	scoringAudits := loadRecruitmentScoringAudits(db, 25)

	c.JSON(http.StatusOK, gin.H{
		"scoringAudits":        scoringAudits,
		"sidebarNotifications": computeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func SuperAdminRecruitmentUpdateSLASettings(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	defaults := defaultRecruitmentSLASettings()
	payload := map[string]int{
		"Applied":   defaults["Applied"],
		"Screening": defaults["Screening"],
		"Interview": defaults["Interview"],
		"Offering":  defaults["Offering"],
	}

	stageAliases := map[string]string{
		"applied":        "Applied",
		"applied_days":   "Applied",
		"screening":      "Screening",
		"screening_days": "Screening",
		"interview":      "Interview",
		"interview_days": "Interview",
		"offering":       "Offering",
		"offering_days":  "Offering",
	}

	for formKey, stage := range stageAliases {
		raw := strings.TrimSpace(c.PostForm(formKey))
		if raw == "" {
			continue
		}
		value, err := strconv.Atoi(raw)
		if err != nil {
			ValidationErrors(c, FieldErrors{strings.ToLower(stage): "Nilai SLA harus berupa angka."})
			return
		}
		payload[stage] = value
	}

	var jsonPayload map[string]any
	if err := c.ShouldBindJSON(&jsonPayload); err == nil {
		for key, value := range jsonPayload {
			stage, ok := stageAliases[strings.ToLower(strings.TrimSpace(key))]
			if !ok {
				continue
			}
			intValue, hasValue := toInt(value)
			if !hasValue {
				ValidationErrors(c, FieldErrors{strings.ToLower(stage): "Nilai SLA harus berupa angka."})
				return
			}
			payload[stage] = intValue
		}
	}

	errs := FieldErrors{}
	for _, stage := range []string{"Applied", "Screening", "Interview", "Offering"} {
		value := payload[stage]
		if value < 1 || value > 30 {
			errs[strings.ToLower(stage)] = "SLA harus antara 1 sampai 30 hari."
		}
	}
	if len(errs) > 0 {
		ValidationErrors(c, errs)
		return
	}

	db := middleware.GetDB(c)
	previousSettings := loadRecruitmentSLASettings(db)
	now := time.Now()
	for stage, target := range payload {
		_, err := db.Exec(`
			INSERT INTO recruitment_sla_settings (stage, target_days, created_at, updated_at)
			VALUES (?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE target_days = VALUES(target_days), updated_at = VALUES(updated_at)
		`, stage, target, now, now)
		if err != nil {
			JSONError(c, http.StatusInternalServerError, "Gagal menyimpan SLA. Pastikan migrasi terbaru sudah dijalankan.")
			return
		}
	}

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Recruitment",
		Action:      "UPDATE_SLA_SETTINGS",
		EntityType:  "recruitment_sla_settings",
		EntityID:    "global",
		Description: "Memperbarui konfigurasi SLA recruitment.",
		OldValues:   previousSettings,
		NewValues:   payload,
	})

	c.JSON(http.StatusOK, gin.H{
		"status":   "SLA recruitment berhasil diperbarui.",
		"settings": payload,
	})
}

func SuperAdminRecruitmentViewCV(c *gin.Context) {
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
	if app.CvFile == nil || strings.TrimSpace(*app.CvFile) == "" {
		JSONError(c, http.StatusNotFound, "File CV tidak tersedia")
		return
	}

	normalized := normalizeAttachmentPath(*app.CvFile)
	if normalized == "" {
		JSONError(c, http.StatusNotFound, "Path file CV tidak valid")
		return
	}

	storagePath := middleware.GetConfig(c).StoragePath
	absPath, ok := resolveStorageFilePath(storagePath, normalized)
	if !ok {
		JSONError(c, http.StatusNotFound, "File CV tidak ditemukan pada storage")
		return
	}

	filename := filepath.Base(filepath.FromSlash(normalized))
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
	c.File(absPath)
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

	var previousState struct {
		ID              int64   `db:"id"`
		Status          string  `db:"status"`
		RejectionReason *string `db:"rejection_reason"`
		Position        string  `db:"position"`
		Division        *string `db:"division"`
	}
	if err := db.Get(&previousState, "SELECT id, status, rejection_reason, position, division FROM applications WHERE id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "Lamaran tidak ditemukan")
		return
	}

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

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Recruitment",
		Action:      "UPDATE_APPLICATION_STATUS",
		EntityType:  "application",
		EntityID:    id,
		Description: "Memperbarui status pelamar pada proses recruitment.",
		OldValues: map[string]any{
			"status":           previousState.Status,
			"rejection_reason": previousState.RejectionReason,
			"position":         previousState.Position,
			"division":         previousState.Division,
		},
		NewValues: map[string]any{
			"status":           status,
			"rejection_reason": nullIfBlank(rejection),
			"position":         previousState.Position,
			"division":         previousState.Division,
		},
	})

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
	var previousState struct {
		Status          string  `db:"status"`
		RejectionReason *string `db:"rejection_reason"`
	}
	if err := db.Get(&previousState, "SELECT status, rejection_reason FROM applications WHERE id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "Lamaran tidak ditemukan")
		return
	}
	_, _ = db.Exec("UPDATE applications SET status = 'Rejected', rejection_reason = ?, rejected_at = ?, updated_at = ? WHERE id = ?", rejection, time.Now(), time.Now(), id)

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Recruitment",
		Action:      "REJECT_APPLICATION",
		EntityType:  "application",
		EntityID:    id,
		Description: "Menolak pelamar pada proses recruitment.",
		OldValues: map[string]any{
			"status":           previousState.Status,
			"rejection_reason": previousState.RejectionReason,
		},
		NewValues: map[string]any{
			"status":           "Rejected",
			"rejection_reason": rejection,
		},
	})

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

	// Frontend mengirim payload JSON lewat axios/inertia,
	// sehingga PostForm bisa kosong jika Content-Type application/json.
	if date == "" || timeStart == "" || timeEnd == "" || mode == "" || interviewer == "" {
		var payload map[string]any
		if err := c.ShouldBindJSON(&payload); err == nil {
			if date == "" {
				if raw, ok := payload["date"].(string); ok {
					date = strings.TrimSpace(raw)
				}
			}
			if timeStart == "" {
				if raw, ok := payload["time"].(string); ok {
					timeStart = strings.TrimSpace(raw)
				}
			}
			if timeEnd == "" {
				if raw, ok := payload["end_time"].(string); ok {
					timeEnd = strings.TrimSpace(raw)
				}
			}
			if mode == "" {
				if raw, ok := payload["mode"].(string); ok {
					mode = strings.TrimSpace(raw)
				}
			}
			if interviewer == "" {
				if raw, ok := payload["interviewer"].(string); ok {
					interviewer = strings.TrimSpace(raw)
				}
			}
			if meetingLink == "" {
				if raw, ok := payload["meeting_link"].(string); ok {
					meetingLink = strings.TrimSpace(raw)
				}
			}
			if notes == "" {
				if raw, ok := payload["notes"].(string); ok {
					notes = strings.TrimSpace(raw)
				}
			}
		}
	}

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
	var previousSchedule struct {
		InterviewDate   *time.Time `db:"interview_date"`
		InterviewTime   *string    `db:"interview_time"`
		InterviewEnd    *string    `db:"interview_end_time"`
		InterviewMode   *string    `db:"interview_mode"`
		InterviewerName *string    `db:"interviewer_name"`
		MeetingLink     *string    `db:"meeting_link"`
		InterviewNotes  *string    `db:"interview_notes"`
	}
	if err := db.Get(&previousSchedule, "SELECT interview_date, interview_time, interview_end_time, interview_mode, interviewer_name, meeting_link, interview_notes FROM applications WHERE id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "Lamaran tidak ditemukan")
		return
	}
	_, _ = db.Exec(`UPDATE applications SET interview_date=?, interview_time=?, interview_end_time=?, interview_mode=?, interviewer_name=?, meeting_link=?, interview_notes=?, interview_at=?, status='Interview', updated_at=? WHERE id = ?`,
		date, timeStart, timeEnd, mode, interviewer, meetingLink, notes, time.Now(), time.Now(), id)

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Recruitment",
		Action:      "SCHEDULE_INTERVIEW",
		EntityType:  "application",
		EntityID:    id,
		Description: "Menjadwalkan atau memperbarui jadwal interview kandidat.",
		OldValues: map[string]any{
			"interview_date":     formatDateISO(previousSchedule.InterviewDate),
			"interview_time":     previousSchedule.InterviewTime,
			"interview_end_time": previousSchedule.InterviewEnd,
			"interview_mode":     previousSchedule.InterviewMode,
			"interviewer_name":   previousSchedule.InterviewerName,
			"meeting_link":       previousSchedule.MeetingLink,
			"interview_notes":    previousSchedule.InterviewNotes,
		},
		NewValues: map[string]any{
			"interview_date":     date,
			"interview_time":     timeStart,
			"interview_end_time": timeEnd,
			"interview_mode":     mode,
			"interviewer_name":   interviewer,
			"meeting_link":       nullIfBlank(meetingLink),
			"interview_notes":    nullIfBlank(notes),
		},
	})

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
	var existing struct {
		ID       int64   `db:"id"`
		FullName string  `db:"full_name"`
		Position string  `db:"position"`
		Division *string `db:"division"`
		Status   string  `db:"status"`
	}
	if err := db.Get(&existing, "SELECT id, full_name, position, division, status FROM applications WHERE id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "Lamaran tidak ditemukan")
		return
	}
	_, _ = db.Exec("DELETE FROM applications WHERE id = ?", id)

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Recruitment",
		Action:      "DELETE_APPLICATION",
		EntityType:  "application",
		EntityID:    id,
		Description: "Menghapus data lamaran kandidat.",
		OldValues: map[string]any{
			"id":       existing.ID,
			"name":     existing.FullName,
			"position": existing.Position,
			"division": existing.Division,
			"status":   existing.Status,
		},
	})
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
	previousChecklist := loadChecklist(db, toInt64(id))

	_, err := db.Exec(`INSERT INTO onboarding_checklists (application_id, contract_signed, inventory_handover, training_orientation, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE contract_signed=VALUES(contract_signed), inventory_handover=VALUES(inventory_handover), training_orientation=VALUES(training_orientation), updated_at=NOW()`,
		id, parseBool(contract), parseBool(inventory), parseBool(training))
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal memperbarui checklist")
		return
	}

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Onboarding",
		Action:      "UPDATE_CHECKLIST",
		EntityType:  "onboarding_checklist",
		EntityID:    id,
		Description: "Memperbarui checklist onboarding kandidat.",
		OldValues: map[string]any{
			"contract_signed":      previousChecklist.ContractSigned,
			"inventory_handover":   previousChecklist.InventoryHandover,
			"training_orientation": previousChecklist.TrainingOrientation,
		},
		NewValues: map[string]any{
			"contract_signed":      parseBool(contract) == 1,
			"inventory_handover":   parseBool(inventory) == 1,
			"training_orientation": parseBool(training) == 1,
		},
	})

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

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Onboarding",
		Action:      "CONVERT_TO_STAFF",
		EntityType:  "user",
		EntityID:    strconv.FormatInt(userModel.ID, 10),
		Description: "Mengubah pelamar hired menjadi staff.",
		OldValues: map[string]any{
			"role":          userModel.Role,
			"employee_code": userModel.EmployeeCode,
		},
		NewValues: map[string]any{
			"role":          models.RoleStaff,
			"employee_code": employeeCode,
			"division":      app.Division,
		},
	})

	c.JSON(http.StatusOK, gin.H{"status": "Akun berhasil diubah menjadi Staff."})
}

func toInt64(value string) int64 {
	parsed, err := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
	if err != nil {
		return 0
	}
	return parsed
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

func defaultRecruitmentSLASettings() map[string]int {
	return map[string]int{
		"Applied":   2,
		"Screening": 3,
		"Interview": 2,
		"Offering":  2,
	}
}

func loadRecruitmentSLASettings(db *sqlx.DB) map[string]int {
	settings := defaultRecruitmentSLASettings()
	rows := []struct {
		Stage      string `db:"stage"`
		TargetDays int    `db:"target_days"`
	}{}
	if err := db.Select(&rows, "SELECT stage, target_days FROM recruitment_sla_settings"); err != nil {
		return settings
	}

	for _, row := range rows {
		stage := strings.TrimSpace(row.Stage)
		if _, ok := settings[stage]; !ok {
			continue
		}
		if row.TargetDays > 0 {
			settings[stage] = row.TargetDays
		}
	}
	return settings
}

func isRecruitmentSLAStage(status string) bool {
	switch status {
	case "Applied", "Screening", "Interview", "Offering":
		return true
	default:
		return false
	}
}

func applicationStageStartedAt(app models.Application) *time.Time {
	switch app.Status {
	case "Applied":
		return app.SubmittedAt
	case "Screening":
		if app.ScreeningAt != nil && !app.ScreeningAt.IsZero() {
			return app.ScreeningAt
		}
		return app.SubmittedAt
	case "Interview":
		if app.InterviewAt != nil && !app.InterviewAt.IsZero() {
			return app.InterviewAt
		}
		if app.ScreeningAt != nil && !app.ScreeningAt.IsZero() {
			return app.ScreeningAt
		}
		return app.SubmittedAt
	case "Offering":
		if app.OfferingAt != nil && !app.OfferingAt.IsZero() {
			return app.OfferingAt
		}
		if app.InterviewAt != nil && !app.InterviewAt.IsZero() {
			return app.InterviewAt
		}
		if app.ScreeningAt != nil && !app.ScreeningAt.IsZero() {
			return app.ScreeningAt
		}
		return app.SubmittedAt
	default:
		return nil
	}
}

func calculateElapsedDays(start, end time.Time) int {
	if end.Before(start) {
		return 0
	}
	return int(end.Sub(start).Hours() / 24)
}

func calculateRemainingDays(dueAt, now time.Time) int {
	if now.After(dueAt) {
		return 0
	}
	return int(dueAt.Sub(now).Hours() / 24)
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

func superAdminRecruitmentCVURL(c *gin.Context, applicationID int64, cvPath *string) *string {
	if cvPath == nil || strings.TrimSpace(*cvPath) == "" {
		return nil
	}
	cfg := middleware.GetConfig(c)
	base := strings.TrimRight(cfg.BaseURL, "/")
	url := fmt.Sprintf("%s/api/super-admin/recruitment/%d/cv", base, applicationID)
	return &url
}

func resolveStorageFilePath(storagePath, relativePath string) (string, bool) {
	cleaned := strings.TrimSpace(strings.ReplaceAll(relativePath, "\\", "/"))
	if cleaned == "" || strings.HasPrefix(cleaned, "http://") || strings.HasPrefix(cleaned, "https://") {
		return "", false
	}

	cleaned = strings.TrimPrefix(cleaned, "/")
	cleaned = path.Clean("/" + cleaned)
	cleaned = strings.TrimPrefix(cleaned, "/")
	if cleaned == "" || strings.HasPrefix(cleaned, "../") {
		return "", false
	}

	addRoot := func(roots []string, candidate string) []string {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			return roots
		}
		for _, existing := range roots {
			if strings.EqualFold(existing, candidate) {
				return roots
			}
		}
		return append(roots, candidate)
	}

	roots := []string{}
	roots = addRoot(roots, storagePath)

	if cwd, err := os.Getwd(); err == nil {
		trimmed := strings.TrimPrefix(storagePath, "./")
		roots = addRoot(roots, filepath.Join(cwd, storagePath))
		roots = addRoot(roots, filepath.Join(cwd, trimmed))
		roots = addRoot(roots, filepath.Join(cwd, "storage"))
		roots = addRoot(roots, filepath.Join(cwd, "backend", "storage"))
	}

	if exe, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exe)
		trimmed := strings.TrimPrefix(storagePath, "./")
		roots = addRoot(roots, filepath.Join(exeDir, trimmed))
		roots = addRoot(roots, filepath.Join(exeDir, "..", "storage"))
		roots = addRoot(roots, filepath.Join(exeDir, "..", "..", "storage"))
	}

	for _, root := range roots {
		candidate := filepath.Clean(filepath.Join(root, filepath.FromSlash(cleaned)))
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			return candidate, true
		}
	}

	return "", false
}

// satisfy unused
var _ = json.RawMessage{}
var _ = strconv.Itoa
