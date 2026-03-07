package models

import "time"

type RecruitmentAIScreening struct {
	ID                     int64      `db:"id" json:"id"`
	ApplicationID          int64      `db:"application_id" json:"application_id"`
	ActorUserID            *int64     `db:"actor_user_id" json:"actor_user_id"`
	Provider               string     `db:"provider" json:"provider"`
	ModelUsed              *string    `db:"model_used" json:"model_used"`
	ModelChain             JSON       `db:"model_chain" json:"model_chain"`
	PromptVersion          string     `db:"prompt_version" json:"prompt_version"`
	CVFilePath             *string    `db:"cv_file_path" json:"cv_file_path"`
	CVTextChars            int        `db:"cv_text_chars" json:"cv_text_chars"`
	MatchScore             *float64   `db:"match_score" json:"match_score"`
	Recommendation         *string    `db:"recommendation" json:"recommendation"`
	Summary                *string    `db:"summary" json:"summary"`
	StrengthsJSON          JSON       `db:"strengths_json" json:"strengths_json"`
	GapsJSON               JSON       `db:"gaps_json" json:"gaps_json"`
	RedFlagsJSON           JSON       `db:"red_flags_json" json:"red_flags_json"`
	InterviewQuestionsJSON JSON       `db:"interview_questions_json" json:"interview_questions_json"`
	TokenPrompt            int        `db:"token_prompt" json:"token_prompt"`
	TokenCompletion        int        `db:"token_completion" json:"token_completion"`
	TokenTotal             int        `db:"token_total" json:"token_total"`
	AttemptsJSON           JSON       `db:"attempts_json" json:"attempts_json"`
	RawResponse            JSON       `db:"raw_response" json:"raw_response"`
	Status                 string     `db:"status" json:"status"`
	ErrorMessage           *string    `db:"error_message" json:"error_message"`
	CreatedAt              *time.Time `db:"created_at" json:"created_at"`
	UpdatedAt              *time.Time `db:"updated_at" json:"updated_at"`
}
