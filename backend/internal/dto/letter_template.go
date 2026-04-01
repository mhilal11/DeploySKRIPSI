package dto

type LetterTemplateListItem struct {
	ID              int64   `json:"id"`
	Name            string  `json:"name"`
	FileName        string  `json:"fileName"`
	TemplateContent *string `json:"templateContent,omitempty"`
	HeaderText      *string `json:"headerText,omitempty"`
	FooterText      *string `json:"footerText,omitempty"`
	LogoURL         *string `json:"logoUrl"`
	IsActive        bool    `json:"isActive"`
	CreatedBy       string  `json:"createdBy"`
	CreatedAt       string  `json:"createdAt"`
}
