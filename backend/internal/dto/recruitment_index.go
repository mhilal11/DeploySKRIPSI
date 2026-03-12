package dto

type RecruitmentSLAOverview struct {
	ActiveApplications int     `json:"active_applications"`
	OnTrackCount       int     `json:"on_track_count"`
	WarningCount       int     `json:"warning_count"`
	OverdueCount       int     `json:"overdue_count"`
	ComplianceRate     float64 `json:"compliance_rate"`
}

type RecruitmentSLAIndicator struct {
	Stage         string `json:"stage"`
	TargetDays    int    `json:"target_days"`
	DaysInStage   int    `json:"days_in_stage"`
	DueDate       string `json:"due_date"`
	RemainingDays int    `json:"remaining_days"`
	OverdueDays   int    `json:"overdue_days"`
	State         string `json:"state"`
	IsOverdue     bool   `json:"is_overdue"`
}

type RecruitmentSLAReminder struct {
	ApplicationID int64   `json:"application_id"`
	Name          string  `json:"name"`
	Position      string  `json:"position"`
	Division      *string `json:"division"`
	Stage         string  `json:"stage"`
	DaysInStage   int     `json:"days_in_stage"`
	TargetDays    int     `json:"target_days"`
	DueDate       string  `json:"due_date"`
	RemainingDays int     `json:"remaining_days"`
	OverdueDays   int     `json:"overdue_days"`
	State         string  `json:"state"`
}

type RecruitmentApplication struct {
	ID                   int64                    `json:"id"`
	Name                 string                   `json:"name"`
	Division             *string                  `json:"division"`
	Position             string                   `json:"position"`
	Education            string                   `json:"education"`
	Experience           string                   `json:"experience"`
	ProfileName          string                   `json:"profile_name"`
	ProfileEmail         string                   `json:"profile_email"`
	ProfilePhone         *string                  `json:"profile_phone"`
	ProfileAddress       *string                  `json:"profile_address"`
	ProfileCity          *string                  `json:"profile_city"`
	ProfileProvince      *string                  `json:"profile_province"`
	ProfileGender        *string                  `json:"profile_gender"`
	ProfileReligion      *string                  `json:"profile_religion"`
	ProfileDateOfBirth   string                   `json:"profile_date_of_birth"`
	Educations           []map[string]any         `json:"educations"`
	Experiences          []map[string]any         `json:"experiences"`
	Certifications       []map[string]any         `json:"certifications"`
	InterviewDate        string                   `json:"interview_date"`
	InterviewTime        *string                  `json:"interview_time"`
	InterviewMode        *string                  `json:"interview_mode"`
	InterviewerName      *string                  `json:"interviewer_name"`
	MeetingLink          *string                  `json:"meeting_link"`
	InterviewNotes       *string                  `json:"interview_notes"`
	InterviewEndTime     *string                  `json:"interview_end_time"`
	HasInterviewSchedule bool                     `json:"has_interview_schedule"`
	Status               string                   `json:"status"`
	Date                 string                   `json:"date"`
	SubmittedDate        string                   `json:"submitted_date"`
	Email                string                   `json:"email"`
	Phone                *string                  `json:"phone"`
	Skills               *string                  `json:"skills"`
	CVFile               *string                  `json:"cv_file"`
	CVURL                *string                  `json:"cv_url"`
	ProfilePhotoURL      *string                  `json:"profile_photo_url"`
	RejectionReason      *string                  `json:"rejection_reason"`
	RecruitmentScore     any                      `json:"recruitment_score"`
	AIScreening          map[string]any           `json:"ai_screening"`
	SLA                  *RecruitmentSLAIndicator `json:"sla"`
}

type RecruitmentInterview struct {
	ApplicationID int64   `json:"application_id"`
	Candidate     string  `json:"candidate"`
	Position      string  `json:"position"`
	Date          string  `json:"date"`
	DateValue     string  `json:"date_value"`
	Time          string  `json:"time"`
	EndTime       *string `json:"end_time"`
	Mode          string  `json:"mode"`
	Interviewer   string  `json:"interviewer"`
	MeetingLink   *string `json:"meeting_link"`
	Status        string  `json:"status"`
}

type RecruitmentOnboardingStep struct {
	Label    string `json:"label"`
	Complete bool   `json:"complete"`
	Pending  bool   `json:"pending,omitempty"`
}

type RecruitmentOnboarding struct {
	ApplicationID int64                       `json:"application_id"`
	Name          string                      `json:"name"`
	Position      string                      `json:"position"`
	StartedAt     string                      `json:"startedAt"`
	Status        string                      `json:"status"`
	IsStaff       bool                        `json:"is_staff"`
	Steps         []RecruitmentOnboardingStep `json:"steps"`
}

type RecruitmentIndexResponse struct {
	Applications         []RecruitmentApplication `json:"applications"`
	Pagination           map[string]any           `json:"pagination"`
	StatusOptions        []string                 `json:"statusOptions"`
	Interviews           []RecruitmentInterview   `json:"interviews"`
	Onboarding           []RecruitmentOnboarding  `json:"onboarding"`
	SLASettings          map[string]int           `json:"slaSettings"`
	SLAOverview          RecruitmentSLAOverview   `json:"slaOverview"`
	SLAReminders         []RecruitmentSLAReminder `json:"slaReminders"`
	ScoringAudits        []map[string]any         `json:"scoringAudits"`
	SidebarNotifications map[string]int           `json:"sidebarNotifications"`
}
