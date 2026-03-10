package db

import (
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type RecruitmentAIScreeningFailureInput struct {
	ApplicationID int64
	ActorUserID   int64
	PromptVersion string
	CVFilePath    string
	ModelChain    []string
	ErrorMessage  string
	Attempts      any
	Now           time.Time
}

type RecruitmentAIScreeningSuccessInput struct {
	ApplicationID      int64
	ActorUserID        int64
	PromptVersion      string
	CVFilePath         string
	CVTextChars        int
	ModelUsed          string
	ModelChain         []string
	MatchScore         float64
	Recommendation     string
	Summary            string
	Strengths          []string
	Gaps               []string
	RedFlags           []string
	InterviewQuestions []string
	PromptTokens       int
	CompletionTokens   int
	TotalTokens        int
	Attempts           any
	RawResponse        string
	Now                time.Time
}

func GetApplicationByID(db *sqlx.DB, applicationID int64) (*models.Application, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var app models.Application
	if err := db.Get(&app, "SELECT * FROM applications WHERE id = ?", applicationID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &app, nil
}

func GetApplicantProfileByUserID(db *sqlx.DB, userID int64) (*models.ApplicantProfile, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var profile models.ApplicantProfile
	if err := db.Get(&profile, "SELECT * FROM applicant_profiles WHERE user_id = ?", userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &profile, nil
}

func GetJobDescriptionByApplication(db *sqlx.DB, division *string, position string) (string, error) {
	if db == nil {
		return "", errors.New("database tidak tersedia")
	}

	var desc sql.NullString
	trimmedPos := strings.TrimSpace(position)
	if trimmedPos == "" {
		return "", nil
	}

	if division != nil && strings.TrimSpace(*division) != "" {
		err := db.Get(
			&desc,
			`SELECT job_description
			 FROM division_profiles
			 WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
			   AND LOWER(TRIM(job_title)) = LOWER(TRIM(?))
			 LIMIT 1`,
			strings.TrimSpace(*division),
			trimmedPos,
		)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return "", err
		}
		if desc.Valid {
			return strings.TrimSpace(desc.String), nil
		}
	}

	err := db.Get(
		&desc,
		`SELECT job_description
		 FROM division_profiles
		 WHERE LOWER(TRIM(job_title)) = LOWER(TRIM(?))
		 LIMIT 1`,
		trimmedPos,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	if desc.Valid {
		return strings.TrimSpace(desc.String), nil
	}
	return "", nil
}

func ListDivisionProfiles(db *sqlx.DB) ([]models.DivisionProfile, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.DivisionProfile{}
	if err := db.Select(&rows, "SELECT * FROM division_profiles"); err != nil {
		return nil, err
	}
	return rows, nil
}

func GetLatestRecruitmentAIScreeningsByApplicationIDs(db *sqlx.DB, applicationIDs []int64) (map[int64]models.RecruitmentAIScreening, error) {
	out := make(map[int64]models.RecruitmentAIScreening, len(applicationIDs))
	if db == nil || len(applicationIDs) == 0 {
		return out, nil
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
		return out, err
	}
	query = db.Rebind(query)

	rows := []models.RecruitmentAIScreening{}
	if err := db.Select(&rows, query, args...); err != nil {
		return out, err
	}
	for _, row := range rows {
		out[row.ApplicationID] = row
	}
	return out, nil
}

func GetLatestRecruitmentAIScreeningByApplicationID(db *sqlx.DB, applicationID int64) (*models.RecruitmentAIScreening, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
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

func InsertRecruitmentAIScreeningFailure(db *sqlx.DB, input RecruitmentAIScreeningFailureInput) error {
	if db == nil || input.ApplicationID <= 0 {
		return errors.New("parameter screening gagal tidak valid")
	}
	if input.Now.IsZero() {
		input.Now = time.Now()
	}

	_, err := db.Exec(`
		INSERT INTO recruitment_ai_screenings (
			application_id, actor_user_id, provider, model_chain, prompt_version,
			cv_file_path, cv_text_chars, token_prompt, token_completion, token_total,
			attempts_json, status, error_message, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		input.ApplicationID,
		aiNullableInt64(input.ActorUserID),
		"groq",
		marshalJSON(input.ModelChain),
		aiStringWithFallback(input.PromptVersion, "cv-screening-v1"),
		aiNullableString(input.CVFilePath),
		0,
		0,
		0,
		0,
		marshalJSON(input.Attempts),
		"failed",
		aiNullableString(input.ErrorMessage),
		input.Now,
		input.Now,
	)
	return err
}

func InsertRecruitmentAIScreeningSuccess(db *sqlx.DB, input RecruitmentAIScreeningSuccessInput) (*models.RecruitmentAIScreening, error) {
	if db == nil || input.ApplicationID <= 0 {
		return nil, errors.New("parameter screening sukses tidak valid")
	}
	if input.Now.IsZero() {
		input.Now = time.Now()
	}

	_, err := db.Exec(`
		INSERT INTO recruitment_ai_screenings (
			application_id, actor_user_id, provider, model_used, model_chain, prompt_version,
			cv_file_path, cv_text_chars, match_score, recommendation, summary,
			strengths_json, gaps_json, red_flags_json, interview_questions_json,
			token_prompt, token_completion, token_total, attempts_json, raw_response,
			status, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		input.ApplicationID,
		aiNullableInt64(input.ActorUserID),
		"groq",
		aiNullableString(input.ModelUsed),
		marshalJSON(input.ModelChain),
		aiStringWithFallback(input.PromptVersion, "cv-screening-v1"),
		aiNullableString(input.CVFilePath),
		input.CVTextChars,
		input.MatchScore,
		aiNullableString(input.Recommendation),
		aiNullableString(input.Summary),
		marshalJSON(input.Strengths),
		marshalJSON(input.Gaps),
		marshalJSON(input.RedFlags),
		marshalJSON(input.InterviewQuestions),
		input.PromptTokens,
		input.CompletionTokens,
		input.TotalTokens,
		marshalJSON(input.Attempts),
		marshalRawResponse(input.RawResponse),
		"success",
		input.Now,
		input.Now,
	)
	if err != nil {
		return nil, err
	}

	return GetLatestRecruitmentAIScreeningByApplicationID(db, input.ApplicationID)
}

func GetLatestSuccessfulAIScoresByApplicationIDs(db *sqlx.DB, applicationIDs []int64) (map[int64]float64, error) {
	out := make(map[int64]float64, len(applicationIDs))
	if db == nil || len(applicationIDs) == 0 {
		return out, nil
	}

	query, args, err := sqlx.In(`
		SELECT s.application_id, s.match_score
		FROM recruitment_ai_screenings s
		INNER JOIN (
			SELECT application_id, MAX(id) AS latest_id
			FROM recruitment_ai_screenings
			WHERE status = 'success'
			  AND match_score IS NOT NULL
			  AND application_id IN (?)
			GROUP BY application_id
		) latest ON latest.latest_id = s.id
	`, applicationIDs)
	if err != nil {
		return out, err
	}
	query = db.Rebind(query)

	rows := []struct {
		ApplicationID int64           `db:"application_id"`
		MatchScore    sql.NullFloat64 `db:"match_score"`
	}{}
	if err := db.Select(&rows, query, args...); err != nil {
		return out, err
	}

	for _, row := range rows {
		if row.MatchScore.Valid {
			out[row.ApplicationID] = row.MatchScore.Float64
		}
	}
	return out, nil
}

func marshalJSON(value any) models.JSON {
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

func aiNullableString(value string) any {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return trimmed
}

func aiStringWithFallback(value string, fallback string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return fallback
	}
	return trimmed
}

func aiNullableInt64(value int64) any {
	if value <= 0 {
		return nil
	}
	return value
}
