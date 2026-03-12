package pelamar

import (
	"hris-backend/internal/http/handlers"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type pelamarDashboardRepository interface {
	ListApplicationsByUserIDPaged(userID int64, limit, offset int) ([]models.Application, error)
	CountApplicationsByUserID(userID int64) (int, error)
}

type sqlPelamarDashboardRepository struct {
	db *sqlx.DB
}

func newPelamarDashboardRepository(db *sqlx.DB) pelamarDashboardRepository {
	return &sqlPelamarDashboardRepository{db: db}
}

func (r *sqlPelamarDashboardRepository) ListApplicationsByUserIDPaged(userID int64, limit, offset int) ([]models.Application, error) {
	return dbrepo.ListApplicationsByUserIDPaged(r.db, userID, limit, offset)
}

func (r *sqlPelamarDashboardRepository) CountApplicationsByUserID(userID int64) (int, error) {
	return dbrepo.CountApplicationsByUserID(r.db, userID)
}

func RegisterPelamarRoutes(rg *gin.RouterGroup) {
	rg.GET("/pelamar/dashboard", PelamarDashboard)
	rg.GET("/pelamar/profil", PelamarProfileShow)
	rg.POST("/pelamar/profil", PelamarProfileUpdate)
	rg.GET("/pelamar/references/education", PelamarEducationReferences)
	rg.GET("/pelamar/lamaran-saya", PelamarApplicationsIndex)
	rg.POST("/pelamar/lamaran-saya", PelamarApplicationsStore)
	rg.POST("/pelamar/lamaran-saya/check-eligibility", PelamarCheckEligibility)
}

func PelamarDashboard(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RolePelamar {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	repo := newPelamarDashboardRepository(db)
	pagination := handlers.ParsePagination(c, 20, 100)
	applications, _ := repo.ListApplicationsByUserIDPaged(user.ID, pagination.Limit, pagination.Offset)
	totalApplications, _ := repo.CountApplicationsByUserID(user.ID)

	var latestApp *models.Application
	if len(applications) > 0 {
		latestApp = &applications[0]
	}

	var upcomingInterview any
	if latestApp != nil && latestApp.InterviewDate != nil {
		upcomingInterview = map[string]any{
			"position":    latestApp.Position,
			"date":        handlers.FormatDate(latestApp.InterviewDate),
			"time":        handlers.FirstString(latestApp.InterviewTime, "-"),
			"mode":        handlers.FirstString(latestApp.InterviewMode, "-"),
			"interviewer": handlers.FirstString(latestApp.InterviewerName, "-"),
			"link":        latestApp.MeetingLink,
			"notes":       latestApp.InterviewNotes,
		}
	}

	applicationsStatus := make([]map[string]any, 0, len(applications))
	for _, app := range applications {
		stages := []string{"Applied", "Screening", "Interview", "Offering", "Hired"}
		if app.Status == "Rejected" {
			stages = []string{"Applied", "Screening", "Interview", "Offering", "Rejected"}
		}

		statusIndex := -1
		for i, s := range stages {
			if s == app.Status {
				statusIndex = i
				break
			}
		}

		stageEntries := make([]map[string]any, 0, len(stages))
		fallbackDate := app.UpdatedAt
		if fallbackDate == nil || fallbackDate.IsZero() {
			fallbackDate = app.SubmittedAt
		}

		for i, stage := range stages {
			status := "pending"
			if statusIndex >= 0 {
				if i < statusIndex {
					status = "completed"
				} else if i == statusIndex {
					status = "current"
				}
			}
			date := stageDate(app, stage)
			if date == nil || date.IsZero() {
				date = fallbackDate
			}
			stageEntries = append(stageEntries, map[string]any{
				"name":   stage,
				"status": status,
				"date": func() string {
					if status == "pending" {
						return "-"
					}
					return handlers.FormatDate(date)
				}(),
			})
		}

		progress := 0
		if app.Status == "Hired" {
			progress = 100
		} else if app.Status == "Rejected" {
			completed := 0
			for _, stage := range stageEntries {
				if stage["status"] == "completed" {
					completed++
				}
			}
			totalStages := len(stageEntries) - 1
			if totalStages < 1 {
				totalStages = 1
			}
			progress = int(float64(completed) / float64(totalStages) * 100)
		} else if statusIndex > 0 && len(stageEntries) > 1 {
			progress = int(float64(statusIndex) / float64(len(stageEntries)-1) * 100)
		}

		applicationsStatus = append(applicationsStatus, map[string]any{
			"id":                     app.ID,
			"position":               app.Position,
			"division":               app.Division,
			"status":                 app.Status,
			"progress":               progress,
			"stages":                 stageEntries,
			"rejection_reason":       app.RejectionReason,
			"updated_at_diff":        handlers.DiffForHumans(fallbackDate),
			"submitted_at_formatted": handlers.FormatDate(app.SubmittedAt),
			"interview": func() any {
				if app.Status != "Interview" {
					return nil
				}
				return map[string]any{
					"date":        handlers.FormatDate(app.InterviewDate),
					"time":        app.InterviewTime,
					"mode":        app.InterviewMode,
					"link":        app.MeetingLink,
					"interviewer": app.InterviewerName,
					"notes":       app.InterviewNotes,
				}
			}(),
		})
	}

	applicationsData := make([]map[string]any, 0, len(applications))
	for _, app := range applications {
		applicationsData = append(applicationsData, map[string]any{
			"id":               app.ID,
			"position":         app.Position,
			"division":         app.Division,
			"status":           app.Status,
			"submitted_at":     handlers.FormatDate(app.SubmittedAt),
			"full_name":        app.FullName,
			"email":            app.Email,
			"phone":            app.Phone,
			"education":        app.Education,
			"experience":       app.Experience,
			"skills":           app.Skills,
			"cv_file":          app.CvFile,
			"notes":            app.Notes,
			"rejection_reason": app.RejectionReason,
		})
	}

	profile := getApplicantProfile(db, user.ID)
	isProfileComplete := profile != nil && profile.CompletedAt != nil
	showProfileReminder := !isProfileComplete && len(applications) == 0

	c.JSON(http.StatusOK, gin.H{
		"applicationsStatus": applicationsStatus,
		"applications":       applicationsData,
		"pagination": handlers.BuildPaginationMeta(
			pagination.Page,
			pagination.Limit,
			totalApplications,
		),
		"stats": gin.H{
			"totalApplications": totalApplications,
			"latestStatus": func() any {
				if latestApp != nil {
					return latestApp.Status
				}
				return nil
			}(),
			"rejectionReason": func() any {
				if latestApp != nil {
					return latestApp.RejectionReason
				}
				return nil
			}(),
		},
		"upcomingInterview":   upcomingInterview,
		"isProfileComplete":   isProfileComplete,
		"showProfileReminder": showProfileReminder,
	})
}
