package superadmin

import (
	"net/http"
	"sort"
	"time"

	"hris-backend/internal/http/handlers"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func SuperAdminRecruitmentIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	pagination := handlers.ParsePagination(c, 20, 100)

	apps, err := dbrepo.ListRecruitmentApplicationsPaged(db, pagination.Limit, pagination.Offset)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat data recruitment")
		return
	}
	totalApplications, _ := dbrepo.CountRecruitmentApplications(db)
	slaSettings := loadRecruitmentSLASettings(db)
	now := time.Now()
	slaOverview := map[string]any{
		"active_applications": 0,
		"on_track_count":      0,
		"warning_count":       0,
		"overdue_count":       0,
		"compliance_rate":     100.0,
	}
	slaReminders := make([]map[string]any, 0)

	profileByUser := map[int64]*models.ApplicantProfile{}
	loadedProfiles, loadErr := dbrepo.ListApplicantProfilesByUserIDs(db, extractApplicationUserIDs(apps))
	if loadErr == nil {
		profileByUser = loadedProfiles
	}

	applications := make([]map[string]any, 0, len(apps))
	interviews := make([]map[string]any, 0)
	onboarding := make([]map[string]any, 0)
	scoreByApplicationID := buildRecruitmentScoreIndex(db, apps, profileByUser)
	applicationIDs := make([]int64, 0, len(apps))
	for _, app := range apps {
		applicationIDs = append(applicationIDs, app.ID)
	}
	aiScreeningByApplicationID := loadLatestRecruitmentAIScreeningsIndex(db, applicationIDs)
	scoringAudits := loadRecruitmentScoringAudits(db, 25)

	for _, app := range apps {
		var profile *models.ApplicantProfile
		if app.UserID != nil {
			profile = profileByUser[*app.UserID]
		}

		interviewTime := trimTime(app.InterviewTime)
		interviewEndTime := trimTime(app.InterviewEndTime)
		hasInterview := app.InterviewDate != nil || interviewTime != nil || app.InterviewMode != nil

		profileFullName := app.FullName
		profileEmail := app.Email
		profilePhone := app.Phone
		var profileAddress, profileCity, profileProvince, profileGender, profileReligion *string
		var profileDOB *time.Time
		educations := []map[string]any{}
		experiences := []map[string]any{}
		certifications := []map[string]any{}
		if profile != nil {
			if profile.FullName != nil {
				profileFullName = *profile.FullName
			}
			if profile.Email != nil {
				profileEmail = *profile.Email
			}
			if profile.Phone != nil {
				profilePhone = profile.Phone
			}
			profileAddress = profile.Address
			profileCity = profile.City
			profileProvince = profile.Province
			profileGender = profile.Gender
			profileReligion = profile.Religion
			profileDOB = profile.DateOfBirth
			educations = handlers.DecodeJSONArray(profile.Educations)
			experiences = handlers.DecodeJSONArray(profile.Experiences)
			certifications = handlers.FormatCertifications(c, handlers.DecodeJSONArray(profile.Certifications))
		}

		educationSummary := summarizeEducation(educations)
		experienceSummary := summarizeExperience(experiences)
		recruitmentScore, hasRecruitmentScore := scoreByApplicationID[app.ID]
		var slaIndicator map[string]any
		if isRecruitmentSLAStage(app.Status) {
			startAt := applicationStageStartedAt(app)
			if startAt != nil {
				targetDays := slaSettings[app.Status]
				if targetDays < 1 {
					targetDays = defaultRecruitmentSLASettings()[app.Status]
				}
				daysInStage := calculateElapsedDays(*startAt, now)
				dueAt := startAt.AddDate(0, 0, targetDays)
				remainingDays := calculateRemainingDays(dueAt, now)
				overdueDays := 0
				slaState := "on_track"
				if dueAt.Before(now) {
					overdueDays = calculateElapsedDays(dueAt, now)
					if overdueDays < 1 {
						overdueDays = 1
					}
					slaState = "overdue"
				} else if remainingDays <= 1 {
					slaState = "warning"
				}

				slaIndicator = map[string]any{
					"stage":          app.Status,
					"target_days":    targetDays,
					"days_in_stage":  daysInStage,
					"due_date":       dueAt.Format("2006-01-02"),
					"remaining_days": remainingDays,
					"overdue_days":   overdueDays,
					"state":          slaState,
					"is_overdue":     slaState == "overdue",
				}

				slaOverview["active_applications"] = slaOverview["active_applications"].(int) + 1
				switch slaState {
				case "overdue":
					slaOverview["overdue_count"] = slaOverview["overdue_count"].(int) + 1
				case "warning":
					slaOverview["warning_count"] = slaOverview["warning_count"].(int) + 1
				default:
					slaOverview["on_track_count"] = slaOverview["on_track_count"].(int) + 1
				}

				if slaState == "overdue" || slaState == "warning" {
					slaReminders = append(slaReminders, map[string]any{
						"application_id": app.ID,
						"name":           profileFullName,
						"position":       app.Position,
						"division":       app.Division,
						"stage":          app.Status,
						"days_in_stage":  daysInStage,
						"target_days":    targetDays,
						"due_date":       dueAt.Format("2006-01-02"),
						"remaining_days": remainingDays,
						"overdue_days":   overdueDays,
						"state":          slaState,
					})
				}
			}
		}

		applications = append(applications, map[string]any{
			"id":                     app.ID,
			"name":                   profileFullName,
			"division":               app.Division,
			"position":               app.Position,
			"education":              chooseString(educationSummary, app.Education),
			"experience":             chooseString(experienceSummary, app.Experience),
			"profile_name":           profileFullName,
			"profile_email":          profileEmail,
			"profile_phone":          profilePhone,
			"profile_address":        profileAddress,
			"profile_city":           profileCity,
			"profile_province":       profileProvince,
			"profile_gender":         profileGender,
			"profile_religion":       profileReligion,
			"profile_date_of_birth":  handlers.FormatDateISO(profileDOB),
			"educations":             educations,
			"experiences":            experiences,
			"certifications":         certifications,
			"interview_date":         handlers.FormatDateISO(app.InterviewDate),
			"interview_time":         interviewTime,
			"interview_mode":         app.InterviewMode,
			"interviewer_name":       app.InterviewerName,
			"meeting_link":           app.MeetingLink,
			"interview_notes":        app.InterviewNotes,
			"interview_end_time":     interviewEndTime,
			"has_interview_schedule": hasInterview,
			"status":                 app.Status,
			"date":                   handlers.FormatDate(app.SubmittedAt),
			"submitted_date":         handlers.FormatDateISO(app.SubmittedAt),
			"email":                  app.Email,
			"phone":                  app.Phone,
			"skills":                 app.Skills,
			"cv_file":                app.CvFile,
			"cv_url":                 superAdminRecruitmentCVURL(c, app.ID, app.CvFile),
			"profile_photo_url": func() any {
				if profile != nil {
					return handlers.AttachmentURL(c, profile.ProfilePhotoPath)
				}
				return nil
			}(),
			"rejection_reason": app.RejectionReason,
			"recruitment_score": func() any {
				if hasRecruitmentScore {
					return recruitmentScore
				}
				return nil
			}(),
			"ai_screening": aiScreeningByApplicationID[app.ID],
			"sla":          slaIndicator,
		})

		if hasInterview {
			endTime := interviewEndTime
			if endTime == nil && interviewTime != nil {
				if t, err := time.Parse("15:04", *interviewTime); err == nil {
					t2 := t.Add(30 * time.Minute)
					endStr := t2.Format("15:04")
					endTime = &endStr
				}
			}
			interviews = append(interviews, map[string]any{
				"application_id": app.ID,
				"candidate":      app.FullName,
				"position":       app.Position,
				"date":           handlers.FormatDate(app.InterviewDate),
				"date_value":     handlers.FormatDateISO(app.InterviewDate),
				"time":           handlers.FirstString(interviewTime, "-"),
				"end_time":       endTime,
				"mode":           handlers.FirstString(app.InterviewMode, "-"),
				"interviewer":    handlers.FirstString(app.InterviewerName, "-"),
				"meeting_link":   app.MeetingLink,
				"status":         app.Status,
			})
		}

		if app.Status == "Hired" {
			checklist := loadChecklist(db, app.ID)
			contractDone := checklist.ContractSigned
			inventoryDone := checklist.InventoryHandover
			trainingDone := checklist.TrainingOrientation
			allComplete := contractDone && inventoryDone && trainingDone

			onboarding = append(onboarding, map[string]any{
				"application_id": app.ID,
				"name":           app.FullName,
				"position":       app.Position,
				"startedAt":      handlers.FormatDate(app.SubmittedAt),
				"status": func() string {
					if allComplete {
						return "Selesai"
					}
					return "In Progress"
				}(),
				"is_staff": isUserStaff(db, app.UserID),
				"steps": []map[string]any{
					{"label": "Kontrak ditandatangani", "complete": contractDone},
					{"label": "Serah terima inventaris", "complete": inventoryDone, "pending": !inventoryDone && contractDone},
					{"label": "Training & orientasi", "complete": trainingDone, "pending": !trainingDone && inventoryDone},
				},
			})
		}
	}

	activeSLA := slaOverview["active_applications"].(int)
	if activeSLA > 0 {
		overdue := slaOverview["overdue_count"].(int)
		slaOverview["compliance_rate"] = float64(activeSLA-overdue) / float64(activeSLA) * 100
	}
	sort.SliceStable(slaReminders, func(i, j int) bool {
		left := slaReminders[i]
		right := slaReminders[j]
		leftState, _ := left["state"].(string)
		rightState, _ := right["state"].(string)
		if leftState != rightState {
			return leftState == "overdue"
		}
		leftOverdue, _ := left["overdue_days"].(int)
		rightOverdue, _ := right["overdue_days"].(int)
		if leftOverdue != rightOverdue {
			return leftOverdue > rightOverdue
		}
		leftRemain, _ := left["remaining_days"].(int)
		rightRemain, _ := right["remaining_days"].(int)
		return leftRemain < rightRemain
	})
	if len(slaReminders) > 12 {
		slaReminders = slaReminders[:12]
	}

	c.JSON(http.StatusOK, gin.H{
		"applications":         applications,
		"pagination":           handlers.BuildPaginationMeta(pagination.Page, pagination.Limit, totalApplications),
		"statusOptions":        models.ApplicationStatuses,
		"interviews":           interviews,
		"onboarding":           onboarding,
		"slaSettings":          slaSettings,
		"slaOverview":          slaOverview,
		"slaReminders":         slaReminders,
		"scoringAudits":        scoringAudits,
		"sidebarNotifications": handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
	})
}
