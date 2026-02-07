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
)

func SuperAdminDivisionsIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	profiles, err := services.EnsureDivisionProfiles(db)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal memuat divisi")
		return
	}

	divisions := []map[string]any{}
	totalStaff := 0
	activeVacancies := 0
	availableSlotsTotal := 0

	for _, profile := range profiles {
		var currentStaff int
		_ = db.Get(&currentStaff, "SELECT COUNT(*) FROM users WHERE division = ? AND role IN (?, ?)", profile.Name, models.RoleAdmin, models.RoleStaff)
		if profile.Capacity < currentStaff {
			profile.Capacity = currentStaff
			_, _ = db.Exec("UPDATE division_profiles SET capacity = ? WHERE id = ?", profile.Capacity, profile.ID)
		}
		availableSlots := profile.Capacity - currentStaff
		if availableSlots < 0 {
			availableSlots = 0
		}
		if profile.IsHiring {
			activeVacancies++
		}
		totalStaff += currentStaff
		availableSlotsTotal += availableSlots

		staffList, _ := services.StaffForDivision(db, profile.Name)

		divisions = append(divisions, map[string]any{
			"id":                       profile.ID,
			"name":                     profile.Name,
			"description":              profile.Description,
			"manager_name":             profile.ManagerName,
			"capacity":                 profile.Capacity,
			"current_staff":            currentStaff,
			"available_slots":          availableSlots,
			"is_hiring":                profile.IsHiring,
			"job_title":                profile.JobTitle,
			"job_description":          profile.JobDescription,
			"job_requirements":         decodeJSONArray(profile.JobRequirements),
			"job_eligibility_criteria": decodeJSONMap(profile.JobEligibility),
			"staff":                    staffList,
		})
	}

	stats := map[string]int{
		"total_divisions":  len(divisions),
		"total_staff":      totalStaff,
		"active_vacancies": activeVacancies,
		"available_slots":  availableSlotsTotal,
	}

	c.JSON(http.StatusOK, gin.H{
		"divisions": divisions,
		"stats":     stats,
		"flash":     gin.H{"success": "", "error": ""},
	})
}

func SuperAdminDivisionsUpdate(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	description := c.PostForm("description")
	manager := c.PostForm("manager_name")
	capacityStr := c.PostForm("capacity")

	db := middleware.GetDB(c)

	var profile models.DivisionProfile
	if err := db.Get(&profile, "SELECT * FROM division_profiles WHERE id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "Divisi tidak ditemukan")
		return
	}

	var currentStaff int
	_ = db.Get(&currentStaff, "SELECT COUNT(*) FROM users WHERE division = ? AND role IN (?, ?)", profile.Name, models.RoleAdmin, models.RoleStaff)

	capacity := profile.Capacity
	if capacityStr != "" {
		if v, err := strconv.Atoi(capacityStr); err == nil {
			capacity = v
		}
	}
	if capacity < currentStaff {
		ValidationErrors(c, FieldErrors{"capacity": "Kapasitas divisi tidak boleh kurang dari jumlah staff saat ini."})
		return
	}

	_, _ = db.Exec("UPDATE division_profiles SET description = ?, manager_name = ?, capacity = ?, updated_at = ? WHERE id = ?", description, manager, capacity, time.Now(), id)
	c.JSON(http.StatusOK, gin.H{"status": "Divisi berhasil diperbarui."})
}

func SuperAdminDivisionsOpenJob(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	db := middleware.GetDB(c)

	var profile models.DivisionProfile
	if err := db.Get(&profile, "SELECT * FROM division_profiles WHERE id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "Divisi tidak ditemukan")
		return
	}

	var currentStaff int
	_ = db.Get(&currentStaff, "SELECT COUNT(*) FROM users WHERE division = ? AND role IN (?, ?)", profile.Name, models.RoleAdmin, models.RoleStaff)
	availableSlots := profile.Capacity - currentStaff
	if availableSlots <= 0 {
		ValidationErrors(c, FieldErrors{"capacity": "Kapasitas divisi saat ini penuh. Tingkatkan kapasitas sebelum membuka lowongan."})
		return
	}

	title := c.PostForm("job_title")
	description := c.PostForm("job_description")

	if title == "" || description == "" {
		ValidationErrors(c, FieldErrors{"job_title": "Judul pekerjaan wajib diisi.", "job_description": "Deskripsi pekerjaan wajib diisi."})
		return
	}

	requirements := []string{}
	reqJSON := c.PostForm("job_requirements")
	if reqJSON != "" {
		_ = json.Unmarshal([]byte(reqJSON), &requirements)
	} else {
		requirements = c.PostFormArray("job_requirements[]")
	}
	cleaned := []string{}
	for _, req := range requirements {
		req = strings.TrimSpace(req)
		if req != "" {
			cleaned = append(cleaned, req)
		}
	}
	if len(cleaned) == 0 {
		ValidationErrors(c, FieldErrors{"job_requirements": "Mohon tambahkan minimal satu persyaratan yang valid."})
		return
	}

	criteria := map[string]any{}
	criteriaJSON := c.PostForm("job_eligibility_criteria")
	if criteriaJSON != "" {
		_ = json.Unmarshal([]byte(criteriaJSON), &criteria)
	} else {
		if v := c.PostForm("job_eligibility_criteria.min_age"); v != "" {
			criteria["min_age"] = v
		}
		if v := c.PostForm("job_eligibility_criteria.max_age"); v != "" {
			criteria["max_age"] = v
		}
		if v := c.PostForm("job_eligibility_criteria.gender"); v != "" {
			criteria["gender"] = v
		}
		if v := c.PostForm("job_eligibility_criteria.min_education"); v != "" {
			criteria["min_education"] = v
		}
		if v := c.PostForm("job_eligibility_criteria.min_experience_years"); v != "" {
			criteria["min_experience_years"] = v
		}
	}

	criteriaBytes, _ := json.Marshal(criteria)
	requirementsBytes, _ := json.Marshal(cleaned)

	_, _ = db.Exec(`UPDATE division_profiles SET is_hiring = 1, job_title = ?, job_description = ?, job_requirements = ?, job_eligibility_criteria = ?, hiring_opened_at = ? WHERE id = ?`,
		title, description, requirementsBytes, criteriaBytes, time.Now(), id)

	c.JSON(http.StatusOK, gin.H{"status": "Lowongan pekerjaan berhasil dipublikasikan."})
}

func SuperAdminDivisionsCloseJob(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	db := middleware.GetDB(c)
	_, _ = db.Exec(`UPDATE division_profiles SET is_hiring = 0, job_title = NULL, job_description = NULL, job_requirements = NULL, hiring_opened_at = NULL WHERE id = ?`, id)
	c.JSON(http.StatusOK, gin.H{"status": "Lowongan pekerjaan telah ditutup."})
}

// avoid unused
var _ = services.DivisionCodeFromName
