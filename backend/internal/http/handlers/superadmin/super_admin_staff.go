package superadmin

import (
	"hris-backend/internal/dto"
	"hris-backend/internal/http/handlers"
	dbrepo "hris-backend/internal/repository"

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

type staffListRepository interface {
	ListActiveStaffTerminationsPaged(limit, offset int) ([]models.StaffTermination, error)
	ListArchivedStaffTerminationsPaged(limit, offset int) ([]models.StaffTermination, error)
	CountActiveStaffTerminations() (int, error)
	CountArchivedStaffTerminations() (int, error)
	CountStaffTerminationsByStatus(status string) (int, error)
	ListEligibleActiveStaffRows() ([]dbrepo.StaffPickerRow, error)
	GetUserRegisteredAtByID(userID int64) (*time.Time, error)
}

type sqlStaffListRepository struct {
	db *sqlx.DB
}

var allowedTerminationTypes = []string{"Resign", "PHK", "Pensiun"}

func newStaffListRepository(db *sqlx.DB) staffListRepository {
	return &sqlStaffListRepository{db: db}
}

func (r *sqlStaffListRepository) ListActiveStaffTerminationsPaged(limit, offset int) ([]models.StaffTermination, error) {
	return dbrepo.ListActiveStaffTerminationsPaged(r.db, limit, offset)
}

func (r *sqlStaffListRepository) ListArchivedStaffTerminationsPaged(limit, offset int) ([]models.StaffTermination, error) {
	return dbrepo.ListArchivedStaffTerminationsPaged(r.db, limit, offset)
}

func (r *sqlStaffListRepository) CountActiveStaffTerminations() (int, error) {
	return dbrepo.CountActiveStaffTerminations(r.db)
}

func (r *sqlStaffListRepository) CountArchivedStaffTerminations() (int, error) {
	return dbrepo.CountArchivedStaffTerminations(r.db)
}

func (r *sqlStaffListRepository) CountStaffTerminationsByStatus(status string) (int, error) {
	return dbrepo.CountStaffTerminationsByStatus(r.db, status)
}

func (r *sqlStaffListRepository) ListEligibleActiveStaffRows() ([]dbrepo.StaffPickerRow, error) {
	return dbrepo.ListEligibleActiveStaffRows(r.db)
}

func (r *sqlStaffListRepository) GetUserRegisteredAtByID(userID int64) (*time.Time, error) {
	return dbrepo.GetUserRegisteredAtByID(r.db, userID)
}

func SuperAdminStaffIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.Role == models.RoleAdmin) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	repo := newStaffListRepository(db)
	pagination := handlers.ParsePagination(c, 20, 100)

	active, _ := repo.ListActiveStaffTerminationsPaged(pagination.Limit, pagination.Offset)
	archive, _ := repo.ListArchivedStaffTerminationsPaged(pagination.Limit, pagination.Offset)
	totalActive, _ := repo.CountActiveStaffTerminations()
	totalArchive, _ := repo.CountArchivedStaffTerminations()
	newRequestsCount, _ := repo.CountStaffTerminationsByStatus("Diajukan")
	inProcessCount, _ := repo.CountStaffTerminationsByStatus("Proses")

	stats := map[string]int{
		"newRequests":        newRequestsCount,
		"inProcess":          inProcessCount,
		"completedThisMonth": countTerminationsThisMonth(db),
		"archived":           totalArchive,
	}

	staffRows, _ := repo.ListEligibleActiveStaffRows()
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
		if t.UserID != nil {
			if registeredAt, err := repo.GetUserRegisteredAtByID(*t.UserID); err == nil && registeredAt != nil {
				joinDate = registeredAt.Format("02 Jan 2006")
			}
		}
		inactiveEmployees = append(inactiveEmployees, map[string]any{
			"id":           t.ID,
			"name":         t.EmployeeName,
			"employeeCode": t.EmployeeCode,
			"division":     t.Division,
			"position":     t.Position,
			"joinDate":     joinDate,
			"exitDate":     handlers.FormatDate(t.EffectiveDate),
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
		"pagination": gin.H{
			"active":  handlers.BuildPaginationMeta(pagination.Page, pagination.Limit, totalActive),
			"archive": handlers.BuildPaginationMeta(pagination.Page, pagination.Limit, totalArchive),
		},
		"inactiveEmployees":    inactiveEmployees,
		"staffOptions":         staffOptions,
		"checklistTemplate":    checklistTemplate,
		"sidebarNotifications": handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func SuperAdminStaffStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.Role == models.RoleAdmin) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	var payload struct {
		EmployeeCode  string `form:"employee_code" json:"employee_code"`
		Type          string `form:"type" json:"type"`
		EffectiveDate string `form:"effective_date" json:"effective_date"`
		Reason        string `form:"reason" json:"reason"`
		Suggestion    string `form:"suggestion" json:"suggestion"`
	}
	if err := c.ShouldBind(&payload); err != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"_form": "Data pengajuan termination tidak valid."})
		return
	}

	employeeCode := strings.TrimSpace(payload.EmployeeCode)
	terminationType := strings.TrimSpace(payload.Type)
	effectiveDate := strings.TrimSpace(payload.EffectiveDate)
	reason := strings.TrimSpace(payload.Reason)
	suggestion := strings.TrimSpace(payload.Suggestion)

	validationErrors := handlers.FieldErrors{}
	if employeeCode == "" {
		validationErrors["employee_code"] = "ID Karyawan wajib diisi."
	}
	if terminationType == "" {
		validationErrors["type"] = "Tipe termination wajib dipilih."
	}
	if effectiveDate == "" {
		validationErrors["effective_date"] = "Tanggal efektif wajib diisi."
	}
	if reason == "" {
		validationErrors["reason"] = "Alasan wajib diisi."
	}
	handlers.ValidateFieldLength(validationErrors, "employee_code", "ID karyawan", employeeCode, 64)
	handlers.ValidateFieldLength(validationErrors, "type", "Tipe termination", terminationType, 32)
	handlers.ValidateFieldLength(validationErrors, "effective_date", "Tanggal efektif", effectiveDate, 30)
	handlers.ValidateFieldLength(validationErrors, "reason", "Alasan", reason, 3000)
	handlers.ValidateFieldLength(validationErrors, "suggestion", "Saran", suggestion, 3000)
	handlers.ValidateAllowedValue(validationErrors, "type", "Tipe termination", terminationType, allowedTerminationTypes)
	if effectiveDate != "" {
		parsedDate, parseErr := handlers.ParseDateStrict(effectiveDate, "2006-01-02")
		if parseErr != nil {
			validationErrors["effective_date"] = "Format tanggal efektif tidak valid."
		} else {
			today := time.Now()
			startOfToday := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, today.Location())
			if parsedDate.Before(startOfToday) {
				validationErrors["effective_date"] = "Tanggal efektif tidak boleh di masa lalu."
			}
		}
	}
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	db := middleware.GetDB(c)

	employee, err := dbrepo.GetUserByEmployeeCode(db, employeeCode)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat data karyawan")
		return
	}
	if employee == nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"employee_code": "Karyawan tidak ditemukan."})
		return
	}

	if employee.Role != models.RoleStaff {
		handlers.ValidationErrors(c, handlers.FieldErrors{"employee_code": "ID Karyawan yang dimasukkan bukan staff."})
		return
	}

	reference, err := services.GenerateTerminationReference(db)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal membuat nomor referensi termination")
		return
	}

	now := time.Now()
	position := employee.Role
	if err := dbrepo.InsertStaffTermination(db, dbrepo.StaffTerminationCreateInput{
		Reference:     reference,
		UserID:        employee.ID,
		RequestedBy:   user.ID,
		EmployeeCode:  employee.EmployeeCode,
		EmployeeName:  employee.Name,
		Division:      employee.Division,
		Position:      &position,
		Type:          terminationType,
		Reason:        reason,
		Suggestion:    suggestion,
		RequestDate:   now,
		EffectiveDate: effectiveDate,
		Status:        "Diajukan",
		Progress:      0,
		CreatedAt:     now,
		UpdatedAt:     now,
	}); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Pengajuan termination gagal dibuat")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "Pengajuan termination berhasil dibuat."})
}

func SuperAdminStaffUpdate(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.Role == models.RoleAdmin) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID pengajuan tidak valid")
		return
	}
	var payload struct {
		Notes     string          `form:"notes" json:"notes"`
		Checklist map[string]bool `form:"checklist" json:"checklist"`
	}
	if err := c.ShouldBind(&payload); err != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"_form": "Data progress offboarding tidak valid."})
		return
	}

	notes := strings.TrimSpace(payload.Notes)
	incomingChecklist := payload.Checklist
	if incomingChecklist == nil {
		incomingChecklist = map[string]bool{}
	}
	validationErrors := handlers.FieldErrors{}
	handlers.ValidateFieldLength(validationErrors, "notes", "Catatan HR", notes, 4000)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	db := middleware.GetDB(c)

	termination, err := dbrepo.GetStaffTerminationByID(db, id)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat pengajuan offboarding")
		return
	}
	if termination == nil {
		handlers.JSONError(c, http.StatusNotFound, "Pengajuan tidak ditemukan")
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

	if err := dbrepo.UpdateStaffTerminationAndDeactivateIfCompleted(
		db,
		id,
		effectiveStatus,
		notes,
		merged,
		progress,
		termination.UserID,
		time.Now(),
	); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Progress offboarding gagal diperbarui")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "Progress offboarding berhasil diperbarui."})
}

func SuperAdminStaffDelete(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.Role == models.RoleAdmin) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID pengajuan tidak valid")
		return
	}
	db := middleware.GetDB(c)
	if err := dbrepo.DeleteStaffTerminationByID(db, id); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Offboarding gagal dibatalkan")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "Offboarding berhasil dibatalkan."})
}

func transformTerminations(list []models.StaffTermination) []dto.StaffTermination {
	out := []dto.StaffTermination{}
	for _, t := range list {
		checklist := map[string]bool{}
		if len(t.Checklist) > 0 {
			_ = json.Unmarshal(t.Checklist, &checklist)
		}
		out = append(out, dto.StaffTermination{
			ID:            t.ID,
			Reference:     t.Reference,
			EmployeeName:  t.EmployeeName,
			EmployeeCode:  t.EmployeeCode,
			Division:      t.Division,
			Position:      t.Position,
			Type:          t.Type,
			Reason:        t.Reason,
			Suggestion:    t.Suggestion,
			Notes:         t.Notes,
			Checklist:     checklist,
			Status:        t.Status,
			Progress:      t.Progress,
			RequestDate:   handlers.FormatDate(t.RequestDate),
			EffectiveDate: handlers.FormatDate(t.EffectiveDate),
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
	count, _ := dbrepo.CountCompletedStaffTerminationsBetween(db, start, end)
	return count
}
