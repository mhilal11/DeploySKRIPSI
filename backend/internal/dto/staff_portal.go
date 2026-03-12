package dto

type StaffDashboardStat struct {
	Label string `json:"label"`
	Value int    `json:"value"`
	Icon  string `json:"icon"`
}

type StaffComplaintSummary struct {
	ID       int64  `json:"id"`
	Subject  string `json:"subject"`
	Status   string `json:"status"`
	Priority string `json:"priority"`
	Date     string `json:"date"`
}

type StaffRegulationSummary struct {
	ID            int64   `json:"id"`
	Title         string  `json:"title"`
	Category      string  `json:"category,omitempty"`
	Date          string  `json:"date,omitempty"`
	UploadDate    string  `json:"uploadDate,omitempty"`
	Content       string  `json:"content,omitempty"`
	FileName      *string `json:"fileName,omitempty"`
	AttachmentURL *string `json:"attachmentUrl,omitempty"`
	FileURL       *string `json:"fileUrl,omitempty"`
}

type StaffTerminationSummary struct {
	Reference     string `json:"reference"`
	Type          string `json:"type,omitempty"`
	Status        string `json:"status"`
	Progress      int    `json:"progress,omitempty"`
	RequestDate   string `json:"requestDate"`
	EffectiveDate string `json:"effectiveDate"`
	Reason        any    `json:"reason,omitempty"`
	Suggestion    any    `json:"suggestion,omitempty"`
}

type StaffTerminationSection struct {
	Active  *StaffTerminationSummary  `json:"active"`
	History []StaffTerminationSummary `json:"history"`
}

type StaffDashboardResponse struct {
	Stats            []StaffDashboardStat     `json:"stats"`
	RecentComplaints []StaffComplaintSummary  `json:"recentComplaints"`
	Regulations      []StaffRegulationSummary `json:"regulations"`
	Termination      StaffTerminationSection  `json:"termination"`
}

type StaffResignationProfile struct {
	Name          string  `json:"name"`
	EmployeeCode  *string `json:"employeeCode"`
	Division      *string `json:"division"`
	Position      string  `json:"position"`
	JoinedAt      string  `json:"joinedAt"`
	JoinedDisplay string  `json:"joinedDisplay"`
}

type StaffResignationResponse struct {
	Profile       StaffResignationProfile   `json:"profile"`
	ActiveRequest *StaffTerminationSummary  `json:"activeRequest"`
	History       []StaffTerminationSummary `json:"history"`
	Pagination    any                       `json:"pagination,omitempty"`
}
