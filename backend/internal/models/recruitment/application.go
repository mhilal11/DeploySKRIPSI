package recruitmentmodel

import "time"

type Application struct {
	ID               int64      `db:"id" json:"id"`
	UserID           *int64     `db:"user_id" json:"user_id"`
	FullName         string     `db:"full_name" json:"full_name"`
	Email            string     `db:"email" json:"email"`
	Phone            *string    `db:"phone" json:"phone"`
	Position         string     `db:"position" json:"position"`
	Division         *string    `db:"division" json:"division"`
	Education        *string    `db:"education" json:"education"`
	Experience       *string    `db:"experience" json:"experience"`
	Skills           *string    `db:"skills" json:"skills"`
	CvFile           *string    `db:"cv_file" json:"cv_file"`
	Status           string     `db:"status" json:"status"`
	RejectionReason  *string    `db:"rejection_reason" json:"rejection_reason"`
	Notes            *string    `db:"notes" json:"notes"`
	SubmittedAt      *time.Time `db:"submitted_at" json:"submitted_at"`
	CreatedAt        *time.Time `db:"created_at" json:"created_at"`
	UpdatedAt        *time.Time `db:"updated_at" json:"updated_at"`
	InterviewDate    *time.Time `db:"interview_date" json:"interview_date"`
	InterviewTime    *string    `db:"interview_time" json:"interview_time"`
	InterviewEndTime *string    `db:"interview_end_time" json:"interview_end_time"`
	InterviewMode    *string    `db:"interview_mode" json:"interview_mode"`
	InterviewerName  *string    `db:"interviewer_name" json:"interviewer_name"`
	MeetingLink      *string    `db:"meeting_link" json:"meeting_link"`
	InterviewNotes   *string    `db:"interview_notes" json:"interview_notes"`
	ScreeningAt      *time.Time `db:"screening_at" json:"screening_at"`
	InterviewAt      *time.Time `db:"interview_at" json:"interview_at"`
	OfferingAt       *time.Time `db:"offering_at" json:"offering_at"`
	HiredAt          *time.Time `db:"hired_at" json:"hired_at"`
	RejectedAt       *time.Time `db:"rejected_at" json:"rejected_at"`
}

var ApplicationStatuses = []string{"Applied", "Screening", "Interview", "Offering", "Hired", "Rejected"}
