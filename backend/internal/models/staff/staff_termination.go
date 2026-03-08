package staffmodel

import (
	modeltypes "hris-backend/internal/models/types"
	"time"
)

type StaffTermination struct {
	ID              int64           `db:"id" json:"id"`
	Reference       string          `db:"reference" json:"reference"`
	UserID          *int64          `db:"user_id" json:"user_id"`
	RequestedBy     *int64          `db:"requested_by" json:"requested_by"`
	EmployeeCode    *string         `db:"employee_code" json:"employee_code"`
	EmployeeName    string          `db:"employee_name" json:"employee_name"`
	Division        *string         `db:"division" json:"division"`
	Position        *string         `db:"position" json:"position"`
	Type            string          `db:"type" json:"type"`
	Reason          *string         `db:"reason" json:"reason"`
	Suggestion      *string         `db:"suggestion" json:"suggestion"`
	RequestDate     *time.Time      `db:"request_date" json:"request_date"`
	EffectiveDate   *time.Time      `db:"effective_date" json:"effective_date"`
	Status          string          `db:"status" json:"status"`
	Progress        int             `db:"progress" json:"progress"`
	Checklist       modeltypes.JSON `db:"checklist" json:"checklist"`
	ExitInterviewAt *time.Time      `db:"exit_interview_at" json:"exit_interview_at"`
	Notes           *string         `db:"notes" json:"notes"`
	CreatedAt       *time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt       *time.Time      `db:"updated_at" json:"updated_at"`
}
