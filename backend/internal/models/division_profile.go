package models

import "time"

type DivisionProfile struct {
	ID              int64      `db:"id" json:"id"`
	Name            string     `db:"name" json:"name"`
	Description     *string    `db:"description" json:"description"`
	ManagerName     *string    `db:"manager_name" json:"manager_name"`
	Capacity        int        `db:"capacity" json:"capacity"`
	IsHiring        bool       `db:"is_hiring" json:"is_hiring"`
	JobTitle        *string    `db:"job_title" json:"job_title"`
	JobDescription  *string    `db:"job_description" json:"job_description"`
	JobRequirements JSON       `db:"job_requirements" json:"job_requirements"`
	JobEligibility  JSON       `db:"job_eligibility_criteria" json:"job_eligibility_criteria"`
	HiringOpenedAt  *time.Time `db:"hiring_opened_at" json:"hiring_opened_at"`
	CreatedAt       *time.Time `db:"created_at" json:"created_at"`
	UpdatedAt       *time.Time `db:"updated_at" json:"updated_at"`
}
