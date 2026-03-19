package superadmin

import (
	"net/http"
	"strconv"

	"hris-backend/internal/http/handlers"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
)

func SuperAdminRecruitmentDelete(c *gin.Context) {
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
	existing, err := dbrepo.GetRecruitmentApplicationSummary(db, applicationID)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat lamaran")
		return
	}
	if existing == nil {
		handlers.JSONError(c, http.StatusNotFound, "Lamaran tidak ditemukan")
		return
	}
	if err := dbrepo.DeleteRecruitmentApplication(db, applicationID); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menghapus lamaran")
		return
	}

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Recruitment",
		Action:      "DELETE_APPLICATION",
		EntityType:  "application",
		EntityID:    id,
		Description: "Menghapus data lamaran kandidat.",
		OldValues: map[string]any{
			"id":       existing.ID,
			"name":     existing.FullName,
			"position": existing.Position,
			"division": existing.Division,
			"status":   existing.Status,
		},
	})
	c.JSON(http.StatusOK, gin.H{"status": "Lamaran berhasil dihapus."})
}

func SuperAdminOnboardingUpdateChecklist(c *gin.Context) {
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

	type onboardingChecklistPayload struct {
		ContractSigned      *bool `form:"contract_signed" json:"contract_signed"`
		InventoryHandover   *bool `form:"inventory_handover" json:"inventory_handover"`
		TrainingOrientation *bool `form:"training_orientation" json:"training_orientation"`
	}

	payload := onboardingChecklistPayload{}
	_ = c.ShouldBind(&payload)

	contractRaw := c.PostForm("contract_signed")
	inventoryRaw := c.PostForm("inventory_handover")
	trainingRaw := c.PostForm("training_orientation")

	resolveChecklistValue := func(pointerValue *bool, rawValue string) bool {
		if pointerValue != nil {
			return *pointerValue
		}
		return parseBool(rawValue) == 1
	}

	contractDone := resolveChecklistValue(payload.ContractSigned, contractRaw)
	inventoryDone := resolveChecklistValue(payload.InventoryHandover, inventoryRaw)
	trainingDone := resolveChecklistValue(payload.TrainingOrientation, trainingRaw)

	db := middleware.GetDB(c)
	previousChecklist := loadChecklist(db, applicationID)

	if err := dbrepo.UpsertOnboardingChecklist(
		db,
		applicationID,
		boolToInt(contractDone),
		boolToInt(inventoryDone),
		boolToInt(trainingDone),
	); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui checklist")
		return
	}

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Onboarding",
		Action:      "UPDATE_CHECKLIST",
		EntityType:  "onboarding_checklist",
		EntityID:    id,
		Description: "Memperbarui checklist onboarding kandidat.",
		OldValues: map[string]any{
			"contract_signed":      previousChecklist.ContractSigned,
			"inventory_handover":   previousChecklist.InventoryHandover,
			"training_orientation": previousChecklist.TrainingOrientation,
		},
		NewValues: map[string]any{
			"contract_signed":      contractDone,
			"inventory_handover":   inventoryDone,
			"training_orientation": trainingDone,
		},
	})

	c.JSON(http.StatusOK, gin.H{"status": "Progress onboarding berhasil disimpan."})
}

func boolToInt(value bool) int {
	if value {
		return 1
	}
	return 0
}

func SuperAdminOnboardingConvertToStaff(c *gin.Context) {
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

	if app.Status != "Hired" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"message": "Hanya pelamar dengan status Hired yang dapat dijadikan staff."})
		return
	}

	if app.UserID == nil {
		handlers.JSONError(c, http.StatusNotFound, "User tidak ditemukan.")
		return
	}

	userModel, err := dbrepo.GetUserByID(db, *app.UserID)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat user")
		return
	}
	if userModel == nil {
		handlers.JSONError(c, http.StatusNotFound, "User tidak ditemukan.")
		return
	}

	if userModel.Role == models.RoleStaff {
		if err := dbrepo.SetStaffAssignmentSelection(db, userModel.ID, app.ID); err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui penugasan staff")
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "User sudah menjadi staff. Penugasan diperbarui."})
		return
	}

	employeeCode, _ := services.GenerateEmployeeCode(db, models.RoleStaff)
	if err := dbrepo.UpdateUserToStaff(db, userModel.ID, employeeCode, app.Division); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui role user")
		return
	}
	if err := dbrepo.SetStaffAssignmentSelection(db, userModel.ID, app.ID); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui penugasan staff")
		return
	}

	profile := handlers.GetApplicantProfile(db, userModel.ID)
	if profile != nil {
		educationLevel := "Lainnya"
		educations := handlers.DecodeJSONArray(profile.Educations)
		if len(educations) > 0 {
			if degree, ok := educations[0]["degree"].(string); ok && degree != "" {
				educationLevel = degree
			}
		}
		if err := dbrepo.UpsertStaffProfileFromApplicant(db, userModel.ID, profile.Religion, profile.Gender, educationLevel); err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal menyimpan profil staff")
			return
		}
	}

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Onboarding",
		Action:      "CONVERT_TO_STAFF",
		EntityType:  "user",
		EntityID:    strconv.FormatInt(userModel.ID, 10),
		Description: "Mengubah pelamar hired menjadi staff.",
		OldValues: map[string]any{
			"role":          userModel.Role,
			"employee_code": userModel.EmployeeCode,
		},
		NewValues: map[string]any{
			"role":          models.RoleStaff,
			"employee_code": employeeCode,
			"division":      app.Division,
		},
	})

	c.JSON(http.StatusOK, gin.H{"status": "Akun berhasil diubah menjadi Staff."})
}
