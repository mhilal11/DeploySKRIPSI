package handlers

import (
	"database/sql"
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

type CreateDivisionRequest struct {
	Name        string  `json:"name" form:"name"`
	Description *string `json:"description" form:"description"`
	ManagerName *string `json:"manager_name" form:"manager_name"`
	Capacity    *int    `json:"capacity" form:"capacity"`
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
		"divisions":            divisions,
		"stats":                stats,
		"flash":                gin.H{"success": "", "error": ""},
		"sidebarNotifications": computeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func SuperAdminDivisionsStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
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

	errors := FieldErrors{}
	if name == "" {
		errors["name"] = "Nama divisi wajib diisi."
	}
	if capacity < 0 {
		errors["capacity"] = "Kapasitas divisi tidak boleh kurang dari 0."
	}
	if len(errors) > 0 {
		ValidationErrors(c, errors)
		return
	}

	db := middleware.GetDB(c)
	var existingID int64
	checkErr := db.Get(&existingID, "SELECT id FROM division_profiles WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1", name)
	if checkErr == nil {
		ValidationErrors(c, FieldErrors{"name": "Nama divisi sudah digunakan."})
		return
	}
	if checkErr != sql.ErrNoRows {
		JSONError(c, http.StatusInternalServerError, "Gagal memvalidasi nama divisi")
		return
	}

	now := time.Now()
	result, err := db.Exec(
		"INSERT INTO division_profiles (name, description, manager_name, capacity, is_hiring, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)",
		name,
		descriptionValue,
		managerValue,
		capacity,
		now,
		now,
	)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal menambahkan divisi")
		return
	}
	id, _ := result.LastInsertId()

	var departemenCount int
	_ = db.Get(&departemenCount, "SELECT COUNT(*) FROM departemen WHERE LOWER(TRIM(nama)) = LOWER(TRIM(?))", name)
	if departemenCount == 0 {
		code := services.DivisionCodeFromName(name)
		if code != "" {
			_, _ = db.Exec("INSERT INTO departemen (nama, kode, created_at, updated_at) VALUES (?, ?, ?, ?)", name, code, now, now)
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

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Divisions",
		Action:      "UPDATE_DIVISION",
		EntityType:  "division_profile",
		EntityID:    id,
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
	if currentStaff > 0 {
		ValidationErrors(c, FieldErrors{"division": "Divisi masih memiliki staff/admin aktif sehingga tidak dapat dihapus."})
		return
	}

	if _, err := db.Exec("DELETE FROM division_profiles WHERE id = ?", id); err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal menghapus divisi")
		return
	}

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Divisions",
		Action:      "DELETE_DIVISION",
		EntityType:  "division_profile",
		EntityID:    id,
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
	criteria = sanitizeEligibilityCriteria(criteria)

	criteriaBytes, _ := json.Marshal(criteria)
	requirementsBytes, _ := json.Marshal(cleaned)

	_, err := db.Exec(`UPDATE division_profiles SET is_hiring = 1, job_title = ?, job_description = ?, job_requirements = ?, job_eligibility_criteria = ?, hiring_opened_at = ?, updated_at = ? WHERE id = ?`,
		req.JobTitle, req.JobDescription, string(requirementsBytes), string(criteriaBytes), time.Now(), time.Now(), id)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal menyimpan lowongan. Coba lagi.")
		return
	}

	criteriaForAudit := map[string]any{}
	for key, value := range criteria {
		criteriaForAudit[key] = value
	}
	actorID := user.ID
	appendRecruitmentScoringAudit(
		db,
		&actorID,
		recruitmentAuditActionConfigUpdated,
		profile.Name,
		req.JobTitle,
		map[string]any{
			"job_title":          req.JobTitle,
			"job_requirements":   cleaned,
			"requirements_count": len(cleaned),
			"eligibility":        criteriaForAudit,
		},
	)

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Divisions",
		Action:      "OPEN_JOB",
		EntityType:  "division_profile",
		EntityID:    id,
		Description: "Membuka lowongan pada divisi.",
		NewValues: map[string]any{
			"division_name":       profile.Name,
			"job_title":           req.JobTitle,
			"job_description":     req.JobDescription,
			"job_requirements":    cleaned,
			"eligibility":         criteriaForAudit,
			"is_hiring":           true,
			"available_slots_now": availableSlots,
		},
	})

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
	var profile models.DivisionProfile
	_ = db.Get(&profile, "SELECT * FROM division_profiles WHERE id = ?", id)
	_, _ = db.Exec(`UPDATE division_profiles SET is_hiring = 0, job_title = NULL, job_description = NULL, job_requirements = NULL, hiring_opened_at = NULL WHERE id = ?`, id)

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Divisions",
		Action:      "CLOSE_JOB",
		EntityType:  "division_profile",
		EntityID:    id,
		Description: "Menutup lowongan divisi.",
		OldValues: map[string]any{
			"division_name":    profile.Name,
			"job_title":        profile.JobTitle,
			"job_description":  profile.JobDescription,
			"job_requirements": decodeJSONStringArray(profile.JobRequirements),
			"is_hiring":        profile.IsHiring,
		},
		NewValues: map[string]any{
			"is_hiring": false,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"flash": gin.H{"success": "Lowongan pekerjaan telah ditutup."},
	})
}

func sanitizeEligibilityCriteria(input map[string]interface{}) map[string]interface{} {
	out := make(map[string]interface{})
	if input == nil {
		return out
	}

	setIntRange := func(key string, minValue, maxValue int) {
		if value, ok := parseAnyInt(input[key]); ok {
			if value < minValue {
				value = minValue
			}
			if value > maxValue {
				value = maxValue
			}
			out[key] = value
		}
	}

	setIntRange("min_age", 17, 65)
	setIntRange("max_age", 17, 65)
	setIntRange("min_experience_years", 0, 40)

	if minAge, hasMin := out["min_age"].(int); hasMin {
		if maxAge, hasMax := out["max_age"].(int); hasMax && maxAge < minAge {
			out["max_age"] = minAge
		}
	}

	if rawGender, ok := input["gender"]; ok {
		gender := strings.TrimSpace(rawToString(rawGender))
		if gender == "Laki-laki" || gender == "Perempuan" {
			out["gender"] = gender
		}
	}

	if rawEducation, ok := input["min_education"]; ok {
		education := strings.ToUpper(strings.TrimSpace(rawToString(rawEducation)))
		if education == "SMA" || education == "SMK" || education == "D1" || education == "D2" || education == "D3" || education == "D4" || education == "S1" || education == "S2" || education == "S3" {
			out["min_education"] = education
		}
	}

	if programs := parseStringArray(input["program_studies"], input["study_programs"], input["program_study"]); len(programs) > 0 {
		out["program_studies"] = programs
	}

	if rawWeights, ok := input["scoring_weights"]; ok {
		if weightsMap := mapStringAny(rawWeights); len(weightsMap) > 0 {
			weights := map[string]float64{}
			assignWeight := func(targetKey string, sourceKeys ...string) {
				for _, sourceKey := range sourceKeys {
					if value, exists := parseAnyFloat(weightsMap[sourceKey]); exists {
						if value < 0 {
							value = 0
						}
						if value > 100 {
							value = 100
						}
						weights[targetKey] = value
						return
					}
				}
			}

			assignWeight("education", "education", "edu")
			assignWeight("experience", "experience", "exp")
			assignWeight("skills", "skills", "skill")
			assignWeight("certification", "certification", "certifications", "cert")
			assignWeight("profile", "profile", "profile_completeness", "completeness")
			assignWeight("ai_screening", "ai_screening", "ai", "ai_cv", "cv_ai", "cv_screening")

			if len(weights) > 0 {
				out["scoring_weights"] = weights
			}
		}
	}

	if rawThresholds, ok := input["scoring_thresholds"]; ok {
		if thresholdMap := mapStringAny(rawThresholds); len(thresholdMap) > 0 {
			thresholds := map[string]float64{}
			assignThreshold := func(targetKey string, sourceKeys ...string) {
				for _, sourceKey := range sourceKeys {
					if value, exists := parseAnyFloat(thresholdMap[sourceKey]); exists {
						if value < 0 {
							value = 0
						}
						if value > 100 {
							value = 100
						}
						thresholds[targetKey] = value
						return
					}
				}
			}
			assignThreshold("priority", "priority", "priority_high")
			assignThreshold("recommended", "recommended")
			assignThreshold("consider", "consider")

			if len(thresholds) > 0 {
				out["scoring_thresholds"] = thresholds
			}
		}
	}

	if value, ok := parseAnyFloat(input["ineligible_penalty_per_failure"]); ok {
		if value < 0 {
			value = 0
		}
		if value > 40 {
			value = 40
		}
		out["ineligible_penalty_per_failure"] = value
	}

	if value, ok := parseAnyInt(input["extra_penalty_after_failed_criteria"]); ok {
		if value < 0 {
			value = 0
		}
		if value > 10 {
			value = 10
		}
		out["extra_penalty_after_failed_criteria"] = value
	}

	if value, ok := parseAnyFloat(input["extra_penalty_score"]); ok {
		if value < 0 {
			value = 0
		}
		if value > 40 {
			value = 40
		}
		out["extra_penalty_score"] = value
	}

	return out
}

func normalizeOptionalText(value *string) *string {
	if value == nil {
		return nil
	}
	clean := strings.TrimSpace(*value)
	if clean == "" {
		return nil
	}
	return &clean
}

func rawToString(value interface{}) string {
	switch v := value.(type) {
	case string:
		return v
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case int:
		return strconv.Itoa(v)
	default:
		return ""
	}
}

func parseAnyInt(value interface{}) (int, bool) {
	switch v := value.(type) {
	case int:
		return v, true
	case int64:
		return int(v), true
	case float64:
		return int(v), true
	case string:
		v = strings.TrimSpace(v)
		if v == "" {
			return 0, false
		}
		if parsed, err := strconv.Atoi(v); err == nil {
			return parsed, true
		}
		if parsed, err := strconv.ParseFloat(strings.ReplaceAll(v, ",", "."), 64); err == nil {
			return int(parsed), true
		}
	}
	return 0, false
}

func parseAnyFloat(value interface{}) (float64, bool) {
	switch v := value.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case string:
		v = strings.TrimSpace(v)
		if v == "" {
			return 0, false
		}
		if parsed, err := strconv.ParseFloat(strings.ReplaceAll(v, ",", "."), 64); err == nil {
			return parsed, true
		}
	}
	return 0, false
}

func mapStringAny(value interface{}) map[string]interface{} {
	switch data := value.(type) {
	case map[string]interface{}:
		return data
	default:
		return nil
	}
}

func parseStringArray(values ...interface{}) []string {
	seen := map[string]struct{}{}
	out := []string{}

	add := func(raw string) {
		cleaned := strings.TrimSpace(raw)
		if cleaned == "" {
			return
		}
		key := strings.ToLower(cleaned)
		if _, exists := seen[key]; exists {
			return
		}
		seen[key] = struct{}{}
		out = append(out, cleaned)
	}

	for _, value := range values {
		switch v := value.(type) {
		case []string:
			for _, item := range v {
				add(item)
			}
		case []interface{}:
			for _, item := range v {
				add(rawToString(item))
			}
		case string:
			normalized := strings.NewReplacer("\n", ",", ";", ",", "|", ",").Replace(v)
			for _, part := range strings.Split(normalized, ",") {
				add(part)
			}
		}
	}

	if len(out) > 10 {
		return out[:10]
	}
	return out
}
