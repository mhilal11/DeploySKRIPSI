package handlers

import (
	"net/http"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
)

func RegisterPublicRoutes(rg *gin.RouterGroup) {
	rg.GET("/public/landing", LandingData)
}

func LandingData(c *gin.Context) {
	db := middleware.GetDB(c)

	profiles, err := services.EnsureDivisionProfiles(db)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Failed to load divisions")
		return
	}

	divisions := make([]map[string]any, 0, len(profiles))
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

		divisions = append(divisions, map[string]any{
			"id":               profile.ID,
			"name":             profile.Name,
			"description":      profile.Description,
			"manager_name":     profile.ManagerName,
			"capacity":         profile.Capacity,
			"current_staff":    currentStaff,
			"available_slots":  availableSlots,
			"is_hiring":        profile.IsHiring && profile.JobTitle != nil,
			"job_title":        profile.JobTitle,
			"job_description":  profile.JobDescription,
			"job_requirements": decodeJSONStringArray(profile.JobRequirements),
			"job_eligibility":  decodeJSONMap(profile.JobEligibility),
			"hiring_opened_at": formatDateISO(profile.HiringOpenedAt),
		})
	}

	jobs := make([]map[string]any, 0)
	for _, division := range divisions {
		if hiring, ok := division["is_hiring"].(bool); ok && !hiring {
			continue
		}
		jobs = append(jobs, map[string]any{
			"id":                    division["id"],
			"division":              division["name"],
			"division_description":  division["description"],
			"manager_name":          division["manager_name"],
			"capacity":              division["capacity"],
			"current_staff":         division["current_staff"],
			"availableSlots":        division["available_slots"],
			"isHiring":              division["is_hiring"],
			"title":                 division["job_title"],
			"description":           division["job_description"],
			"requirements":          division["job_requirements"],
			"eligibility_criteria":  division["job_eligibility"],
			"hiring_opened_at":      division["hiring_opened_at"],
			"location":              "Divisi " + division["name"].(string),
			"type":                  "Full-time",
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"canLogin":    true,
		"canRegister": true,
		"jobs":        jobs,
	})
}
