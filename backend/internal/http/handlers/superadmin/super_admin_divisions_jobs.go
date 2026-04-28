package superadmin

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/http/handlers"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func SuperAdminDivisionsOpenJob(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	divisionID, parseErr := strconv.ParseInt(id, 10, 64)
	if parseErr != nil || divisionID <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID divisi tidak valid")
		return
	}
	db := middleware.GetDB(c)

	profile, err := dbrepo.GetDivisionProfileByID(db, divisionID)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat divisi")
		return
	}
	if profile == nil {
		handlers.JSONError(c, http.StatusNotFound, "Divisi tidak ditemukan")
		return
	}

	var req OpenJobRequest
	if err := c.ShouldBind(&req); err != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"_form": "Data tidak valid. Pastikan semua field diisi dengan benar."})
		return
	}

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
	if req.JobID == nil {
		if raw := strings.TrimSpace(c.PostForm("job_id")); raw != "" {
			if parsedID, err := strconv.ParseInt(raw, 10, 64); err == nil && parsedID > 0 {
				req.JobID = &parsedID
			}
		}
	}
	if req.JobSalaryMin == nil {
		if raw := strings.TrimSpace(c.PostForm("job_salary_min")); raw != "" {
			if parsedSalary, ok := parseAnyInt(raw); ok {
				req.JobSalaryMin = &parsedSalary
			}
		}
	}

	now := time.Now()
	currentStaff, _ := dbrepo.CountActiveDivisionUsers(db, profile.Name)
	availableSlots := profile.Capacity - currentStaff

	var existingJob *models.DivisionJob
	if req.JobID != nil {
		existing, err := dbrepo.GetDivisionJobByID(db, *req.JobID, divisionID)
		if err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat lowongan")
			return
		}
		if existing == nil {
			handlers.JSONError(c, http.StatusNotFound, "Lowongan tidak ditemukan")
			return
		}
		existingJob = existing
	}

	isReopenOnlyRequest := req.JobID != nil &&
		strings.TrimSpace(req.JobTitle) == "" &&
		strings.TrimSpace(req.JobDescription) == "" &&
		len(req.JobRequirements) == 0 &&
		req.JobSalaryMin == nil &&
		strings.TrimSpace(req.JobWorkMode) == "" &&
		(req.JobEligibilityCriteria == nil || len(req.JobEligibilityCriteria) == 0)

	if isReopenOnlyRequest {
		if existingJob == nil {
			handlers.JSONError(c, http.StatusNotFound, "Lowongan tidak ditemukan")
			return
		}
		if existingJob.IsActive {
			c.JSON(http.StatusOK, gin.H{
				"flash": gin.H{"success": "Lowongan sudah aktif."},
			})
			return
		}
		if availableSlots <= 0 {
			handlers.ValidationErrors(c, handlers.FieldErrors{"capacity": "Kapasitas divisi saat ini penuh. Tingkatkan kapasitas sebelum membuka kembali lowongan."})
			return
		}
		if err := dbrepo.ReactivateDivisionJob(db, divisionID, existingJob.ID, now); err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal membuka kembali lowongan. Coba lagi.")
			return
		}
		syncDivisionProfilePrimaryJob(db, divisionID)

		requirementsForAudit := handlers.DecodeJSONStringArray(existingJob.JobRequirements)
		criteriaForAudit := handlers.DecodeJSONMap(existingJob.JobEligibility)

		actorID := user.ID
		appendRecruitmentScoringAudit(
			db,
			&actorID,
			recruitmentAuditActionConfigUpdated,
			profile.Name,
			existingJob.JobTitle,
			map[string]any{
				"action":             "membuka kembali",
				"job_title":          existingJob.JobTitle,
				"job_salary_min":     existingJob.JobSalaryMin,
				"job_work_mode":      existingJob.JobWorkMode,
				"job_requirements":   requirementsForAudit,
				"requirements_count": len(requirementsForAudit),
				"eligibility":        criteriaForAudit,
			},
		)

		appendAuditLog(c, db, auditLogPayload{
			Module:      "Divisions",
			Action:      "OPEN_JOB",
			EntityType:  "division_profile",
			EntityID:    id,
			Description: "Membuka kembali lowongan divisi.",
			NewValues: map[string]any{
				"action":              "membuka kembali",
				"division_name":       profile.Name,
				"job_title":           existingJob.JobTitle,
				"job_description":     existingJob.JobDescription,
				"job_salary_min":      existingJob.JobSalaryMin,
				"job_work_mode":       existingJob.JobWorkMode,
				"job_requirements":    requirementsForAudit,
				"eligibility":         criteriaForAudit,
				"available_slots_now": availableSlots,
			},
		})

		c.JSON(http.StatusOK, gin.H{
			"flash": gin.H{"success": "Lowongan pekerjaan berhasil dibuka kembali."},
		})
		return
	}

	validationErrors := handlers.FieldErrors{}
	if strings.TrimSpace(req.JobTitle) == "" {
		validationErrors["job_title"] = "Judul pekerjaan wajib diisi."
	}
	if strings.TrimSpace(req.JobDescription) == "" {
		validationErrors["job_description"] = "Deskripsi pekerjaan wajib diisi."
	}
	if req.JobSalaryMin == nil {
		validationErrors["job_salary_min"] = "Gaji wajib diisi."
	} else if *req.JobSalaryMin < 500000 {
		validationErrors["job_salary_min"] = "Gaji minimal Rp 500.000."
	}
	workMode := normalizeJobWorkMode(req.JobWorkMode)
	if workMode == "" {
		validationErrors["job_work_mode"] = "Mode kerja wajib dipilih."
	}
	handlers.ValidateFieldLength(validationErrors, "job_title", "Judul pekerjaan", req.JobTitle, 180)
	handlers.ValidateFieldLength(validationErrors, "job_description", "Deskripsi pekerjaan", req.JobDescription, 6000)

	cleaned := []string{}
	for _, reqStr := range req.JobRequirements {
		reqStr = strings.TrimSpace(reqStr)
		if reqStr != "" {
			if len([]rune(reqStr)) > 400 {
				validationErrors["job_requirements"] = "Setiap persyaratan maksimal 400 karakter."
				continue
			}
			cleaned = append(cleaned, reqStr)
		}
	}
	if len(cleaned) == 0 {
		validationErrors["job_requirements"] = "Mohon tambahkan minimal satu persyaratan yang valid."
	}

	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	criteria := req.JobEligibilityCriteria
	if criteria == nil {
		criteria = make(map[string]interface{})
	}
	criteria = sanitizeEligibilityCriteria(criteria)

	criteriaBytes, _ := json.Marshal(criteria)
	requirementsBytes, _ := json.Marshal(cleaned)

	actionLabel := "menambahkan"
	if req.JobID != nil {
		if existingJob == nil {
			handlers.JSONError(c, http.StatusNotFound, "Lowongan tidak ditemukan")
			return
		}
		if !existingJob.IsActive && availableSlots <= 0 {
			handlers.ValidationErrors(c, handlers.FieldErrors{"capacity": "Kapasitas divisi saat ini penuh. Tingkatkan kapasitas sebelum membuka kembali lowongan."})
			return
		}
		err = dbrepo.UpdateDivisionJob(db, dbrepo.DivisionJobMutationInput{
			ID:                *req.JobID,
			DivisionProfileID: divisionID,
			JobTitle:          req.JobTitle,
			JobDescription:    req.JobDescription,
			JobRequirements:   string(requirementsBytes),
			JobEligibility:    string(criteriaBytes),
			JobSalaryMin:      req.JobSalaryMin,
			JobWorkMode:       &workMode,
			Now:               now,
		})
		if err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui lowongan. Coba lagi.")
			return
		}
		if !existingJob.IsActive {
			if err := dbrepo.ReactivateDivisionJob(db, divisionID, *req.JobID, now); err != nil {
				handlers.JSONError(c, http.StatusInternalServerError, "Gagal membuka kembali lowongan. Coba lagi.")
				return
			}
			actionLabel = "membuka kembali"
		} else {
			actionLabel = "memperbarui"
		}
	} else {
		if availableSlots <= 0 {
			handlers.ValidationErrors(c, handlers.FieldErrors{"capacity": "Kapasitas divisi saat ini penuh. Tingkatkan kapasitas sebelum membuka lowongan."})
			return
		}
		_, err := dbrepo.CreateDivisionJob(db, dbrepo.DivisionJobMutationInput{
			DivisionProfileID: divisionID,
			JobTitle:          req.JobTitle,
			JobDescription:    req.JobDescription,
			JobRequirements:   string(requirementsBytes),
			JobEligibility:    string(criteriaBytes),
			JobSalaryMin:      req.JobSalaryMin,
			JobWorkMode:       &workMode,
			Now:               now,
		})
		if err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal menyimpan lowongan. Coba lagi.")
			return
		}
	}

	syncDivisionProfilePrimaryJob(db, divisionID)

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
			"action":             actionLabel,
			"job_title":          req.JobTitle,
			"job_salary_min":     req.JobSalaryMin,
			"job_work_mode":      workMode,
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
		Description: "Mengelola lowongan pada divisi.",
		NewValues: map[string]any{
			"action":              actionLabel,
			"division_name":       profile.Name,
			"job_title":           req.JobTitle,
			"job_description":     req.JobDescription,
			"job_salary_min":      req.JobSalaryMin,
			"job_work_mode":       workMode,
			"job_requirements":    cleaned,
			"eligibility":         criteriaForAudit,
			"available_slots_now": availableSlots,
		},
	})

	message := "Lowongan pekerjaan berhasil dipublikasikan."
	if req.JobID != nil {
		if actionLabel == "membuka kembali" {
			message = "Lowongan pekerjaan berhasil dibuka kembali."
		} else {
			message = "Lowongan pekerjaan berhasil diperbarui."
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"flash": gin.H{"success": message},
	})
}

func normalizeJobWorkMode(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = strings.ReplaceAll(normalized, "-", "_")
	normalized = strings.ReplaceAll(normalized, " ", "_")

	switch normalized {
	case "wfo":
		return "WFO"
	case "wfa":
		return "WFA"
	case "fleksibel", "flexible", "hybrid", "wfa_wfo", "wfo_wfa":
		return "Fleksibel"
	default:
		return ""
	}
}

func SuperAdminDivisionsCloseJob(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	divisionID, parseErr := strconv.ParseInt(id, 10, 64)
	if parseErr != nil || divisionID <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID divisi tidak valid")
		return
	}
	db := middleware.GetDB(c)
	profile, err := dbrepo.GetDivisionProfileByID(db, divisionID)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat divisi")
		return
	}
	if profile == nil {
		handlers.JSONError(c, http.StatusNotFound, "Divisi tidak ditemukan")
		return
	}

	var jobID *int64
	if raw := strings.TrimSpace(c.Query("job_id")); raw != "" {
		if parsedID, err := strconv.ParseInt(raw, 10, 64); err == nil && parsedID > 0 {
			jobID = &parsedID
		}
	}
	if jobID == nil {
		if raw := strings.TrimSpace(c.PostForm("job_id")); raw != "" {
			if parsedID, err := strconv.ParseInt(raw, 10, 64); err == nil && parsedID > 0 {
				jobID = &parsedID
			}
		}
	}

	var oldValues map[string]any
	if jobID != nil {
		existing, err := dbrepo.GetActiveDivisionJobByID(db, *jobID, divisionID)
		if err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat lowongan")
			return
		}
		if existing == nil {
			handlers.JSONError(c, http.StatusNotFound, "Lowongan tidak ditemukan")
			return
		}
		oldValues = map[string]any{
			"division_name":            profile.Name,
			"job_id":                   existing.ID,
			"job_title":                existing.JobTitle,
			"job_description":          existing.JobDescription,
			"job_salary_min":           existing.JobSalaryMin,
			"job_work_mode":            existing.JobWorkMode,
			"job_requirements":         handlers.DecodeJSONStringArray(existing.JobRequirements),
			"job_eligibility_criteria": handlers.DecodeJSONMap(existing.JobEligibility),
			"is_active":                existing.IsActive,
		}
		_ = dbrepo.DeactivateDivisionJob(db, divisionID, *jobID, time.Now())
	} else {
		oldValues = map[string]any{
			"division_name":            profile.Name,
			"job_title":                profile.JobTitle,
			"job_description":          profile.JobDescription,
			"job_salary_min":           profile.JobSalaryMin,
			"job_work_mode":            profile.JobWorkMode,
			"job_requirements":         handlers.DecodeJSONStringArray(profile.JobRequirements),
			"job_eligibility_criteria": handlers.DecodeJSONMap(profile.JobEligibility),
			"is_hiring":                profile.IsHiring,
		}
		_ = dbrepo.DeactivateAllDivisionJobs(db, divisionID, time.Now())
	}
	syncDivisionProfilePrimaryJob(db, divisionID)

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Divisions",
		Action:      "CLOSE_JOB",
		EntityType:  "division_profile",
		EntityID:    id,
		Description: "Menutup lowongan divisi.",
		OldValues:   oldValues,
		NewValues: map[string]any{
			"is_hiring": false,
		},
	})

	message := "Semua lowongan pekerjaan telah ditutup."
	if jobID != nil {
		message = "Lowongan pekerjaan telah ditutup."
	}
	c.JSON(http.StatusOK, gin.H{
		"flash": gin.H{"success": message},
	})
}

func loadDivisionJobsByDivisionIDs(db *sqlx.DB, divisionIDs []int64) map[int64][]map[string]any {
	result := make(map[int64][]map[string]any, len(divisionIDs))
	if db == nil || len(divisionIDs) == 0 {
		return result
	}

	idSet := make(map[int64]struct{}, len(divisionIDs))
	for _, divisionID := range divisionIDs {
		idSet[divisionID] = struct{}{}
	}

	rows, err := dbrepo.ListDivisionJobsByDivisionIDs(db, divisionIDs)
	if err != nil {
		return result
	}

	for _, row := range rows {
		if _, ok := idSet[row.DivisionProfileID]; !ok {
			continue
		}
		title := strings.TrimSpace(row.JobTitle)
		desc := strings.TrimSpace(row.JobDescription)
		var titlePtr *string
		var descPtr *string
		if title != "" {
			titleValue := title
			titlePtr = &titleValue
		}
		if desc != "" {
			descValue := desc
			descPtr = &descValue
		}
		result[row.DivisionProfileID] = append(result[row.DivisionProfileID], map[string]any{
			"id":                       row.ID,
			"job_title":                titlePtr,
			"job_description":          descPtr,
			"job_salary_min":           row.JobSalaryMin,
			"job_work_mode":            row.JobWorkMode,
			"job_requirements":         handlers.DecodeJSONStringArray(row.JobRequirements),
			"job_eligibility_criteria": handlers.DecodeJSONMap(row.JobEligibility),
			"is_active":                row.IsActive,
			"opened_at":                row.OpenedAt,
			"closed_at":                row.ClosedAt,
		})
	}

	return result
}

func loadClosedDivisionJobsFromAuditByDivisionIDs(db *sqlx.DB, divisionIDs []int64) map[int64][]map[string]any {
	result := make(map[int64][]map[string]any, len(divisionIDs))
	if db == nil || len(divisionIDs) == 0 {
		return result
	}

	query, args, err := sqlx.In(
		`SELECT entity_id, old_values, created_at
		 FROM audit_logs
		 WHERE module = 'Divisions'
		   AND action = 'CLOSE_JOB'
		   AND entity_id IN (?)
		 ORDER BY id DESC`,
		divisionIDs,
	)
	if err != nil {
		return result
	}

	query = db.Rebind(query)
	rows := []struct {
		EntityID  string          `db:"entity_id"`
		OldValues json.RawMessage `db:"old_values"`
		CreatedAt *time.Time      `db:"created_at"`
	}{}
	if err := db.Select(&rows, query, args...); err != nil {
		return result
	}

	seenByDivision := make(map[int64]map[string]struct{}, len(divisionIDs))
	for _, row := range rows {
		divisionID, parseErr := strconv.ParseInt(strings.TrimSpace(row.EntityID), 10, 64)
		if parseErr != nil || divisionID <= 0 {
			continue
		}

		oldValues := map[string]any{}
		if len(row.OldValues) == 0 {
			continue
		}
		if err := json.Unmarshal(row.OldValues, &oldValues); err != nil {
			continue
		}

		jobTitle := strings.TrimSpace(handlers.AnyToString(oldValues["job_title"]))
		jobDescription := strings.TrimSpace(handlers.AnyToString(oldValues["job_description"]))
		if jobTitle == "" && jobDescription == "" {
			continue
		}

		requirements := []string{}
		if rawRequirements, ok := oldValues["job_requirements"]; ok {
			if list, ok := rawRequirements.([]any); ok {
				for _, item := range list {
					req := strings.TrimSpace(handlers.AnyToString(item))
					if req != "" {
						requirements = append(requirements, req)
					}
				}
			}
		}

		eligibility := map[string]any{}
		if rawEligibility, ok := oldValues["eligibility"]; ok {
			if parsedEligibility, ok := rawEligibility.(map[string]any); ok {
				eligibility = parsedEligibility
			}
		}
		if len(eligibility) == 0 {
			if rawEligibility, ok := oldValues["job_eligibility_criteria"]; ok {
				if parsedEligibility, ok := rawEligibility.(map[string]any); ok {
					eligibility = parsedEligibility
				}
			}
		}
		jobSalaryMin, _ := parseAnyInt(oldValues["job_salary_min"])
		var jobSalaryMinPtr *int
		if jobSalaryMin > 0 {
			jobSalaryMinPtr = &jobSalaryMin
		}
		jobWorkMode := strings.TrimSpace(handlers.AnyToString(oldValues["job_work_mode"]))
		var jobWorkModePtr *string
		if jobWorkMode != "" {
			jobWorkModePtr = &jobWorkMode
		}

		dedupeKey := strings.ToLower(jobTitle + "|" + jobDescription + "|" + strings.Join(requirements, "|"))
		if _, exists := seenByDivision[divisionID]; !exists {
			seenByDivision[divisionID] = map[string]struct{}{}
		}
		if _, exists := seenByDivision[divisionID][dedupeKey]; exists {
			continue
		}
		seenByDivision[divisionID][dedupeKey] = struct{}{}

		var titlePtr *string
		var descriptionPtr *string
		if jobTitle != "" {
			value := jobTitle
			titlePtr = &value
		}
		if jobDescription != "" {
			value := jobDescription
			descriptionPtr = &value
		}

		result[divisionID] = append(result[divisionID], map[string]any{
			"id":                       nil,
			"job_title":                titlePtr,
			"job_description":          descriptionPtr,
			"job_salary_min":           jobSalaryMinPtr,
			"job_work_mode":            jobWorkModePtr,
			"job_requirements":         requirements,
			"job_eligibility_criteria": eligibility,
			"is_active":                false,
			"opened_at":                nil,
			"closed_at":                row.CreatedAt,
		})
	}

	return result
}

func mergeDivisionJobsWithClosedAuditFallback(existingJobs []map[string]any, closedAuditJobs []map[string]any) []map[string]any {
	if len(closedAuditJobs) == 0 {
		return existingJobs
	}

	merged := make([]map[string]any, 0, len(existingJobs)+len(closedAuditJobs))
	merged = append(merged, existingJobs...)

	seenSignatures := make(map[string]struct{}, len(existingJobs))
	for _, job := range existingJobs {
		signature := buildDivisionJobSignature(job)
		if signature == "" {
			continue
		}
		seenSignatures[signature] = struct{}{}
	}

	for _, closedJob := range closedAuditJobs {
		signature := buildDivisionJobSignature(closedJob)
		if signature == "" {
			continue
		}
		if _, exists := seenSignatures[signature]; exists {
			continue
		}
		seenSignatures[signature] = struct{}{}
		merged = append(merged, closedJob)
	}

	return merged
}

func buildDivisionJobSignature(job map[string]any) string {
	title := strings.ToLower(strings.TrimSpace(handlers.AnyToString(job["job_title"])))
	description := strings.ToLower(strings.TrimSpace(handlers.AnyToString(job["job_description"])))

	requirements := []string{}
	switch value := job["job_requirements"].(type) {
	case []string:
		for _, item := range value {
			requirement := strings.ToLower(strings.TrimSpace(item))
			if requirement != "" {
				requirements = append(requirements, requirement)
			}
		}
	case []any:
		for _, item := range value {
			requirement := strings.ToLower(strings.TrimSpace(handlers.AnyToString(item)))
			if requirement != "" {
				requirements = append(requirements, requirement)
			}
		}
	}

	if title == "" && description == "" && len(requirements) == 0 {
		return ""
	}

	salary := strings.TrimSpace(handlers.AnyToString(job["job_salary_min"]))
	workMode := strings.ToLower(strings.TrimSpace(handlers.AnyToString(job["job_work_mode"])))
	return title + "|" + description + "|" + strings.Join(requirements, "|") + "|" + salary + "|" + workMode
}

func syncDivisionProfilePrimaryJob(db *sqlx.DB, divisionID int64) {
	if db == nil || divisionID <= 0 {
		return
	}

	now := time.Now()
	primary, err := dbrepo.GetPrimaryActiveDivisionJob(db, divisionID)
	if err != nil {
		return
	}
	if primary == nil {
		_ = dbrepo.ClearDivisionProfilePrimaryJob(db, divisionID, now)
		return
	}
	_ = dbrepo.SetDivisionProfilePrimaryJob(db, divisionID, *primary, now)
}
