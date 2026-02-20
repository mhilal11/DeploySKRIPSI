package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func SuperAdminStaffIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.Role == models.RoleAdmin) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	terminations := []models.StaffTermination{}
	_ = db.Select(&terminations, "SELECT * FROM staff_terminations ORDER BY effective_date DESC")

	active := []models.StaffTermination{}
	archive := []models.StaffTermination{}
	for _, t := range terminations {
		if t.Status == "Selesai" {
			archive = append(archive, t)
		} else {
			active = append(active, t)
		}
	}

	stats := map[string]int{
		"newRequests":        countByStatus(terminations, "Diajukan"),
		"inProcess":          countByStatus(terminations, "Proses"),
		"completedThisMonth": countTerminationsThisMonth(db),
		"archived":           len(terminations),
	}

	type staffPickerRow struct {
		ID           int64   `db:"id"`
		EmployeeCode string  `db:"employee_code"`
		Name         string  `db:"name"`
		Division     *string `db:"division"`
	}
	staffRows := []staffPickerRow{}
	_ = db.Select(&staffRows, `
		SELECT u.id, u.employee_code, u.name, u.division
		FROM users u
		WHERE u.role = ?
		  AND u.status = 'Active'
		  AND u.employee_code IS NOT NULL
		  AND u.employee_code <> ''
		  AND NOT EXISTS (
			  SELECT 1
			  FROM staff_terminations st
			  WHERE st.user_id = u.id
			    AND st.status IN ('Diajukan', 'Proses')
		  )
		ORDER BY u.name ASC
	`, models.RoleStaff)
	staffOptions := make([]map[string]any, 0, len(staffRows))
	for _, row := range staffRows {
		staffOptions = append(staffOptions, map[string]any{
			"id":           row.ID,
			"employeeCode": row.EmployeeCode,
			"name":         row.Name,
			"division":     row.Division,
		})
	}

	inactiveEmployees := []map[string]any{}
	for i, t := range archive {
		if i >= 10 {
			break
		}
		joinDate := "-"
		var registeredAt time.Time
		if err := db.Get(&registeredAt, "SELECT registered_at FROM users WHERE id = ?", t.UserID); err == nil {
			joinDate = registeredAt.Format("02 Jan 2006")
		}
		inactiveEmployees = append(inactiveEmployees, map[string]any{
			"id":           t.ID,
			"name":         t.EmployeeName,
			"employeeCode": t.EmployeeCode,
			"division":     t.Division,
			"position":     t.Position,
			"joinDate":     joinDate,
			"exitDate":     formatDate(t.EffectiveDate),
			"exitReason":   t.Reason,
			"type":         t.Type,
		})
	}

	checklistTemplate := []string{
		"Surat resign diterima",
		"Persetujuan atasan",
		"Serah terima pekerjaan",
		"Pengembalian inventaris (laptop, ID card, dll)",
		"Clearance dari Finance",
		"Dokumen kelengkapan (BPJS, pajak, dll)",
		"Data arsip ke sistem",
	}

	c.JSON(http.StatusOK, gin.H{
		"stats": stats,
		"terminations": gin.H{
			"active":  transformTerminations(active),
			"archive": transformTerminations(archive),
		},
		"inactiveEmployees":    inactiveEmployees,
		"staffOptions":         staffOptions,
		"checklistTemplate":    checklistTemplate,
		"sidebarNotifications": computeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func SuperAdminStaffStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.Role == models.RoleAdmin) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	var payload struct {
		EmployeeCode  string `form:"employee_code" json:"employee_code"`
		Type          string `form:"type" json:"type"`
		EffectiveDate string `form:"effective_date" json:"effective_date"`
		Reason        string `form:"reason" json:"reason"`
		Suggestion    string `form:"suggestion" json:"suggestion"`
	}
	_ = c.ShouldBind(&payload)

	employeeCode := strings.TrimSpace(payload.EmployeeCode)
	if employeeCode == "" {
		ValidationErrors(c, FieldErrors{"employee_code": "ID Karyawan wajib diisi."})
		return
	}

	db := middleware.GetDB(c)

	var employee models.User
	if err := db.Get(&employee, "SELECT * FROM users WHERE employee_code = ?", employeeCode); err != nil {
		ValidationErrors(c, FieldErrors{"employee_code": "Karyawan tidak ditemukan."})
		return
	}

	if employee.Role != models.RoleStaff {
		ValidationErrors(c, FieldErrors{"employee_code": "ID Karyawan yang dimasukkan bukan staff."})
		return
	}

	reference, _ := services.GenerateTerminationReference(db)

	now := time.Now()
	_, _ = db.Exec(`INSERT INTO staff_terminations (reference, user_id, requested_by, employee_code, employee_name, division, position, type, reason, suggestion, request_date, effective_date, status, progress, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Diajukan', 0, ?, ?)`,
		reference, employee.ID, user.ID, employee.EmployeeCode, employee.Name, employee.Division, employee.Role, payload.Type, payload.Reason, payload.Suggestion, now.Format("2006-01-02"), payload.EffectiveDate, now, now)

	c.JSON(http.StatusOK, gin.H{"status": "Pengajuan termination berhasil dibuat."})
}

func SuperAdminStaffUpdate(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.Role == models.RoleAdmin) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	var payload struct {
		Notes     string          `form:"notes" json:"notes"`
		Checklist map[string]bool `form:"checklist" json:"checklist"`
	}
	_ = c.ShouldBind(&payload)

	notes := payload.Notes
	incomingChecklist := payload.Checklist
	if incomingChecklist == nil {
		incomingChecklist = map[string]bool{}
	}

	db := middleware.GetDB(c)

	var termination models.StaffTermination
	if err := db.Get(&termination, "SELECT * FROM staff_terminations WHERE id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "Pengajuan tidak ditemukan")
		return
	}

	merged := map[string]bool{}
	if len(termination.Checklist) > 0 {
		_ = json.Unmarshal(termination.Checklist, &merged)
	}
	for k, v := range incomingChecklist {
		merged[k] = v
	}

	totalItems := len(merged)
	completed := 0
	for _, v := range merged {
		if v {
			completed++
		}
	}
	progress := 0
	if totalItems > 0 {
		progress = int(float64(completed) / float64(totalItems) * 100)
	}
	effectiveStatus := "Diajukan"
	if completed > 0 {
		effectiveStatus = "Proses"
	}
	if totalItems > 0 && completed >= totalItems {
		effectiveStatus = "Selesai"
	}
	if effectiveStatus == "Selesai" {
		progress = 100
	}

	mergedBytes, _ := json.Marshal(merged)
	_, _ = db.Exec("UPDATE staff_terminations SET status = ?, notes = ?, checklist = ?, progress = ?, updated_at = ? WHERE id = ?", effectiveStatus, notes, mergedBytes, progress, time.Now(), id)

	if effectiveStatus == "Selesai" && termination.UserID != nil {
		_, _ = db.Exec("UPDATE users SET status = 'Inactive', inactive_at = ? WHERE id = ?", time.Now(), *termination.UserID)
	}

	c.JSON(http.StatusOK, gin.H{"status": "Progress offboarding berhasil diperbarui."})
}

func SuperAdminStaffDelete(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.Role == models.RoleAdmin) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	db := middleware.GetDB(c)
	_, _ = db.Exec("DELETE FROM staff_terminations WHERE id = ?", id)

	c.JSON(http.StatusOK, gin.H{"status": "Offboarding berhasil dibatalkan."})
}

func transformTerminations(list []models.StaffTermination) []map[string]any {
	out := []map[string]any{}
	for _, t := range list {
		out = append(out, map[string]any{
			"id":            t.ID,
			"reference":     t.Reference,
			"employeeName":  t.EmployeeName,
			"employeeCode":  t.EmployeeCode,
			"division":      t.Division,
			"position":      t.Position,
			"type":          t.Type,
			"reason":        t.Reason,
			"suggestion":    t.Suggestion,
			"notes":         t.Notes,
			"checklist":     t.Checklist,
			"status":        t.Status,
			"progress":      t.Progress,
			"requestDate":   formatDate(t.RequestDate),
			"effectiveDate": formatDate(t.EffectiveDate),
		})
	}
	return out
}

func countByStatus(list []models.StaffTermination, status string) int {
	count := 0
	for _, t := range list {
		if t.Status == status {
			count++
		}
	}
	return count
}

func countTerminationsThisMonth(db *sqlx.DB) int {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	end := start.AddDate(0, 1, 0).Add(-time.Second)
	var count int
	_ = db.Get(&count, "SELECT COUNT(*) FROM staff_terminations WHERE status = 'Selesai' AND effective_date BETWEEN ? AND ?", start, end)
	return count
}
