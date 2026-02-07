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

type OpenJobRequest struct {
	JobTitle               string                 `json:"job_title" form:"job_title"`
	JobDescription         string                 `json:"job_description" form:"job_description"`
	JobRequirements        []string               `json:"job_requirements" form:"job_requirements"`
	JobEligibilityCriteria map[string]interface{} `json:"job_eligibility_criteria" form:"job_eligibility_criteria"`
}

type UpdateDivisionRequest struct {
	Description *string `json:"description" form:"description"`
	ManagerName *string `json:"manager_name" form:"manager_name"`
	Capacity    *int    `json:"capacity" form:"capacity"`
}

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
			"job_requirements":         decodeJSONStringArray(profile.JobRequirements),
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
	var req UpdateDivisionRequest
	_ = c.ShouldBind(&req)

	// Fallback for non-standard payload shape.
	if req.Description == nil {
		if value, ok := c.GetPostForm("description"); ok {
			req.Description = &value
		}
	}
	if req.ManagerName == nil {
		if value, ok := c.GetPostForm("manager_name"); ok {
			req.ManagerName = &value
		}
	}
	if req.Capacity == nil {
		if rawCapacity, ok := c.GetPostForm("capacity"); ok {
			rawCapacity = strings.TrimSpace(rawCapacity)
			if rawCapacity != "" {
				if parsedCapacity, parseErr := strconv.Atoi(rawCapacity); parseErr == nil {
					req.Capacity = &parsedCapacity
				}
			}
		}
	}

	db := middleware.GetDB(c)

	var profile models.DivisionProfile
	if err := db.Get(&profile, "SELECT * FROM division_profiles WHERE id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "Divisi tidak ditemukan")
		return
	}

	var currentStaff int
	_ = db.Get(&currentStaff, "SELECT COUNT(*) FROM users WHERE division = ? AND role IN (?, ?)", profile.Name, models.RoleAdmin, models.RoleStaff)

	capacity := profile.Capacity
	if req.Capacity != nil {
		capacity = *req.Capacity
	}
	if capacity < currentStaff {
		ValidationErrors(c, FieldErrors{"capacity": "Kapasitas divisi tidak boleh kurang dari jumlah staff saat ini."})
		return
	}

	descriptionValue := profile.Description
	if req.Description != nil {
		description := strings.TrimSpace(*req.Description)
		if description == "" {
			descriptionValue = nil
		} else {
			descriptionValue = &description
		}
	}

	managerValue := profile.ManagerName
	if req.ManagerName != nil {
		manager := strings.TrimSpace(*req.ManagerName)
		if manager == "" {
			managerValue = nil
		} else {
			managerValue = &manager
		}
	}

	_, err := db.Exec(
		"UPDATE division_profiles SET description = ?, manager_name = ?, capacity = ?, updated_at = ? WHERE id = ?",
		descriptionValue,
		managerValue,
		capacity,
		time.Now(),
		id,
	)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal memperbarui divisi")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"flash": gin.H{"success": "Divisi berhasil diperbarui."},
	})
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

	var req OpenJobRequest
	if err := c.ShouldBind(&req); err != nil {
		ValidationErrors(c, FieldErrors{"_form": "Data tidak valid. Pastikan semua field diisi dengan benar."})
		return
	}

	// Fallback parser for non-standard payload shapes.
	if len(req.JobRequirements) == 0 {
		if postRequirements := c.PostFormArray("job_requirements[]"); len(postRequirements) > 0 {
			req.JobRequirements = postRequirements
		} else if raw := strings.TrimSpace(c.PostForm("job_requirements")); raw != "" {
			_ = json.Unmarshal([]byte(raw), &req.JobRequirements)
		}
	}
	if req.JobEligibilityCriteria == nil {
		if raw := strings.TrimSpace(c.PostForm("job_eligibility_criteria")); raw != "" {
			_ = json.Unmarshal([]byte(raw), &req.JobEligibilityCriteria)
		}
	}

	// Validate required fields
	errors := FieldErrors{}
	if strings.TrimSpace(req.JobTitle) == "" {
		errors["job_title"] = "Judul pekerjaan wajib diisi."
	}
	if strings.TrimSpace(req.JobDescription) == "" {
		errors["job_description"] = "Deskripsi pekerjaan wajib diisi."
	}

	// Clean and validate requirements
	cleaned := []string{}
	for _, reqStr := range req.JobRequirements {
		reqStr = strings.TrimSpace(reqStr)
		if reqStr != "" {
			cleaned = append(cleaned, reqStr)
		}
	}
	if len(cleaned) == 0 {
		errors["job_requirements"] = "Mohon tambahkan minimal satu persyaratan yang valid."
	}

	if len(errors) > 0 {
		ValidationErrors(c, errors)
		return
	}

	// Prepare criteria - ensure we have a valid map even if empty
	criteria := req.JobEligibilityCriteria
	if criteria == nil {
		criteria = make(map[string]interface{})
	}

	criteriaBytes, _ := json.Marshal(criteria)
	requirementsBytes, _ := json.Marshal(cleaned)

	_, err := db.Exec(`UPDATE division_profiles SET is_hiring = 1, job_title = ?, job_description = ?, job_requirements = ?, job_eligibility_criteria = ?, hiring_opened_at = ?, updated_at = ? WHERE id = ?`,
		req.JobTitle, req.JobDescription, string(requirementsBytes), string(criteriaBytes), time.Now(), time.Now(), id)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal menyimpan lowongan. Coba lagi.")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"flash": gin.H{"success": "Lowongan pekerjaan berhasil dipublikasikan."},
	})
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
	c.JSON(http.StatusOK, gin.H{
		"flash": gin.H{"success": "Lowongan pekerjaan telah ditutup."},
	})
}

// avoid unused
var _ = services.DivisionCodeFromName
