package superadmin

import (
	"fmt"
	"html"
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

	emailSent := false
	if application, appErr := dbrepo.GetApplicationByID(db, applicationID); appErr == nil && application != nil {
		cfg := middleware.GetConfig(c)
		subject, textBody, htmlBody := buildInterviewScheduleEmail(interviewScheduleEmailPayload{
			IsReschedule:  hasExistingInterviewSchedule(previousSchedule),
			ApplicantName: application.FullName,
			Position:      application.Position,
			Division:      handlers.FirstString(application.Division, ""),
			DateISO:       date,
			StartTime:     timeStart,
			EndTime:       timeEnd,
			Mode:          mode,
			MeetingLink:   meetingLink,
			Interviewer:   interviewer,
			Notes:         notes,
		})
		if sendErr := services.SendEmailMultipart(cfg, strings.TrimSpace(application.Email), subject, textBody, htmlBody); sendErr == nil {
			emailSent = true
		}
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

	c.JSON(http.StatusOK, gin.H{
		"status":     "Jadwal interview berhasil disimpan.",
		"email_sent": emailSent,
	})
}

type interviewScheduleEmailPayload struct {
	IsReschedule  bool
	ApplicantName string
	Position      string
	Division      string
	DateISO       string
	StartTime     string
	EndTime       string
	Mode          string
	MeetingLink   string
	Interviewer   string
	Notes         string
}

func hasExistingInterviewSchedule(previous *dbrepo.RecruitmentInterviewScheduleState) bool {
	if previous == nil {
		return false
	}
	if previous.InterviewDate != nil {
		return true
	}
	if strings.TrimSpace(handlers.FirstString(previous.InterviewTime, "")) != "" {
		return true
	}
	if strings.TrimSpace(handlers.FirstString(previous.InterviewEnd, "")) != "" {
		return true
	}
	if strings.TrimSpace(handlers.FirstString(previous.InterviewMode, "")) != "" {
		return true
	}
	return false
}

func formatInterviewDateID(dateISO string) string {
	parsed, err := time.Parse("2006-01-02", strings.TrimSpace(dateISO))
	if err != nil {
		return strings.TrimSpace(dateISO)
	}
	months := []string{
		"Januari", "Februari", "Maret", "April", "Mei", "Juni",
		"Juli", "Agustus", "September", "Oktober", "November", "Desember",
	}
	monthLabel := months[int(parsed.Month())-1]
	return fmt.Sprintf("%d %s %d", parsed.Day(), monthLabel, parsed.Year())
}

func buildInterviewScheduleEmail(payload interviewScheduleEmailPayload) (string, string, string) {
	name := strings.TrimSpace(payload.ApplicantName)
	if name == "" {
		name = "Pelamar"
	}

	position := strings.TrimSpace(payload.Position)
	if position == "" {
		position = "Posisi yang dilamar"
	}

	division := strings.TrimSpace(payload.Division)
	if division == "" {
		division = "-"
	}

	mode := strings.TrimSpace(payload.Mode)
	if mode == "" {
		mode = "-"
	}

	meetingLink := strings.TrimSpace(payload.MeetingLink)
	if mode == "Online" && meetingLink == "" {
		meetingLink = "(Akan diinformasikan menyusul)"
	}
	if mode != "Online" && meetingLink == "" {
		meetingLink = "-"
	}

	notes := strings.TrimSpace(payload.Notes)
	if notes == "" {
		notes = "-"
	}

	dateDisplay := formatInterviewDateID(payload.DateISO)
	interviewer := strings.TrimSpace(payload.Interviewer)
	if interviewer == "" {
		interviewer = "Tim HR"
	}

	subjectPrefix := "Undangan Wawancara"
	title := "Undangan Wawancara Anda"
	description := "Anda diundang untuk mengikuti proses wawancara."
	if payload.IsReschedule {
		subjectPrefix = "Pembaruan Jadwal Wawancara"
		title = "Pembaruan Jadwal Wawancara"
		description = "Jadwal wawancara Anda telah diperbarui."
	}

	subject := fmt.Sprintf("%s - %s", subjectPrefix, position)

	textBody := fmt.Sprintf(
		"Halo %s,\n\n"+
			"%s\n\n"+
			"Detail jadwal wawancara:\n"+
			"- Posisi: %s\n"+
			"- Divisi: %s\n"+
			"- Tanggal: %s\n"+
			"- Waktu: %s - %s WIB\n"+
			"- Mode: %s\n"+
			"- Pewawancara: %s\n"+
			"- Link Meeting: %s\n"+
			"- Catatan: %s\n\n"+
			"Mohon hadir tepat waktu dan siapkan dokumen pendukung yang diperlukan.\n"+
			"Jika ada pertanyaan, silakan balas email ini.\n\n"+
			"Salam,\nTim Rekrutmen Lintas Data Prima",
		name,
		description,
		position,
		division,
		dateDisplay,
		payload.StartTime,
		payload.EndTime,
		mode,
		interviewer,
		meetingLink,
		notes,
	)

	escapedName := html.EscapeString(name)
	escapedTitle := html.EscapeString(title)
	escapedDescription := html.EscapeString(description)
	escapedPosition := html.EscapeString(position)
	escapedDivision := html.EscapeString(division)
	escapedDate := html.EscapeString(dateDisplay)
	escapedStart := html.EscapeString(payload.StartTime)
	escapedEnd := html.EscapeString(payload.EndTime)
	escapedMode := html.EscapeString(mode)
	escapedInterviewer := html.EscapeString(interviewer)
	escapedNotes := html.EscapeString(notes)
	escapedMeetingLink := html.EscapeString(meetingLink)

	meetingLinkHTML := escapedMeetingLink
	if strings.TrimSpace(meetingLink) != "-" && !strings.HasPrefix(strings.TrimSpace(meetingLink), "(") {
		meetingLinkHTML = fmt.Sprintf("<a href=\"%s\" style=\"color:#1d4ed8;text-decoration:none;\">%s</a>", escapedMeetingLink, escapedMeetingLink)
	}

	htmlBody := fmt.Sprintf(`<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>%s</title>
</head>
<body style="margin:0;padding:0;background:#eef2ff;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background:#eef2ff;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border:1px solid #dbeafe;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;background:linear-gradient(135deg,#0f172a 0%%,#1d4ed8 100%%);">
              <p style="margin:0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#bfdbfe;font-weight:700;">Lintas Data Prima</p>
              <h1 style="margin:10px 0 0;font-size:24px;line-height:1.3;color:#ffffff;">%s</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Halo <strong>%s</strong>,</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#334155;">%s</p>
              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;border-spacing:0 8px;">
                <tr><td style="font-size:13px;color:#64748b;width:160px;">Posisi</td><td style="font-size:14px;color:#0f172a;font-weight:600;">%s</td></tr>
                <tr><td style="font-size:13px;color:#64748b;">Divisi</td><td style="font-size:14px;color:#0f172a;">%s</td></tr>
                <tr><td style="font-size:13px;color:#64748b;">Tanggal</td><td style="font-size:14px;color:#0f172a;">%s</td></tr>
                <tr><td style="font-size:13px;color:#64748b;">Waktu</td><td style="font-size:14px;color:#0f172a;">%s - %s WIB</td></tr>
                <tr><td style="font-size:13px;color:#64748b;">Mode</td><td style="font-size:14px;color:#0f172a;">%s</td></tr>
                <tr><td style="font-size:13px;color:#64748b;">Pewawancara</td><td style="font-size:14px;color:#0f172a;">%s</td></tr>
                <tr><td style="font-size:13px;color:#64748b;">Link Meeting</td><td style="font-size:14px;color:#0f172a;word-break:break-word;">%s</td></tr>
                <tr><td style="font-size:13px;color:#64748b;vertical-align:top;padding-top:2px;">Catatan</td><td style="font-size:14px;color:#0f172a;white-space:pre-wrap;">%s</td></tr>
              </table>
              <p style="margin:20px 0 0;font-size:13px;line-height:1.7;color:#64748b;">
                Mohon hadir tepat waktu dan siapkan dokumen pendukung yang diperlukan.
                Jika ada pertanyaan, silakan balas email ini.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">Email ini dikirim otomatis oleh sistem rekrutmen Lintas Data Prima.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
		escapedTitle,
		escapedTitle,
		escapedName,
		escapedDescription,
		escapedPosition,
		escapedDivision,
		escapedDate,
		escapedStart,
		escapedEnd,
		escapedMode,
		escapedInterviewer,
		meetingLinkHTML,
		escapedNotes,
	)

	return subject, textBody, htmlBody
}
