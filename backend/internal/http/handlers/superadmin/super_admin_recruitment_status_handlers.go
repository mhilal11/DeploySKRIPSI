package superadmin

import (
	"fmt"
	"mime"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/http/handlers"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
)

func SuperAdminRecruitmentUpdateSLASettings(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
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
			handlers.ValidationErrors(c, handlers.FieldErrors{strings.ToLower(stage): "Nilai SLA harus berupa angka."})
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
			intValue, hasValue := handlers.ToInt(value)
			if !hasValue {
				handlers.ValidationErrors(c, handlers.FieldErrors{strings.ToLower(stage): "Nilai SLA harus berupa angka."})
				return
			}
			payload[stage] = intValue
		}
	}

	errs := handlers.FieldErrors{}
	for _, stage := range []string{"Applied", "Screening", "Interview", "Offering"} {
		value := payload[stage]
		if value < 1 || value > 30 {
			errs[strings.ToLower(stage)] = "SLA harus antara 1 sampai 30 hari."
		}
	}
	if len(errs) > 0 {
		handlers.ValidationErrors(c, errs)
		return
	}

	db := middleware.GetDB(c)
	previousSettings := loadRecruitmentSLASettings(db)
	now := time.Now()
	for stage, target := range payload {
		if err := dbrepo.UpsertRecruitmentSLASetting(db, stage, target, now); err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal menyimpan SLA. Pastikan migrasi terbaru sudah dijalankan.")
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
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	applicationID := toInt64(id)
	if applicationID <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID lamaran tidak valid")
		return
	}
	db := middleware.GetDB(c)
	app, err := dbrepo.GetApplicationByID(db, applicationID)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat lamaran")
		return
	}
	if app == nil {
		handlers.JSONError(c, http.StatusNotFound, "Lamaran tidak ditemukan")
		return
	}
	if app.CvFile == nil || strings.TrimSpace(*app.CvFile) == "" {
		handlers.JSONError(c, http.StatusNotFound, "File CV tidak tersedia")
		return
	}

	normalized := handlers.NormalizeAttachmentPath(*app.CvFile)
	if normalized == "" {
		handlers.JSONError(c, http.StatusNotFound, "Path file CV tidak valid")
		return
	}

	storagePath := middleware.GetConfig(c).StoragePath
	absPath, ok := resolveStorageFilePath(storagePath, normalized)
	if !ok {
		handlers.JSONError(c, http.StatusNotFound, "File CV tidak ditemukan pada storage")
		return
	}

	content, _, readErr := services.ReadFileMaybeDecrypted(absPath, middleware.GetConfig(c).StorageEncryptionKey)
	if readErr != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal membaca file CV")
		return
	}

	filename := filepath.Base(filepath.FromSlash(normalized))
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
	contentType := mime.TypeByExtension(strings.ToLower(filepath.Ext(filename)))
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	c.Data(http.StatusOK, contentType, content)
}

func SuperAdminRecruitmentUpdateStatus(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
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
		handlers.ValidationErrors(c, handlers.FieldErrors{"status": "Status wajib diisi."})
		return
	}
	validationErrors := handlers.FieldErrors{}
	handlers.ValidateFieldLength(validationErrors, "status", "Status", status, 30)
	handlers.ValidateFieldLength(validationErrors, "rejection_reason", "Alasan penolakan", rejection, 3000)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	if !isValidApplicationStatus(status) {
		handlers.ValidationErrors(c, handlers.FieldErrors{"status": "Status tidak valid."})
		return
	}

	db := middleware.GetDB(c)
	applicationID := toInt64(id)
	if applicationID <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID lamaran tidak valid")
		return
	}
	now := time.Now()

	previousState, err := dbrepo.GetRecruitmentApplicationStatusState(db, applicationID)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat data lamaran")
		return
	}
	if previousState == nil {
		handlers.JSONError(c, http.StatusNotFound, "Lamaran tidak ditemukan")
		return
	}

	if status == "Rejected" && rejection == "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"rejection_reason": "Alasan penolakan wajib diisi."})
		return
	}
	if err := dbrepo.UpdateRecruitmentApplicationStatus(db, applicationID, status, rejection, now); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui status lamaran")
		return
	}

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

	c.JSON(http.StatusOK, gin.H{
		"status":               "Status pelamar berhasil diperbarui.",
		"sidebarNotifications": handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func SuperAdminRecruitmentReject(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
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
		handlers.ValidationErrors(c, handlers.FieldErrors{"rejection_reason": "Alasan penolakan wajib diisi."})
		return
	}
	validationErrors := handlers.FieldErrors{}
	handlers.ValidateFieldLength(validationErrors, "rejection_reason", "Alasan penolakan", rejection, 3000)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	db := middleware.GetDB(c)
	applicationID := toInt64(id)
	if applicationID <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID lamaran tidak valid")
		return
	}
	previousState, err := dbrepo.GetRecruitmentApplicationRejectState(db, applicationID)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat lamaran")
		return
	}
	if previousState == nil {
		handlers.JSONError(c, http.StatusNotFound, "Lamaran tidak ditemukan")
		return
	}
	if err := dbrepo.RejectRecruitmentApplication(db, applicationID, rejection, time.Now()); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menolak lamaran")
		return
	}

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

	c.JSON(http.StatusOK, gin.H{
		"status":               "Pelamar berhasil ditolak.",
		"sidebarNotifications": handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func SuperAdminRecruitmentScheduleInterview(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
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
		handlers.ValidationErrors(c, handlers.FieldErrors{"date": "Tanggal, waktu, mode, interviewer wajib diisi."})
		return
	}
	validationErrors := handlers.FieldErrors{}
	handlers.ValidateFieldLength(validationErrors, "date", "Tanggal interview", date, 20)
	handlers.ValidateFieldLength(validationErrors, "time", "Waktu mulai", timeStart, 10)
	handlers.ValidateFieldLength(validationErrors, "end_time", "Waktu selesai", timeEnd, 10)
	handlers.ValidateFieldLength(validationErrors, "mode", "Mode interview", mode, 20)
	handlers.ValidateFieldLength(validationErrors, "interviewer", "Interviewer", interviewer, 120)
	handlers.ValidateFieldLength(validationErrors, "meeting_link", "Link meeting", meetingLink, 500)
	handlers.ValidateFieldLength(validationErrors, "notes", "Catatan interview", notes, 3000)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	dateVal, err := time.Parse("2006-01-02", date)
	if err != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"date": "Format tanggal tidak valid."})
		return
	}
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	if dateVal.Before(today) {
		handlers.ValidationErrors(c, handlers.FieldErrors{"date": "Tanggal interview tidak boleh di masa lalu."})
		return
	}

	startTime, err := time.Parse("15:04", timeStart)
	if err != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"time": "Format waktu mulai tidak valid."})
		return
	}
	endTime, err := time.Parse("15:04", timeEnd)
	if err != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"end_time": "Format waktu selesai tidak valid."})
		return
	}
	if !endTime.After(startTime) {
		handlers.ValidationErrors(c, handlers.FieldErrors{"end_time": "Waktu selesai harus lebih besar dari waktu mulai."})
		return
	}

	if mode != "Online" && mode != "Offline" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"mode": "Mode interview harus Online atau Offline."})
		return
	}

	if mode == "Online" && meetingLink == "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"meeting_link": "Link meeting wajib diisi untuk interview Online."})
		return
	}

	if conflictInterview(middleware.GetDB(c), toInt64(id), date, timeStart, timeEnd) {
		handlers.ValidationErrors(c, handlers.FieldErrors{"time": "Slot waktu ini sudah digunakan untuk interview lain pada tanggal tersebut."})
		return
	}

	db := middleware.GetDB(c)
	applicationID := toInt64(id)
	if applicationID <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID lamaran tidak valid")
		return
	}
	previousSchedule, err := dbrepo.GetRecruitmentInterviewScheduleState(db, applicationID)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat jadwal interview")
		return
	}
	if previousSchedule == nil {
		handlers.JSONError(c, http.StatusNotFound, "Lamaran tidak ditemukan")
		return
	}
	if err := dbrepo.SetRecruitmentInterviewSchedule(db, applicationID, date, timeStart, timeEnd, mode, interviewer, meetingLink, notes, time.Now()); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menyimpan jadwal interview")
		return
	}

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Recruitment",
		Action:      "SCHEDULE_INTERVIEW",
		EntityType:  "application",
		EntityID:    id,
		Description: "Menjadwalkan atau memperbarui jadwal interview kandidat.",
		OldValues: map[string]any{
			"interview_date":     handlers.FormatDateISO(previousSchedule.InterviewDate),
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
