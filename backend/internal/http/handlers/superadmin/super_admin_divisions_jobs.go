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

	validationErrors := handlers.FieldErrors{}
	if strings.TrimSpace(req.JobTitle) == "" {
		validationErrors["job_title"] = "Judul pekerjaan wajib diisi."
	}
	if strings.TrimSpace(req.JobDescription) == "" {
		validationErrors["job_description"] = "Deskripsi pekerjaan wajib diisi."
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
	now := time.Now()
	currentStaff, _ := dbrepo.CountActiveDivisionUsers(db, profile.Name)
	availableSlots := profile.Capacity - currentStaff

	actionLabel := "menambahkan"
	if req.JobID != nil {
		existing, err := dbrepo.GetActiveDivisionJobByID(db, *req.JobID, divisionID)
		if err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat lowongan")
			return
		}
		if existing == nil {
			handlers.JSONError(c, http.StatusNotFound, "Lowongan tidak ditemukan")
			return
		}
		err = dbrepo.UpdateDivisionJob(db, dbrepo.DivisionJobMutationInput{
			ID:                *req.JobID,
			DivisionProfileID: divisionID,
			JobTitle:          req.JobTitle,
			JobDescription:    req.JobDescription,
			JobRequirements:   string(requirementsBytes),
			JobEligibility:    string(criteriaBytes),
			Now:               now,
		})
		if err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui lowongan. Coba lagi.")
			return
		}
		actionLabel = "memperbarui"
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
			"job_requirements":    cleaned,
			"eligibility":         criteriaForAudit,
			"available_slots_now": availableSlots,
		},
	})

	message := "Lowongan pekerjaan berhasil dipublikasikan."
	if req.JobID != nil {
		message = "Lowongan pekerjaan berhasil diperbarui."
	}
	c.JSON(http.StatusOK, gin.H{
		"flash": gin.H{"success": message},
	})
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
			"division_name":    profile.Name,
			"job_id":           existing.ID,
			"job_title":        existing.JobTitle,
			"job_description":  existing.JobDescription,
			"job_requirements": handlers.DecodeJSONStringArray(existing.JobRequirements),
			"is_active":        existing.IsActive,
		}
		_ = dbrepo.DeactivateDivisionJob(db, divisionID, *jobID, time.Now())
	} else {
		oldValues = map[string]any{
			"division_name":    profile.Name,
			"job_title":        profile.JobTitle,
			"job_description":  profile.JobDescription,
			"job_requirements": handlers.DecodeJSONStringArray(profile.JobRequirements),
			"is_hiring":        profile.IsHiring,
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

func loadActiveDivisionJobsByDivisionIDs(db *sqlx.DB, divisionIDs []int64) map[int64][]map[string]any {
	result := make(map[int64][]map[string]any, len(divisionIDs))
	if db == nil || len(divisionIDs) == 0 {
		return result
	}

	idSet := make(map[int64]struct{}, len(divisionIDs))
	for _, divisionID := range divisionIDs {
		idSet[divisionID] = struct{}{}
	}

	rows, err := dbrepo.ListActiveDivisionJobs(db)
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
			"job_requirements":         handlers.DecodeJSONStringArray(row.JobRequirements),
			"job_eligibility_criteria": handlers.DecodeJSONMap(row.JobEligibility),
			"is_active":                row.IsActive,
			"opened_at":                row.OpenedAt,
		})
	}

	return result
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
