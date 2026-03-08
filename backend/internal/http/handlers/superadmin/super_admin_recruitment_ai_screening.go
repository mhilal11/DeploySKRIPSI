package superadmin

import (
	"hris-backend/internal/http/handlers"

	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/config"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

const recruitmentAIScreeningPromptVersion = "cv-screening-v2"

var (
	errAIScreeningConfigIncomplete    = errors.New("konfigurasi groq belum lengkap")
	errAIScreeningApplicationNotFound = errors.New("lamaran tidak ditemukan")
	errAIScreeningCVUnavailable       = errors.New("cv kandidat belum tersedia")
	errAIScreeningCVPathInvalid       = errors.New("path cv tidak valid")
	errAIScreeningCVFileNotFound      = errors.New("file cv tidak ditemukan")
	errAIScreeningCVUnreadable        = errors.New("cv tidak dapat diproses")
	errAIScreeningProviderFailed      = errors.New("screening ai gagal")
	errAIScreeningPersistFailed       = errors.New("hasil screening ai gagal disimpan")
)

type recruitmentAIScreeningRunOutput struct {
	Application models.Application
	Row         *models.RecruitmentAIScreening
	ModelUsed   string
	Result      services.CVScreeningResult
}

func init() {
	handlers.TriggerRecruitmentAIScreening = TriggerAutomaticRecruitmentAIScreening
}

func TriggerAutomaticRecruitmentAIScreening(db *sqlx.DB, cfg config.Config, applicationID, actorUserID int64) {
	if db == nil || applicationID <= 0 {
		return
	}
	go func() {
		timeoutSec := cfg.GroqRequestTimeoutSec
		if timeoutSec <= 0 {
			timeoutSec = 60
		}
		ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSec+15)*time.Second)
		defer cancel()
		_, _ = runRecruitmentAIScreeningForApplication(ctx, db, cfg, applicationID, actorUserID)
	}()
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

	var app models.Application
	if err := db.Get(&app, "SELECT * FROM applications WHERE id = ?", applicationID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errAIScreeningApplicationNotFound
		}
		return nil, fmt.Errorf("%w: %v", errAIScreeningPersistFailed, err)
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

	cvText, err := services.ExtractCVText(absCVPath)
	if err != nil {
		insertRecruitmentAIScreeningFailure(db, app.ID, actorUserID, normalizedCVPath, client.Models(), err.Error(), nil)
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
	criteria := resolveVacancyScoringCriteria(app, criteriaByVacancyKey, criteriaByPosition)
	jobDescription := loadJobDescriptionByApplication(db, app)

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
		insertRecruitmentAIScreeningFailure(db, app.ID, actorUserID, normalizedCVPath, client.Models(), screeningErr.Error(), attempts)
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
		Application: app,
		Row:         row,
		ModelUsed:   modelUsed,
		Result:      result,
	}, nil
}

func loadApplicantProfileByUserID(db *sqlx.DB, userID *int64) *models.ApplicantProfile {
	if db == nil || userID == nil || *userID <= 0 {
		return nil
	}

	var profile models.ApplicantProfile
	if err := db.Get(&profile, "SELECT * FROM applicant_profiles WHERE user_id = ?", *userID); err != nil {
		return nil
	}
	return &profile
}

func loadJobDescriptionByApplication(db *sqlx.DB, app models.Application) string {
	if db == nil {
		return ""
	}

	var desc sql.NullString
	if app.Division != nil && strings.TrimSpace(*app.Division) != "" {
		_ = db.Get(
			&desc,
			`SELECT job_description
			 FROM division_profiles
			 WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
			   AND LOWER(TRIM(job_title)) = LOWER(TRIM(?))
			 LIMIT 1`,
			*app.Division,
			app.Position,
		)
		if desc.Valid {
			return strings.TrimSpace(desc.String)
		}
	}

	_ = db.Get(
		&desc,
		`SELECT job_description
		 FROM division_profiles
		 WHERE LOWER(TRIM(job_title)) = LOWER(TRIM(?))
		 LIMIT 1`,
		app.Position,
	)
	if desc.Valid {
		return strings.TrimSpace(desc.String)
	}
	return ""
}

func loadLatestRecruitmentAIScreeningsIndex(db *sqlx.DB, applicationIDs []int64) map[int64]map[string]any {
	out := make(map[int64]map[string]any, len(applicationIDs))
	if db == nil || len(applicationIDs) == 0 {
		return out
	}
	if err := ensureRecruitmentAIScreeningTable(db); err != nil {
		return out
	}

	query, args, err := sqlx.In(`
		SELECT s.*
		FROM recruitment_ai_screenings s
		INNER JOIN (
			SELECT application_id, MAX(id) AS latest_id
			FROM recruitment_ai_screenings
			WHERE application_id IN (?)
			GROUP BY application_id
		) latest ON latest.latest_id = s.id
	`, applicationIDs)
	if err != nil {
		return out
	}
	query = db.Rebind(query)

	rows := []models.RecruitmentAIScreening{}
	if err := db.Select(&rows, query, args...); err != nil {
		return out
	}
	for _, row := range rows {
		cloned := row
		out[row.ApplicationID] = mapAIScreeningPayload(&cloned)
	}
	return out
}

func loadLatestRecruitmentAIScreening(db *sqlx.DB, applicationID string) (*models.RecruitmentAIScreening, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if err := ensureRecruitmentAIScreeningTable(db); err != nil {
		return nil, err
	}

	var row models.RecruitmentAIScreening
	err := db.Get(&row, `
		SELECT *
		FROM recruitment_ai_screenings
		WHERE application_id = ?
		ORDER BY id DESC
		LIMIT 1
	`, applicationID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &row, nil
}

func insertRecruitmentAIScreeningFailure(
	db *sqlx.DB,
	applicationID int64,
	actorUserID int64,
	cvFilePath string,
	modelChain []string,
	errorMessage string,
	attempts []services.CVScreeningAttempt,
) {
	if db == nil || applicationID <= 0 {
		return
	}
	if err := ensureRecruitmentAIScreeningTable(db); err != nil {
		return
	}
	now := time.Now()
	_, _ = db.Exec(`
		INSERT INTO recruitment_ai_screenings (
			application_id, actor_user_id, provider, model_chain, prompt_version,
			cv_file_path, cv_text_chars, token_prompt, token_completion, token_total,
			attempts_json, status, error_message, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		applicationID,
		nullableInt64(actorUserID),
		"groq",
		marshalModelsJSON(modelChain),
		recruitmentAIScreeningPromptVersion,
		nullableString(cvFilePath),
		0,
		0,
		0,
		0,
		marshalModelsJSON(attempts),
		"failed",
		nullableString(errorMessage),
		now,
		now,
	)
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
	if err := ensureRecruitmentAIScreeningTable(db); err != nil {
		return nil, err
	}

	now := time.Now()
	score := result.MatchScore
	recommendation := strings.TrimSpace(result.Recommendation)
	summary := strings.TrimSpace(result.Summary)

	_, err := db.Exec(`
		INSERT INTO recruitment_ai_screenings (
			application_id, actor_user_id, provider, model_used, model_chain, prompt_version,
			cv_file_path, cv_text_chars, match_score, recommendation, summary,
			strengths_json, gaps_json, red_flags_json, interview_questions_json,
			token_prompt, token_completion, token_total, attempts_json, raw_response,
			status, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		applicationID,
		nullableInt64(actorUserID),
		"groq",
		nullableString(modelUsed),
		marshalModelsJSON(modelChain),
		recruitmentAIScreeningPromptVersion,
		nullableString(cvFilePath),
		cvTextChars,
		score,
		nullableString(recommendation),
		nullableString(summary),
		marshalModelsJSON(result.Strengths),
		marshalModelsJSON(result.Gaps),
		marshalModelsJSON(result.RedFlags),
		marshalModelsJSON(result.InterviewQuestions),
		usage.PromptTokens,
		usage.CompletionTokens,
		usage.TotalTokens,
		marshalModelsJSON(attempts),
		marshalRawResponse(rawResponse),
		"success",
		now,
		now,
	)
	if err != nil {
		return nil, err
	}

	latest, loadErr := loadLatestRecruitmentAIScreening(db, fmt.Sprintf("%d", applicationID))
	if loadErr != nil {
		return nil, loadErr
	}
	return latest, nil
}

func marshalModelsJSON(value any) models.JSON {
	if value == nil {
		return nil
	}
	raw, err := json.Marshal(value)
	if err != nil || len(raw) == 0 {
		return nil
	}
	return models.JSON(raw)
}

func marshalRawResponse(value string) models.JSON {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	if json.Valid([]byte(trimmed)) {
		return models.JSON([]byte(trimmed))
	}
	raw, err := json.Marshal(trimmed)
	if err != nil {
		return nil
	}
	return models.JSON(raw)
}

func nullableString(value string) any {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return trimmed
}

func nullableInt64(value int64) any {
	if value <= 0 {
		return nil
	}
	return value
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

func ensureRecruitmentAIScreeningTable(db *sqlx.DB) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec(`
CREATE TABLE IF NOT EXISTS recruitment_ai_screenings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  provider VARCHAR(32) NOT NULL DEFAULT 'groq',
  model_used VARCHAR(128) NULL,
  model_chain JSON NULL,
  prompt_version VARCHAR(64) NOT NULL DEFAULT 'cv-screening-v1',
  cv_file_path VARCHAR(255) NULL,
  cv_text_chars INT NOT NULL DEFAULT 0,
  match_score DECIMAL(5,2) NULL,
  recommendation VARCHAR(64) NULL,
  summary TEXT NULL,
  strengths_json JSON NULL,
  gaps_json JSON NULL,
  red_flags_json JSON NULL,
  interview_questions_json JSON NULL,
  token_prompt INT NOT NULL DEFAULT 0,
  token_completion INT NOT NULL DEFAULT 0,
  token_total INT NOT NULL DEFAULT 0,
  attempts_json JSON NULL,
  raw_response JSON NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'success',
  error_message TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  INDEX idx_recruitment_ai_screenings_application (application_id),
  INDEX idx_recruitment_ai_screenings_created_at (created_at),
  CONSTRAINT fk_recruitment_ai_screenings_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_recruitment_ai_screenings_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`)
	return err
}
