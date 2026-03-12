package superadmin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"hris-backend/internal/config"
	"hris-backend/internal/http/handlers"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

const recruitmentAIScreeningPromptVersion = "cv-screening-v2"
const recruitmentAIScreeningQueueName = "recruitment_ai_screening"

var (
	errAIScreeningConfigIncomplete    = errors.New("konfigurasi groq belum lengkap")
	errAIScreeningApplicationNotFound = errors.New("lamaran tidak ditemukan")
	errAIScreeningCVUnavailable       = errors.New("cv kandidat belum tersedia")
	errAIScreeningCVPathInvalid       = errors.New("path cv tidak valid")
	errAIScreeningCVFileNotFound      = errors.New("file cv tidak ditemukan")
	errAIScreeningCVUnreadable        = errors.New("cv tidak dapat diproses")
	errAIScreeningProviderFailed      = errors.New("screening ai gagal")
	errAIScreeningPersistFailed       = errors.New("hasil screening ai gagal disimpan")
	recruitmentAIWorkerStartOnce      sync.Once
)

type recruitmentAIScreeningRunOutput struct {
	Application models.Application
	Row         *models.RecruitmentAIScreening
	ModelUsed   string
	Result      services.CVScreeningResult
}

func StartRecruitmentAIScreeningWorker(db *sqlx.DB, cfg config.Config) {
	startRecruitmentAIWorker(db, cfg)
}

func TriggerAutomaticRecruitmentAIScreening(db *sqlx.DB, cfg config.Config, applicationID, actorUserID int64) {
	if db == nil || applicationID <= 0 {
		return
	}

	enqueueRecruitmentAIScreeningJob(db, applicationID, actorUserID, 0)
	startRecruitmentAIWorker(db, cfg)
}

func SuperAdminRecruitmentGetAIScreening(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	applicationID := strings.TrimSpace(c.Param("id"))
	if applicationID == "" {
		handlers.JSONError(c, http.StatusBadRequest, "ID lamaran tidak valid")
		return
	}

	db := middleware.GetDB(c)
	screening, err := loadLatestRecruitmentAIScreening(db, applicationID)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat data screening AI.")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"application_id": applicationID,
		"ai_screening":   mapAIScreeningPayload(screening),
	})
}

func SuperAdminRecruitmentRunAIScreening(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	cfg := middleware.GetConfig(c)
	applicationIDRaw := strings.TrimSpace(c.Param("id"))
	if applicationIDRaw == "" {
		handlers.JSONError(c, http.StatusBadRequest, "ID lamaran tidak valid")
		return
	}
	applicationID, err := strconv.ParseInt(applicationIDRaw, 10, 64)
	if err != nil || applicationID <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID lamaran tidak valid")
		return
	}

	output, err := runRecruitmentAIScreeningForApplication(c.Request.Context(), db, cfg, applicationID, user.ID)
	if err != nil {
		switch {
		case errors.Is(err, errAIScreeningConfigIncomplete):
			handlers.JSONError(c, http.StatusUnprocessableEntity, "Konfigurasi Groq belum lengkap. Periksa GROQ_API_KEY dan daftar model.")
		case errors.Is(err, errAIScreeningApplicationNotFound):
			handlers.JSONError(c, http.StatusNotFound, "Lamaran tidak ditemukan")
		case errors.Is(err, errAIScreeningCVFileNotFound):
			handlers.JSONError(c, http.StatusNotFound, "File CV tidak ditemukan di storage.")
		case errors.Is(err, errAIScreeningCVUnavailable):
			handlers.JSONError(c, http.StatusUnprocessableEntity, "CV kandidat belum tersedia.")
		case errors.Is(err, errAIScreeningCVPathInvalid):
			handlers.JSONError(c, http.StatusUnprocessableEntity, "Path file CV tidak valid.")
		case errors.Is(err, errAIScreeningCVUnreadable):
			handlers.JSONError(c, http.StatusUnprocessableEntity, "CV tidak dapat diproses. Pastikan format CV dapat dibaca (PDF/DOCX/TXT).")
		case errors.Is(err, errAIScreeningProviderFailed):
			handlers.JSONError(c, http.StatusBadGateway, "Screening AI gagal dijalankan. Semua model fallback gagal.")
		case errors.Is(err, errAIScreeningPersistFailed):
			handlers.JSONError(c, http.StatusInternalServerError, "Hasil screening AI gagal disimpan.")
		default:
			handlers.JSONError(c, http.StatusInternalServerError, "Screening AI gagal diproses.")
		}
		return
	}

	appendAuditLog(c, db, auditLogPayload{
		Module:      "recruitment",
		Action:      "AI_CV_SCREENING_RUN",
		EntityType:  "application",
		EntityID:    fmt.Sprintf("%d", output.Application.ID),
		Description: fmt.Sprintf("Menjalankan AI screening CV untuk pelamar %s (%s).", output.Application.FullName, output.Application.Position),
		NewValues: map[string]any{
			"application_id": output.Application.ID,
			"model_used":     output.ModelUsed,
			"match_score":    output.Result.MatchScore,
			"recommendation": output.Result.Recommendation,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"status":         "AI screening CV berhasil dijalankan.",
		"application_id": output.Application.ID,
		"ai_screening":   mapAIScreeningPayload(output.Row),
	})
}

func runRecruitmentAIScreeningForApplication(
	ctx context.Context,
	db *sqlx.DB,
	cfg config.Config,
	applicationID int64,
	actorUserID int64,
) (*recruitmentAIScreeningRunOutput, error) {
	if db == nil {
		return nil, fmt.Errorf("%w: database tidak tersedia", errAIScreeningPersistFailed)
	}
	if applicationID <= 0 {
		return nil, fmt.Errorf("%w: id lamaran tidak valid", errAIScreeningApplicationNotFound)
	}

	app, err := dbrepo.GetApplicationByID(db, applicationID)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", errAIScreeningPersistFailed, err)
	}
	if app == nil {
		return nil, errAIScreeningApplicationNotFound
	}

	client := services.NewGroqCVScreeningClient(
		cfg.GroqAPIKey,
		cfg.GroqBaseURL,
		cfg.GroqModelChain,
		time.Duration(cfg.GroqRequestTimeoutSec)*time.Second,
	)
	if !client.Enabled() {
		return nil, errAIScreeningConfigIncomplete
	}
	if app.CvFile == nil || strings.TrimSpace(*app.CvFile) == "" {
		return nil, errAIScreeningCVUnavailable
	}

	normalizedCVPath := handlers.NormalizeAttachmentPath(*app.CvFile)
	if normalizedCVPath == "" {
		return nil, errAIScreeningCVPathInvalid
	}
	absCVPath, ok := resolveStorageFilePath(cfg.StoragePath, normalizedCVPath)
	if !ok {
		return nil, errAIScreeningCVFileNotFound
	}

	cvText, err := services.ExtractCVTextWithKey(absCVPath, cfg.StorageEncryptionKey)
	if err != nil {
		_ = insertRecruitmentAIScreeningFailure(db, app.ID, actorUserID, normalizedCVPath, client.Models(), err.Error(), nil)
		return nil, fmt.Errorf("%w: %v", errAIScreeningCVUnreadable, err)
	}

	profile := loadApplicantProfileByUserID(db, app.UserID)
	educationSummary := handlers.FirstString(app.Education, "")
	experienceSummary := handlers.FirstString(app.Experience, "")
	profileSkills := handlers.FirstString(app.Skills, "")
	if profile != nil {
		if text := summarizeEducation(handlers.DecodeJSONArray(profile.Educations)); text != nil && strings.TrimSpace(*text) != "" {
			educationSummary = *text
		}
		if text := summarizeExperience(handlers.DecodeJSONArray(profile.Experiences)); text != nil && strings.TrimSpace(*text) != "" {
			experienceSummary = *text
		}
	}

	criteriaByVacancyKey, criteriaByPosition := loadVacancyScoringCriteria(db)
	criteria := resolveVacancyScoringCriteria(*app, criteriaByVacancyKey, criteriaByPosition)
	jobDescription := loadJobDescriptionByApplication(db, *app)

	input := services.CVScreeningInput{
		CandidateName:    strings.TrimSpace(app.FullName),
		Division:         strings.TrimSpace(handlers.FirstString(app.Division, "")),
		Position:         strings.TrimSpace(app.Position),
		JobDescription:   jobDescription,
		JobRequirements:  criteria.Requirements,
		ProfileSkills:    profileSkills,
		EducationSummary: educationSummary,
		Experience:       experienceSummary,
		CVText:           cvText,
	}

	result, modelUsed, attempts, usage, rawResponse, screeningErr := client.ScreenCV(ctx, input)
	if screeningErr != nil {
		_ = insertRecruitmentAIScreeningFailure(db, app.ID, actorUserID, normalizedCVPath, client.Models(), screeningErr.Error(), attempts)
		return nil, fmt.Errorf("%w: %v", errAIScreeningProviderFailed, screeningErr)
	}

	row, err := insertRecruitmentAIScreeningSuccess(
		db,
		app.ID,
		actorUserID,
		normalizedCVPath,
		len([]rune(cvText)),
		modelUsed,
		client.Models(),
		usage,
		result,
		attempts,
		rawResponse,
	)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", errAIScreeningPersistFailed, err)
	}

	return &recruitmentAIScreeningRunOutput{
		Application: *app,
		Row:         row,
		ModelUsed:   modelUsed,
		Result:      result,
	}, nil
}

type recruitmentAIScreeningJobPayload struct {
	ApplicationID int64 `json:"application_id"`
	ActorUserID   int64 `json:"actor_user_id"`
}

func startRecruitmentAIWorker(db *sqlx.DB, cfg config.Config) {
	recruitmentAIWorkerStartOnce.Do(func() {
		go runRecruitmentAIWorkerLoop(db, cfg)
	})
}

func runRecruitmentAIWorkerLoop(db *sqlx.DB, cfg config.Config) {
	if db == nil {
		return
	}

	for {
		job, err := dbrepo.ReserveNextJob(db, recruitmentAIScreeningQueueName, 2*time.Minute)
		if err != nil {
			time.Sleep(2 * time.Second)
			continue
		}
		if job == nil {
			time.Sleep(1200 * time.Millisecond)
			continue
		}

		var payload recruitmentAIScreeningJobPayload
		if err := json.Unmarshal([]byte(job.Payload), &payload); err != nil {
			_ = dbrepo.MoveJobToFailed(db, *job, "payload tidak valid: "+err.Error())
			_ = dbrepo.DeleteJobByID(db, job.ID)
			continue
		}
		if payload.ApplicationID <= 0 {
			_ = dbrepo.MoveJobToFailed(db, *job, "application_id tidak valid")
			_ = dbrepo.DeleteJobByID(db, job.ID)
			continue
		}

		timeoutSec := cfg.GroqRequestTimeoutSec
		if timeoutSec <= 0 {
			timeoutSec = 60
		}
		ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSec+20)*time.Second)
		_, runErr := runRecruitmentAIScreeningForApplication(ctx, db, cfg, payload.ApplicationID, payload.ActorUserID)
		cancel()

		if runErr == nil {
			_ = dbrepo.DeleteJobByID(db, job.ID)
			continue
		}

		if job.Attempts >= 5 {
			_ = dbrepo.MoveJobToFailed(db, *job, runErr.Error())
			_ = dbrepo.DeleteJobByID(db, job.ID)
			continue
		}

		retryDelay := time.Duration(1<<uint(job.Attempts)) * time.Second
		if retryDelay > 5*time.Minute {
			retryDelay = 5 * time.Minute
		}
		_ = dbrepo.ReleaseJob(db, job.ID, retryDelay)
	}
}

func enqueueRecruitmentAIScreeningJob(db *sqlx.DB, applicationID, actorUserID int64, delay time.Duration) {
	if db == nil || applicationID <= 0 {
		return
	}
	payload := recruitmentAIScreeningJobPayload{
		ApplicationID: applicationID,
		ActorUserID:   actorUserID,
	}
	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return
	}
	_, _ = dbrepo.EnqueueJob(db, recruitmentAIScreeningQueueName, string(rawPayload), time.Now().Add(delay))
}

func loadApplicantProfileByUserID(db *sqlx.DB, userID *int64) *models.ApplicantProfile {
	if db == nil || userID == nil || *userID <= 0 {
		return nil
	}
	profile, err := dbrepo.GetApplicantProfileByUserID(db, *userID)
	if err != nil {
		return nil
	}
	return profile
}

func loadJobDescriptionByApplication(db *sqlx.DB, app models.Application) string {
	if db == nil {
		return ""
	}
	jobDesc, err := dbrepo.GetJobDescriptionByApplication(db, app.Division, app.Position)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(jobDesc)
}

func loadLatestRecruitmentAIScreeningsIndex(db *sqlx.DB, applicationIDs []int64) map[int64]map[string]any {
	out := make(map[int64]map[string]any, len(applicationIDs))
	if db == nil || len(applicationIDs) == 0 {
		return out
	}

	rows, err := dbrepo.GetLatestRecruitmentAIScreeningsByApplicationIDs(db, applicationIDs)
	if err != nil {
		return out
	}

	for appID, row := range rows {
		cloned := row
		out[appID] = mapAIScreeningPayload(&cloned)
	}
	return out
}

func loadLatestRecruitmentAIScreening(db *sqlx.DB, applicationID string) (*models.RecruitmentAIScreening, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}

	parsedID, err := strconv.ParseInt(strings.TrimSpace(applicationID), 10, 64)
	if err != nil || parsedID <= 0 {
		return nil, errors.New("id lamaran tidak valid")
	}

	return dbrepo.GetLatestRecruitmentAIScreeningByApplicationID(db, parsedID)
}

func insertRecruitmentAIScreeningFailure(
	db *sqlx.DB,
	applicationID int64,
	actorUserID int64,
	cvFilePath string,
	modelChain []string,
	errorMessage string,
	attempts []services.CVScreeningAttempt,
) error {
	if db == nil || applicationID <= 0 {
		return nil
	}
	return dbrepo.InsertRecruitmentAIScreeningFailure(db, dbrepo.RecruitmentAIScreeningFailureInput{
		ApplicationID: applicationID,
		ActorUserID:   actorUserID,
		PromptVersion: recruitmentAIScreeningPromptVersion,
		CVFilePath:    cvFilePath,
		ModelChain:    modelChain,
		ErrorMessage:  errorMessage,
		Attempts:      attempts,
		Now:           time.Now(),
	})
}

func insertRecruitmentAIScreeningSuccess(
	db *sqlx.DB,
	applicationID int64,
	actorUserID int64,
	cvFilePath string,
	cvTextChars int,
	modelUsed string,
	modelChain []string,
	usage services.CVScreeningTokenUsage,
	result services.CVScreeningResult,
	attempts []services.CVScreeningAttempt,
	rawResponse string,
) (*models.RecruitmentAIScreening, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	return dbrepo.InsertRecruitmentAIScreeningSuccess(db, dbrepo.RecruitmentAIScreeningSuccessInput{
		ApplicationID:      applicationID,
		ActorUserID:        actorUserID,
		PromptVersion:      recruitmentAIScreeningPromptVersion,
		CVFilePath:         cvFilePath,
		CVTextChars:        cvTextChars,
		ModelUsed:          modelUsed,
		ModelChain:         modelChain,
		MatchScore:         result.MatchScore,
		Recommendation:     result.Recommendation,
		Summary:            result.Summary,
		Strengths:          result.Strengths,
		Gaps:               result.Gaps,
		RedFlags:           result.RedFlags,
		InterviewQuestions: result.InterviewQuestions,
		PromptTokens:       usage.PromptTokens,
		CompletionTokens:   usage.CompletionTokens,
		TotalTokens:        usage.TotalTokens,
		Attempts:           attempts,
		RawResponse:        rawResponse,
		Now:                time.Now(),
	})
}

func mapAIScreeningPayload(row *models.RecruitmentAIScreening) map[string]any {
	if row == nil {
		return nil
	}

	var score any
	if row.MatchScore != nil {
		score = *row.MatchScore
	}

	var createdAt any
	if row.CreatedAt != nil && !row.CreatedAt.IsZero() {
		createdAt = row.CreatedAt.Format(time.RFC3339)
	}

	var updatedAt any
	if row.UpdatedAt != nil && !row.UpdatedAt.IsZero() {
		updatedAt = row.UpdatedAt.Format(time.RFC3339)
	}

	return map[string]any{
		"id":                  row.ID,
		"application_id":      row.ApplicationID,
		"provider":            row.Provider,
		"model_used":          row.ModelUsed,
		"model_chain":         handlers.DecodeJSONStringArray(row.ModelChain),
		"prompt_version":      row.PromptVersion,
		"cv_file_path":        row.CVFilePath,
		"cv_text_chars":       row.CVTextChars,
		"match_score":         score,
		"recommendation":      row.Recommendation,
		"summary":             row.Summary,
		"strengths":           handlers.DecodeJSONStringArray(row.StrengthsJSON),
		"gaps":                handlers.DecodeJSONStringArray(row.GapsJSON),
		"red_flags":           handlers.DecodeJSONStringArray(row.RedFlagsJSON),
		"interview_questions": handlers.DecodeJSONStringArray(row.InterviewQuestionsJSON),
		"tokens": map[string]any{
			"prompt":     row.TokenPrompt,
			"completion": row.TokenCompletion,
			"total":      row.TokenTotal,
		},
		"attempts":      handlers.DecodeJSONArray(row.AttemptsJSON),
		"status":        row.Status,
		"error_message": row.ErrorMessage,
		"created_at":    createdAt,
		"updated_at":    updatedAt,
	}
}
