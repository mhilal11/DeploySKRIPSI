package dto

type StaffTermination struct {
	ID            int64           `json:"id"`
	Reference     string          `json:"reference"`
	EmployeeName  string          `json:"employeeName"`
	EmployeeCode  *string         `json:"employeeCode"`
	Division      *string         `json:"division"`
	Position      *string         `json:"position"`
	Type          string          `json:"type"`
	Reason        *string         `json:"reason"`
	Suggestion    *string         `json:"suggestion"`
	Notes         *string         `json:"notes"`
	Checklist     map[string]bool `json:"checklist"`
	Status        string          `json:"status"`
	Progress      int             `json:"progress"`
	RequestDate   string          `json:"requestDate"`
	EffectiveDate string          `json:"effectiveDate"`
}
