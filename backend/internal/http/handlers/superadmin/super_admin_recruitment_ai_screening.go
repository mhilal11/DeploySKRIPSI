package superadmin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
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

const recruitmentAIScreeningPromptVersion = "cv-screening-v4"
const recruitmentAIScreeningPromptVersionNoMemory = "cv-screening-v4-no-memory"
const recruitmentAIScreeningQueueName = "recruitment_ai_screening"
const recruitmentAIScreeningSameApplicationMemoryLimit = 2
const recruitmentAIScreeningSimilarReferenceLimit = 5
const recruitmentAIScreeningWorkerLockKey = "lock:recruitment_ai_screening_worker"
const recruitmentAIScreeningWorkerLockLease = 4 * time.Minute
const recruitmentAIScreeningWorkerIdleDelay = 1200 * time.Millisecond
const recruitmentAIScreeningWorkerErrorDelay = 2 * time.Second
const recruitmentAIScreeningWorkerMinSuccessDelay = 1500 * time.Millisecond

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
	Usage       services.CVScreeningTokenUsage
}

type recruitmentAIScreeningProviderError struct {
	CVFilePath    string
	PromptVersion string
	ModelChain    []string
	Attempts      []services.CVScreeningAttempt
	Err           error
}

func (e *recruitmentAIScreeningProviderError) Error() string {
	if e == nil || e.Err == nil {
		return ""
	}
	return e.Err.Error()
}

func (e *recruitmentAIScreeningProviderError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Err
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
	payload := loadAIScreeningPayloadForApplication(db, screening, applicationID)

	c.JSON(http.StatusOK, gin.H{
		"application_id": applicationID,
		"ai_screening":   payload,
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
		persistRecruitmentAIScreeningProviderFailure(db, applicationID, user.ID, err)
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
			handlers.JSONError(c, http.StatusBadGateway, "Screening AI sedang diproses ulang. Silakan muat ulang beberapa saat lagi.")
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
		cfg.GroqAPIKeys,
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
	promptVersion := recruitmentAIScreeningPromptVersionNoMemory
	if cfg.CVScreeningUseMemory {
		promptVersion = recruitmentAIScreeningPromptVersion
	}

	cvText, err := services.ExtractCVTextWithKey(absCVPath, cfg.StorageEncryptionKey)
	if err != nil {
		_ = insertRecruitmentAIScreeningFailure(db, app.ID, actorUserID, normalizedCVPath, promptVersion, client.Models(), err.Error(), nil)
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
	if cfg.CVScreeningUseMemory {
		input.PreviousRuns = loadSameApplicationAIScreeningMemory(db, *app)
		input.ReferenceRuns = loadSimilarAIScreeningMemory(db, *app)
	}

	result, modelUsed, attempts, usage, rawResponse, screeningErr := client.ScreenCV(ctx, input)
	if screeningErr != nil {
		return nil, fmt.Errorf("%w: %w", errAIScreeningProviderFailed, &recruitmentAIScreeningProviderError{
			CVFilePath:    normalizedCVPath,
			PromptVersion: promptVersion,
			ModelChain:    client.Models(),
			Attempts:      attempts,
			Err:           screeningErr,
		})
	}

	row, err := insertRecruitmentAIScreeningSuccess(
		db,
		app.ID,
		actorUserID,
		normalizedCVPath,
		len([]rune(cvText)),
		promptVersion,
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
		Usage:       usage,
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

	workerOwner := buildRecruitmentAIScreeningWorkerOwner()
	for {
		acquired, err := dbrepo.AcquireExpiringLock(db, recruitmentAIScreeningWorkerLockKey, workerOwner, recruitmentAIScreeningWorkerLockLease)
		if err != nil {
			time.Sleep(recruitmentAIScreeningWorkerErrorDelay)
			continue
		}
		if !acquired {
			time.Sleep(recruitmentAIScreeningWorkerIdleDelay)
			continue
		}

		holdLockDelay := time.Duration(0)
		sleepAfterRelease := time.Duration(0)

		job, err := dbrepo.ReserveNextJob(db, recruitmentAIScreeningQueueName, 2*time.Minute)
		if err != nil {
			sleepAfterRelease = recruitmentAIScreeningWorkerErrorDelay
			_ = dbrepo.ReleaseExpiringLock(db, recruitmentAIScreeningWorkerLockKey, workerOwner)
			if sleepAfterRelease > 0 {
				time.Sleep(sleepAfterRelease)
			}
			continue
		}
		if job == nil {
			sleepAfterRelease = recruitmentAIScreeningWorkerIdleDelay
			_ = dbrepo.ReleaseExpiringLock(db, recruitmentAIScreeningWorkerLockKey, workerOwner)
			if sleepAfterRelease > 0 {
				time.Sleep(sleepAfterRelease)
			}
			continue
		}

		var payload recruitmentAIScreeningJobPayload
		if err := json.Unmarshal([]byte(job.Payload), &payload); err != nil {
			_ = dbrepo.MoveJobToFailed(db, *job, "payload tidak valid: "+err.Error())
			_ = dbrepo.DeleteJobByID(db, job.ID)
			_ = dbrepo.ReleaseExpiringLock(db, recruitmentAIScreeningWorkerLockKey, workerOwner)
			continue
		}
		if payload.ApplicationID <= 0 {
			_ = dbrepo.MoveJobToFailed(db, *job, "application_id tidak valid")
			_ = dbrepo.DeleteJobByID(db, job.ID)
			_ = dbrepo.ReleaseExpiringLock(db, recruitmentAIScreeningWorkerLockKey, workerOwner)
			continue
		}

		timeoutSec := cfg.GroqRequestTimeoutSec
		if timeoutSec <= 0 {
			timeoutSec = 60
		}
		ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSec+20)*time.Second)
		output, runErr := runRecruitmentAIScreeningForApplication(ctx, db, cfg, payload.ApplicationID, payload.ActorUserID)
		cancel()

		if runErr == nil {
			_ = dbrepo.DeleteJobByID(db, job.ID)
			holdLockDelay = computeRecruitmentAIScreeningSuccessDelay(output, cfg.GroqTPMLimit)
			releaseRecruitmentAIScreeningWorkerLock(db, workerOwner, holdLockDelay)
			continue
		}

		if job.Attempts >= 5 {
			persistRecruitmentAIScreeningProviderFailure(db, payload.ApplicationID, payload.ActorUserID, runErr)
			_ = dbrepo.MoveJobToFailed(db, *job, runErr.Error())
			_ = dbrepo.DeleteJobByID(db, job.ID)
			_ = dbrepo.ReleaseExpiringLock(db, recruitmentAIScreeningWorkerLockKey, workerOwner)
			continue
		}

		if retryDelay, ok := services.SuggestedGroqRetryDelay(runErr); ok {
			_ = dbrepo.ReleaseJob(db, job.ID, retryDelay)
			holdLockDelay = retryDelay
			releaseRecruitmentAIScreeningWorkerLock(db, workerOwner, holdLockDelay)
			continue
		}

		retryDelay := time.Duration(1<<uint(job.Attempts)) * time.Second
		if retryDelay > 5*time.Minute {
			retryDelay = 5 * time.Minute
		}
		_ = dbrepo.ReleaseJob(db, job.ID, retryDelay)
		_ = dbrepo.ReleaseExpiringLock(db, recruitmentAIScreeningWorkerLockKey, workerOwner)
		time.Sleep(recruitmentAIScreeningWorkerMinSuccessDelay)
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

func buildRecruitmentAIScreeningWorkerOwner() string {
	return fmt.Sprintf("pid-%d-%d", os.Getpid(), time.Now().UnixNano())
}

func releaseRecruitmentAIScreeningWorkerLock(db *sqlx.DB, owner string, holdDelay time.Duration) {
	if holdDelay > 0 {
		time.Sleep(holdDelay)
	}
	_ = dbrepo.ReleaseExpiringLock(db, recruitmentAIScreeningWorkerLockKey, owner)
}

func computeRecruitmentAIScreeningSuccessDelay(output *recruitmentAIScreeningRunOutput, tpmLimit int) time.Duration {
	if output == nil {
		return recruitmentAIScreeningWorkerMinSuccessDelay
	}

	totalTokens := output.Usage.TotalTokens
	if totalTokens <= 0 {
		totalTokens = output.Usage.PromptTokens + output.Usage.CompletionTokens
	}
	if totalTokens <= 0 {
		return recruitmentAIScreeningWorkerMinSuccessDelay
	}
	if tpmLimit <= 0 {
		tpmLimit = 8000
	}

	delay := time.Duration(totalTokens) * time.Minute / time.Duration(tpmLimit)
	if delay < recruitmentAIScreeningWorkerMinSuccessDelay {
		delay = recruitmentAIScreeningWorkerMinSuccessDelay
	}
	return delay
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
	jobIndex, _ := dbrepo.FindQueuedApplicationJobIndex(db, recruitmentAIScreeningQueueName, applicationIDs)

	for _, appID := range applicationIDs {
		row, ok := rows[appID]
		if !ok {
			if job, hasJob := jobIndex[appID]; hasJob {
				out[appID] = synthesizeQueuedAIScreeningPayload(appID, job, "")
			}
			continue
		}
		cloned := row
		out[appID] = mapAIScreeningPayloadWithJob(&cloned, jobIndex[appID])
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

func loadSameApplicationAIScreeningMemory(db *sqlx.DB, app models.Application) []services.CVScreeningMemoryEntry {
	if db == nil || app.ID <= 0 {
		return nil
	}

	rows, err := dbrepo.GetSuccessfulAIScreeningHistoryByApplicationID(db, app.ID, recruitmentAIScreeningSameApplicationMemoryLimit)
	if err != nil {
		return nil
	}

	return mapAIScreeningMemoryEntries(rows, "Run Sebelumnya")
}

func loadSimilarAIScreeningMemory(db *sqlx.DB, app models.Application) []services.CVScreeningMemoryEntry {
	if db == nil || app.ID <= 0 {
		return nil
	}

	rows, err := dbrepo.GetSimilarSuccessfulAIScreeningMemories(
		db,
		app.Position,
		app.Division,
		app.ID,
		recruitmentAIScreeningSimilarReferenceLimit,
	)
	if err != nil {
		return nil
	}

	return mapAIScreeningMemoryEntries(rows, "Referensi Historis")
}

func mapAIScreeningMemoryEntries(rows []dbrepo.RecruitmentAIScreeningMemoryRecord, labelPrefix string) []services.CVScreeningMemoryEntry {
	if len(rows) == 0 {
		return nil
	}

	out := make([]services.CVScreeningMemoryEntry, 0, len(rows))
	for idx, row := range rows {
		label := strings.TrimSpace(labelPrefix)
		if label == "" {
			label = "Referensi"
		}
		out = append(out, services.CVScreeningMemoryEntry{
			Label:          fmt.Sprintf("%s %d", label, idx+1),
			Position:       strings.TrimSpace(row.Position),
			Division:       strings.TrimSpace(handlers.FirstString(row.Division, "")),
			FinalOutcome:   normalizeAIScreeningOutcomeLabel(row.ApplicationStatus),
			ScreeningDate:  formatAIScreeningMemoryDate(row.ScreeningCreatedAt),
			MatchScore:     row.MatchScore,
			Recommendation: strings.TrimSpace(handlers.FirstString(row.Recommendation, "")),
			Summary:        strings.TrimSpace(handlers.FirstString(row.Summary, "")),
			Strengths:      handlers.DecodeJSONStringArray(row.StrengthsJSON),
			Gaps:           handlers.DecodeJSONStringArray(row.GapsJSON),
			RedFlags:       handlers.DecodeJSONStringArray(row.RedFlagsJSON),
		})
	}
	return out
}

func normalizeAIScreeningOutcomeLabel(status string) string {
	switch strings.TrimSpace(status) {
	case "Hired":
		return "Diterima"
	case "Rejected":
		return "Ditolak"
	case "Offering":
		return "Penawaran"
	case "Interview":
		return "Interview"
	case "Screening":
		return "Screening"
	case "Applied":
		return "Applied"
	default:
		return strings.TrimSpace(status)
	}
}

func formatAIScreeningMemoryDate(value *time.Time) string {
	if value == nil || value.IsZero() {
		return "-"
	}
	return value.Format("2006-01-02")
}

func insertRecruitmentAIScreeningFailure(
	db *sqlx.DB,
	applicationID int64,
	actorUserID int64,
	cvFilePath string,
	promptVersion string,
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
		PromptVersion: promptVersion,
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
	promptVersion string,
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
		PromptVersion:      promptVersion,
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
	return mapAIScreeningPayloadWithJob(row, dbrepo.JobRecord{})
}

func mapAIScreeningPayloadWithJob(row *models.RecruitmentAIScreening, job dbrepo.JobRecord) map[string]any {
	if row == nil {
		if job.ID > 0 {
			return synthesizeQueuedAIScreeningPayload(0, job, "")
		}
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

	status := normalizeAIScreeningDisplayStatus(row.Status, job)
	errorMessage := humanizeRecruitmentAIScreeningErrorMessage(handlers.FirstString(row.ErrorMessage, ""))
	if job.ID > 0 {
		errorMessage = queuedAIScreeningStatusMessage(status, handlers.FirstString(row.ErrorMessage, ""))
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
		"status":        status,
		"error_message": errorMessage,
		"created_at":    createdAt,
		"updated_at":    updatedAt,
	}
}

func persistRecruitmentAIScreeningProviderFailure(db *sqlx.DB, applicationID, actorUserID int64, err error) {
	if db == nil || applicationID <= 0 || !errors.Is(err, errAIScreeningProviderFailed) {
		return
	}

	var providerErr *recruitmentAIScreeningProviderError
	if !errors.As(err, &providerErr) || providerErr == nil {
		return
	}

	_ = insertRecruitmentAIScreeningFailure(
		db,
		applicationID,
		actorUserID,
		providerErr.CVFilePath,
		providerErr.PromptVersion,
		providerErr.ModelChain,
		providerErr.Error(),
		providerErr.Attempts,
	)
}

func humanizeRecruitmentAIScreeningErrorMessage(message string) string {
	return services.HumanizeGroqScreeningErrorMessage(message)
}

func normalizeAIScreeningDisplayStatus(status string, job dbrepo.JobRecord) string {
	if job.ID <= 0 {
		return strings.TrimSpace(status)
	}
	if job.Attempts > 0 {
		return "retrying"
	}
	return "processing"
}

func queuedAIScreeningStatusMessage(status string, rawError string) string {
	switch strings.TrimSpace(status) {
	case "retrying":
		humanized := humanizeRecruitmentAIScreeningErrorMessage(rawError)
		if humanized != "" {
			return humanized
		}
		return "Screening CV sedang dicoba ulang otomatis."
	case "processing":
		return "Screening CV sedang diproses dengan model gpt-oss-120b."
	default:
		return humanizeRecruitmentAIScreeningErrorMessage(rawError)
	}
}

func synthesizeQueuedAIScreeningPayload(applicationID int64, job dbrepo.JobRecord, rawError string) map[string]any {
	status := normalizeAIScreeningDisplayStatus("", job)
	return map[string]any{
		"id":                  nil,
		"application_id":      applicationID,
		"provider":            "groq",
		"model_used":          "openai/gpt-oss-120b",
		"model_chain":         []string{"openai/gpt-oss-120b"},
		"prompt_version":      nil,
		"cv_file_path":        nil,
		"cv_text_chars":       0,
		"match_score":         nil,
		"recommendation":      nil,
		"summary":             nil,
		"strengths":           []string{},
		"gaps":                []string{},
		"red_flags":           []string{},
		"interview_questions": []string{},
		"tokens": map[string]any{
			"prompt":     0,
			"completion": 0,
			"total":      0,
		},
		"attempts":      []any{},
		"status":        status,
		"error_message": queuedAIScreeningStatusMessage(status, rawError),
		"created_at":    nil,
		"updated_at":    nil,
	}
}

func loadAIScreeningPayloadForApplication(db *sqlx.DB, row *models.RecruitmentAIScreening, applicationID string) map[string]any {
	if db == nil {
		return mapAIScreeningPayload(row)
	}
	parsedID, err := strconv.ParseInt(strings.TrimSpace(applicationID), 10, 64)
	if err != nil || parsedID <= 0 {
		return mapAIScreeningPayload(row)
	}
	jobIndex, _ := dbrepo.FindQueuedApplicationJobIndex(db, recruitmentAIScreeningQueueName, []int64{parsedID})
	return mapAIScreeningPayloadWithJob(row, jobIndex[parsedID])
}
