package organizationmodel

import (
	modeltypes "hris-backend/internal/models/types"
	"time"
)

type DivisionJob struct {
	ID                int64           `db:"id" json:"id"`
	DivisionProfileID int64           `db:"division_profile_id" json:"division_profile_id"`
	JobTitle          string          `db:"job_title" json:"job_title"`
	JobDescription    string          `db:"job_description" json:"job_description"`
	JobRequirements   modeltypes.JSON `db:"job_requirements" json:"job_requirements"`
	JobEligibility    modeltypes.JSON `db:"job_eligibility_criteria" json:"job_eligibility_criteria"`
	JobSalaryMin      *int            `db:"job_salary_min" json:"job_salary_min"`
	JobWorkMode       *string         `db:"job_work_mode" json:"job_work_mode"`
	IsActive          bool            `db:"is_active" json:"is_active"`
	OpenedAt          *time.Time      `db:"opened_at" json:"opened_at"`
	ClosedAt          *time.Time      `db:"closed_at" json:"closed_at"`
	CreatedAt         *time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt         *time.Time      `db:"updated_at" json:"updated_at"`
}
