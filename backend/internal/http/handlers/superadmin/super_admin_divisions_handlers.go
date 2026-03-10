package superadmin

import (
	"net/http"
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

func SuperAdminDivisionsIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	profiles, err := services.EnsureDivisionProfiles(db)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat divisi")
		return
	}

	divisions := []map[string]any{}
	totalStaff := 0
	activeVacancies := 0
	availableSlotsTotal := 0
	divisionIDs := make([]int64, 0, len(profiles))
	for _, profile := range profiles {
		divisionIDs = append(divisionIDs, profile.ID)
	}
	activeJobsByDivisionID := loadActiveDivisionJobsByDivisionIDs(db, divisionIDs)

	for _, profile := range profiles {
		currentStaff, err := dbrepo.CountActiveDivisionUsers(db, profile.Name)
		if err != nil {
			currentStaff = 0
		}
		if profile.Capacity < currentStaff {
			profile.Capacity = currentStaff
			_ = dbrepo.UpdateDivisionProfileCapacity(db, profile.ID, profile.Capacity, time.Now())
		}
		availableSlots := profile.Capacity - currentStaff
		if availableSlots < 0 {
			availableSlots = 0
		}
		jobs := activeJobsByDivisionID[profile.ID]
		if len(jobs) == 0 && profile.IsHiring && profile.JobTitle != nil && strings.TrimSpace(*profile.JobTitle) != "" {
			jobs = append(jobs, map[string]any{
				"id":                       nil,
				"job_title":                profile.JobTitle,
				"job_description":          profile.JobDescription,
				"job_requirements":         handlers.DecodeJSONStringArray(profile.JobRequirements),
				"job_eligibility_criteria": handlers.DecodeJSONMap(profile.JobEligibility),
				"is_active":                true,
				"opened_at":                profile.HiringOpenedAt,
			})
		}
		isHiring := len(jobs) > 0
		activeVacancies += len(jobs)
		totalStaff += currentStaff
		availableSlotsTotal += availableSlots

		staffList, _ := services.StaffForDivision(db, profile.Name)
		var primaryJobTitle *string
		var primaryJobDescription *string
		var primaryJobRequirements []string
		var primaryJobEligibility map[string]any
		if len(jobs) > 0 {
			if value, ok := jobs[0]["job_title"].(*string); ok {
				primaryJobTitle = value
			}
			if value, ok := jobs[0]["job_description"].(*string); ok {
				primaryJobDescription = value
			}
			if value, ok := jobs[0]["job_requirements"].([]string); ok {
				primaryJobRequirements = value
			}
			if value, ok := jobs[0]["job_eligibility_criteria"].(map[string]any); ok {
				primaryJobEligibility = value
			}
		}
		if primaryJobTitle == nil {
			primaryJobTitle = profile.JobTitle
		}
		if primaryJobDescription == nil {
			primaryJobDescription = profile.JobDescription
		}
		if len(primaryJobRequirements) == 0 {
			primaryJobRequirements = handlers.DecodeJSONStringArray(profile.JobRequirements)
		}
		if primaryJobEligibility == nil {
			primaryJobEligibility = handlers.DecodeJSONMap(profile.JobEligibility)
		}

		divisions = append(divisions, map[string]any{
			"id":                       profile.ID,
			"name":                     profile.Name,
			"description":              profile.Description,
			"manager_name":             profile.ManagerName,
			"capacity":                 profile.Capacity,
			"current_staff":            currentStaff,
			"available_slots":          availableSlots,
			"is_hiring":                isHiring,
			"job_title":                primaryJobTitle,
			"job_description":          primaryJobDescription,
			"job_requirements":         primaryJobRequirements,
			"job_eligibility_criteria": primaryJobEligibility,
			"jobs":                     jobs,
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
		"divisions":            divisions,
		"stats":                stats,
		"flash":                gin.H{"success": "", "error": ""},
		"sidebarNotifications": handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func SuperAdminDivisionsStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	var req CreateDivisionRequest
	_ = c.ShouldBind(&req)

	if req.Name == "" {
		if value, ok := c.GetPostForm("name"); ok {
			req.Name = value
		}
	}
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

	name := services.NormalizeDivisionName(req.Name)
	descriptionValue := normalizeOptionalText(req.Description)
	managerValue := normalizeOptionalText(req.ManagerName)
	capacity := 0
	if req.Capacity != nil {
		capacity = *req.Capacity
	}

	validationErrors := handlers.FieldErrors{}
	if name == "" {
		validationErrors["name"] = "Nama divisi wajib diisi."
	}
	if capacity < 0 {
		validationErrors["capacity"] = "Kapasitas divisi tidak boleh kurang dari 0."
	}
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	db := middleware.GetDB(c)
	existingID, err := dbrepo.FindDivisionProfileIDByName(db, name)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memvalidasi nama divisi")
		return
	}
	if existingID != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"name": "Nama divisi sudah digunakan."})
		return
	}

	now := time.Now()
	id, err := dbrepo.CreateDivisionProfile(db, dbrepo.CreateDivisionProfileInput{
		Name:        name,
		Description: descriptionValue,
		ManagerName: managerValue,
		Capacity:    capacity,
		Now:         now,
	})
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menambahkan divisi")
		return
	}

	departemenCount, err := dbrepo.CountDepartemenByName(db, name)
	if err == nil && departemenCount == 0 {
		code := services.DivisionCodeFromName(name)
		if code != "" {
			_ = dbrepo.CreateDepartemen(db, name, code, now)
		}
	}

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Divisions",
		Action:      "CREATE_DIVISION",
		EntityType:  "division_profile",
		EntityID:    strconv.FormatInt(id, 10),
		Description: "Menambahkan divisi baru.",
		NewValues: map[string]any{
			"id":          id,
			"name":        name,
			"description": descriptionValue,
			"manager":     managerValue,
			"capacity":    capacity,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"flash":    gin.H{"success": "Divisi berhasil ditambahkan."},
		"division": gin.H{"id": id, "name": name},
	})
}

func SuperAdminDivisionsUpdate(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	idRaw := c.Param("id")
	id, err := strconv.ParseInt(strings.TrimSpace(idRaw), 10, 64)
	if err != nil || id <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID divisi tidak valid")
		return
	}

	var req UpdateDivisionRequest
	_ = c.ShouldBind(&req)

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
	profile, err := dbrepo.GetDivisionProfileByID(db, id)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat divisi")
		return
	}
	if profile == nil {
		handlers.JSONError(c, http.StatusNotFound, "Divisi tidak ditemukan")
		return
	}

	currentStaff, err := dbrepo.CountActiveDivisionUsers(db, profile.Name)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menghitung staff divisi")
		return
	}

	capacity := profile.Capacity
	if req.Capacity != nil {
		capacity = *req.Capacity
	}
	if capacity < currentStaff {
		handlers.ValidationErrors(c, handlers.FieldErrors{"capacity": "Kapasitas divisi tidak boleh kurang dari jumlah staff saat ini."})
		return
	}

	descriptionValue := profile.Description
	if req.Description != nil {
		descriptionValue = normalizeOptionalText(req.Description)
	}
	managerValue := profile.ManagerName
	if req.ManagerName != nil {
		managerValue = normalizeOptionalText(req.ManagerName)
	}

	err = dbrepo.UpdateDivisionProfile(db, dbrepo.UpdateDivisionProfileInput{
		ID:          id,
		Description: descriptionValue,
		ManagerName: managerValue,
		Capacity:    capacity,
		UpdatedAt:   time.Now(),
	})
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui divisi")
		return
	}

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Divisions",
		Action:      "UPDATE_DIVISION",
		EntityType:  "division_profile",
		EntityID:    strconv.FormatInt(id, 10),
		Description: "Memperbarui data divisi.",
		OldValues: map[string]any{
			"description": profile.Description,
			"manager":     profile.ManagerName,
			"capacity":    profile.Capacity,
		},
		NewValues: map[string]any{
			"description": descriptionValue,
			"manager":     managerValue,
			"capacity":    capacity,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"flash": gin.H{"success": "Divisi berhasil diperbarui."},
	})
}

func SuperAdminDivisionsDelete(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	idRaw := c.Param("id")
	id, err := strconv.ParseInt(strings.TrimSpace(idRaw), 10, 64)
	if err != nil || id <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID divisi tidak valid")
		return
	}

	db := middleware.GetDB(c)
	profile, err := dbrepo.GetDivisionProfileByID(db, id)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat divisi")
		return
	}
	if profile == nil {
		handlers.JSONError(c, http.StatusNotFound, "Divisi tidak ditemukan")
		return
	}

	currentStaff, err := dbrepo.CountActiveDivisionUsers(db, profile.Name)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menghitung staff divisi")
		return
	}
	if currentStaff > 0 {
		handlers.ValidationErrors(c, handlers.FieldErrors{"division": "Divisi masih memiliki staff/admin aktif sehingga tidak dapat dihapus."})
		return
	}

	if err := dbrepo.DeleteDivisionProfileByID(db, id); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menghapus divisi")
		return
	}

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Divisions",
		Action:      "DELETE_DIVISION",
		EntityType:  "division_profile",
		EntityID:    strconv.FormatInt(id, 10),
		Description: "Menghapus divisi.",
		OldValues: map[string]any{
			"name":        profile.Name,
			"description": profile.Description,
			"manager":     profile.ManagerName,
			"capacity":    profile.Capacity,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"flash": gin.H{"success": "Divisi berhasil dihapus."},
	})
}
