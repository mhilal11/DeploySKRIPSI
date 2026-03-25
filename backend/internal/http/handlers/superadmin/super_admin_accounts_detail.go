package superadmin

import (
	"encoding/json"
	"net/http"

	"hris-backend/internal/http/handlers"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// SuperAdminAccountsDetail returns full account detail including staff/applicant profile.
func SuperAdminAccountsDetail(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id, ok := parsePositiveInt64(c.Param("id"))
	if !ok {
		handlers.JSONError(c, http.StatusBadRequest, "ID user tidak valid")
		return
	}

	db := middleware.GetDB(c)
	account, err := dbrepo.GetUserByID(db, id)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat data user")
		return
	}
	if account == nil {
		handlers.JSONError(c, http.StatusNotFound, "User tidak ditemukan")
		return
	}

	result := gin.H{
		"id":            account.ID,
		"employee_code": account.EmployeeCode,
		"name":          account.Name,
		"email":         account.Email,
		"role":          account.Role,
		"division":      account.Division,
		"status":        account.Status,
		"registered_at": handlers.FormatDateISO(account.RegisteredAt),
		"inactive_at":   handlers.FormatDateISO(account.InactiveAt),
		"last_login_at": handlers.FormatDateTime(account.LastLoginAt),
		"created_at":    handlers.FormatDateTime(account.CreatedAt),
	}

	// Staff profile
	if account.Role == models.RoleStaff {
		staffProfile, err := dbrepo.GetStaffProfileByUserID(db, account.ID)
		if err == nil && staffProfile != nil {
			educations := []map[string]any{}
			if len(staffProfile.Educations) > 0 {
				_ = json.Unmarshal(staffProfile.Educations, &educations)
			}

			result["profile"] = gin.H{
				"type":              "staff",
				"profile_photo_url": handlers.AttachmentURL(c, staffProfile.ProfilePhotoPath),
				"phone":             staffProfile.Phone,
				"date_of_birth":     handlers.FormatDateISO(staffProfile.DateOfBirth),
				"religion":          staffProfile.Religion,
				"gender":            staffProfile.Gender,
				"address":           staffProfile.Address,
				"domicile_address":  staffProfile.DomicileAddress,
				"city":              staffProfile.City,
				"province":          staffProfile.Province,
				"education_level":   staffProfile.EducationLevel,
				"educations":        educations,
			}
		}
	}

	// Applicant (Pelamar) profile
	if account.Role == models.RolePelamar {
		applicantProfile, err := dbrepo.GetApplicantProfileByUserID(db, account.ID)
		if err == nil && applicantProfile != nil {
			educations := []map[string]any{}
			if len(applicantProfile.Educations) > 0 {
				_ = json.Unmarshal(applicantProfile.Educations, &educations)
			}
			experiences := []map[string]any{}
			if len(applicantProfile.Experiences) > 0 {
				_ = json.Unmarshal(applicantProfile.Experiences, &experiences)
			}
			certifications := []map[string]any{}
			if len(applicantProfile.Certifications) > 0 {
				_ = json.Unmarshal(applicantProfile.Certifications, &certifications)
			}

			result["profile"] = gin.H{
				"type":              "pelamar",
				"profile_photo_url": handlers.AttachmentURL(c, applicantProfile.ProfilePhotoPath),
				"full_name":         applicantProfile.FullName,
				"email":             applicantProfile.Email,
				"phone":             applicantProfile.Phone,
				"date_of_birth":     handlers.FormatDateISO(applicantProfile.DateOfBirth),
				"religion":          applicantProfile.Religion,
				"gender":            applicantProfile.Gender,
				"address":           applicantProfile.Address,
				"domicile_address":  applicantProfile.DomicileAddress,
				"city":              applicantProfile.City,
				"province":          applicantProfile.Province,
				"educations":        educations,
				"experiences":       experiences,
				"certifications":    handlers.FormatCertifications(c, certifications),
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"user": result})
}
