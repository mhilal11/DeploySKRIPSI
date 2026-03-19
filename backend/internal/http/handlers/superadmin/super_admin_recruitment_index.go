package superadmin

import (
	"net/http"
	"sort"
	"strings"
	"time"

	"hris-backend/internal/dto"
	"hris-backend/internal/http/handlers"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type recruitmentIndexRepository interface {
	ListRecruitmentApplicationsPaged(limit, offset int) ([]models.Application, error)
	CountRecruitmentApplications() (int, error)
	ListApplicantProfilesByUserIDs(userIDs []int64) (map[int64]*models.ApplicantProfile, error)
}

type sqlRecruitmentIndexRepository struct {
	db *sqlx.DB
}

func newRecruitmentIndexRepository(db *sqlx.DB) recruitmentIndexRepository {
	return &sqlRecruitmentIndexRepository{db: db}
}

func (r *sqlRecruitmentIndexRepository) ListRecruitmentApplicationsPaged(limit, offset int) ([]models.Application, error) {
	return dbrepo.ListRecruitmentApplicationsPaged(r.db, limit, offset)
}

func (r *sqlRecruitmentIndexRepository) CountRecruitmentApplications() (int, error) {
	return dbrepo.CountRecruitmentApplications(r.db)
}

func (r *sqlRecruitmentIndexRepository) ListApplicantProfilesByUserIDs(userIDs []int64) (map[int64]*models.ApplicantProfile, error) {
	return dbrepo.ListApplicantProfilesByUserIDs(r.db, userIDs)
}

func SuperAdminRecruitmentIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	repo := newRecruitmentIndexRepository(db)
	pagination := handlers.ParsePagination(c, 20, 100)

	apps, err := repo.ListRecruitmentApplicationsPaged(pagination.Limit, pagination.Offset)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat data recruitment")
		return
	}
	totalApplications, _ := repo.CountRecruitmentApplications()
	slaSettings := loadRecruitmentSLASettings(db)
	now := time.Now()
	slaOverview := dto.RecruitmentSLAOverview{
		ActiveApplications: 0,
		OnTrackCount:       0,
		WarningCount:       0,
		OverdueCount:       0,
		ComplianceRate:     100.0,
	}
	slaReminders := make([]dto.RecruitmentSLAReminder, 0)

	profileByUser := map[int64]*models.ApplicantProfile{}
	loadedProfiles, loadErr := repo.ListApplicantProfilesByUserIDs(extractApplicationUserIDs(apps))
	if loadErr == nil {
		profileByUser = loadedProfiles
	}

	applications := make([]dto.RecruitmentApplication, 0, len(apps))
	interviews := make([]dto.RecruitmentInterview, 0)
	onboarding := make([]dto.RecruitmentOnboarding, 0)
	scoreByApplicationID := buildRecruitmentScoreIndex(db, apps, profileByUser)
	applicationIDs := make([]int64, 0, len(apps))
	for _, app := range apps {
		applicationIDs = append(applicationIDs, app.ID)
	}
	aiScreeningByApplicationID := loadLatestRecruitmentAIScreeningsIndex(db, applicationIDs)
	scoringAudits := loadRecruitmentScoringAudits(db, 25)

	type selectedStaffAssignment struct {
		ApplicationID int64
		Position      string
	}
	selectedStaffAssignmentByUser := map[int64]selectedStaffAssignment{}
	hiredApplicationsByUser := map[int64][]models.Application{}
	for _, app := range apps {
		if app.UserID == nil {
			continue
		}
		if app.Status == "Hired" {
			hiredApplicationsByUser[*app.UserID] = append(hiredApplicationsByUser[*app.UserID], app)
		}
		if app.StaffAssignmentSelected {
			selectedStaffAssignmentByUser[*app.UserID] = selectedStaffAssignment{
				ApplicationID: app.ID,
				Position:      app.Position,
			}
		}
	}

	// Fallback untuk data lama (sebelum flag selection tersedia).
	// Pilih 1 lamaran Hired per user staff berdasarkan kecocokan divisi lalu tanggal terbaru.
	for userID, hiredApps := range hiredApplicationsByUser {
		if _, alreadySelected := selectedStaffAssignmentByUser[userID]; alreadySelected {
			continue
		}
		if len(hiredApps) == 0 {
			continue
		}
		if len(hiredApps) == 1 {
			selectedStaffAssignmentByUser[userID] = selectedStaffAssignment{
				ApplicationID: hiredApps[0].ID,
				Position:      hiredApps[0].Position,
			}
			continue
		}

		userDivision, _ := dbrepo.GetUserDivisionByID(db, userID)
		normalizedUserDivision := strings.ToLower(strings.TrimSpace(userDivision))

		var chosen *models.Application
		chosenDivisionMatch := false
		chosenTime := time.Time{}

		for i := range hiredApps {
			candidate := hiredApps[i]

			candidateDivision := ""
			if candidate.Division != nil {
				candidateDivision = strings.ToLower(strings.TrimSpace(*candidate.Division))
			}
			candidateDivisionMatch := normalizedUserDivision != "" && candidateDivision != "" && candidateDivision == normalizedUserDivision

			candidateTime := time.Time{}
			if candidate.HiredAt != nil {
				candidateTime = *candidate.HiredAt
			} else if candidate.UpdatedAt != nil {
				candidateTime = *candidate.UpdatedAt
			} else if candidate.SubmittedAt != nil {
				candidateTime = *candidate.SubmittedAt
			}

			if chosen == nil {
				chosen = &candidate
				chosenDivisionMatch = candidateDivisionMatch
				chosenTime = candidateTime
				continue
			}

			if candidateDivisionMatch != chosenDivisionMatch {
				if candidateDivisionMatch {
					chosen = &candidate
					chosenDivisionMatch = candidateDivisionMatch
					chosenTime = candidateTime
				}
				continue
			}

			if candidateTime.After(chosenTime) || (candidateTime.Equal(chosenTime) && candidate.ID > chosen.ID) {
				chosen = &candidate
				chosenDivisionMatch = candidateDivisionMatch
				chosenTime = candidateTime
			}
		}

		if chosen != nil {
			selectedStaffAssignmentByUser[userID] = selectedStaffAssignment{
				ApplicationID: chosen.ID,
				Position:      chosen.Position,
			}
		}
	}

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
		var slaIndicator *dto.RecruitmentSLAIndicator
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

				slaIndicator = &dto.RecruitmentSLAIndicator{
					Stage:         app.Status,
					TargetDays:    targetDays,
					DaysInStage:   daysInStage,
					DueDate:       dueAt.Format("2006-01-02"),
					RemainingDays: remainingDays,
					OverdueDays:   overdueDays,
					State:         slaState,
					IsOverdue:     slaState == "overdue",
				}

				slaOverview.ActiveApplications++
				switch slaState {
				case "overdue":
					slaOverview.OverdueCount++
				case "warning":
					slaOverview.WarningCount++
				default:
					slaOverview.OnTrackCount++
				}

				if slaState == "overdue" || slaState == "warning" {
					slaReminders = append(slaReminders, dto.RecruitmentSLAReminder{
						ApplicationID: app.ID,
						Name:          profileFullName,
						Position:      app.Position,
						Division:      app.Division,
						Stage:         app.Status,
						DaysInStage:   daysInStage,
						TargetDays:    targetDays,
						DueDate:       dueAt.Format("2006-01-02"),
						RemainingDays: remainingDays,
						OverdueDays:   overdueDays,
						State:         slaState,
					})
				}
			}
		}

		var profilePhoneValue *string
		if profilePhone != nil {
			profilePhoneValue = profilePhone
		} else {
			profilePhoneValue = app.Phone
		}
		var recruitmentScoreValue any
		if hasRecruitmentScore {
			recruitmentScoreValue = recruitmentScore
		}

		applications = append(applications, dto.RecruitmentApplication{
			ID:                   app.ID,
			Name:                 profileFullName,
			Division:             app.Division,
			Position:             app.Position,
			Education:            chooseString(educationSummary, app.Education),
			Experience:           chooseString(experienceSummary, app.Experience),
			ProfileName:          profileFullName,
			ProfileEmail:         profileEmail,
			ProfilePhone:         profilePhoneValue,
			ProfileAddress:       profileAddress,
			ProfileCity:          profileCity,
			ProfileProvince:      profileProvince,
			ProfileGender:        profileGender,
			ProfileReligion:      profileReligion,
			ProfileDateOfBirth:   handlers.FormatDateISO(profileDOB),
			Educations:           educations,
			Experiences:          experiences,
			Certifications:       certifications,
			InterviewDate:        handlers.FormatDateISO(app.InterviewDate),
			InterviewTime:        interviewTime,
			InterviewMode:        app.InterviewMode,
			InterviewerName:      app.InterviewerName,
			MeetingLink:          app.MeetingLink,
			InterviewNotes:       app.InterviewNotes,
			InterviewEndTime:     interviewEndTime,
			HasInterviewSchedule: hasInterview,
			Status:               app.Status,
			Date:                 handlers.FormatDate(app.SubmittedAt),
			SubmittedDate:        handlers.FormatDateISO(app.SubmittedAt),
			Email:                app.Email,
			Phone:                app.Phone,
			Skills:               app.Skills,
			CVFile:               app.CvFile,
			CVURL:                superAdminRecruitmentCVURL(c, app.ID, app.CvFile),
			ProfilePhotoURL: func() *string {
				if profile == nil {
					return nil
				}
				return handlers.AttachmentURL(c, profile.ProfilePhotoPath)
			}(),
			RejectionReason:  app.RejectionReason,
			RecruitmentScore: recruitmentScoreValue,
			AIScreening:      aiScreeningByApplicationID[app.ID],
			SLA:              slaIndicator,
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
			interviews = append(interviews, dto.RecruitmentInterview{
				ApplicationID: app.ID,
				Candidate:     app.FullName,
				Position:      app.Position,
				Date:          handlers.FormatDate(app.InterviewDate),
				DateValue:     handlers.FormatDateISO(app.InterviewDate),
				Time:          handlers.FirstString(interviewTime, "-"),
				EndTime:       endTime,
				Mode:          handlers.FirstString(app.InterviewMode, "-"),
				Interviewer:   handlers.FirstString(app.InterviewerName, "-"),
				MeetingLink:   app.MeetingLink,
				Status:        app.Status,
			})
		}

		if app.Status == "Hired" {
			checklist := loadChecklist(db, app.ID)
			contractDone := checklist.ContractSigned
			inventoryDone := checklist.InventoryHandover
			trainingDone := checklist.TrainingOrientation
			allComplete := contractDone && inventoryDone && trainingDone
			isStaff := isUserStaff(db, app.UserID)
			staffAssignmentSelected := app.StaffAssignmentSelected

			var joinedInApplicationID *int64
			var joinedInPosition *string
			if isStaff && app.UserID != nil {
				if selected, ok := selectedStaffAssignmentByUser[*app.UserID]; ok {
					if selected.ApplicationID == app.ID {
						staffAssignmentSelected = true
					} else {
						joinedID := selected.ApplicationID
						joinedPos := selected.Position
						joinedInApplicationID = &joinedID
						joinedInPosition = &joinedPos
					}
				}
			}

			onboarding = append(onboarding, dto.RecruitmentOnboarding{
				ApplicationID: app.ID,
				Name:          app.FullName,
				Position:      app.Position,
				StartedAt:     handlers.FormatDate(app.SubmittedAt),
				Status: func() string {
					if allComplete {
						return "Selesai"
					}
					return "In Progress"
				}(),
				IsStaff:                 isStaff,
				StaffAssignmentSelected: staffAssignmentSelected,
				JoinedInApplicationID:   joinedInApplicationID,
				JoinedInPosition:        joinedInPosition,
				Steps: []dto.RecruitmentOnboardingStep{
					{Label: "Kontrak ditandatangani", Complete: contractDone},
					{Label: "Serah terima inventaris", Complete: inventoryDone, Pending: !inventoryDone && contractDone},
					{Label: "Training & orientasi", Complete: trainingDone, Pending: !trainingDone && inventoryDone},
				},
			})
		}
	}

	activeSLA := slaOverview.ActiveApplications
	if activeSLA > 0 {
		overdue := slaOverview.OverdueCount
		slaOverview.ComplianceRate = float64(activeSLA-overdue) / float64(activeSLA) * 100
	}
	sort.SliceStable(slaReminders, func(i, j int) bool {
		left := slaReminders[i]
		right := slaReminders[j]
		if left.State != right.State {
			return left.State == "overdue"
		}
		if left.OverdueDays != right.OverdueDays {
			return left.OverdueDays > right.OverdueDays
		}
		return left.RemainingDays < right.RemainingDays
	})
	if len(slaReminders) > 12 {
		slaReminders = slaReminders[:12]
	}

	c.JSON(http.StatusOK, dto.RecruitmentIndexResponse{
		Applications:         applications,
		Pagination:           handlers.BuildPaginationMeta(pagination.Page, pagination.Limit, totalApplications),
		StatusOptions:        models.ApplicationStatuses,
		Interviews:           interviews,
		Onboarding:           onboarding,
		SLASettings:          slaSettings,
		SLAOverview:          slaOverview,
		SLAReminders:         slaReminders,
		ScoringAudits:        scoringAudits,
		SidebarNotifications: handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
	})
}
