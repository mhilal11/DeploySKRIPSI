package communicationmodel

import "time"

type LetterTemplate struct {
	ID              int64      `db:"id" json:"id"`
	Name            string     `db:"name" json:"name"`
	FilePath        string     `db:"file_path" json:"file_path"`
	FileName        string     `db:"file_name" json:"file_name"`
	TemplateContent *string    `db:"template_content" json:"template_content"`
	HeaderText      *string    `db:"header_text" json:"header_text"`
	FooterText      *string    `db:"footer_text" json:"footer_text"`
	LogoPath        *string    `db:"logo_path" json:"logo_path"`
	IsActive        bool       `db:"is_active" json:"is_active"`
	CreatedBy       *int64     `db:"created_by" json:"created_by"`
	CreatedAt       *time.Time `db:"created_at" json:"created_at"`
	UpdatedAt       *time.Time `db:"updated_at" json:"updated_at"`
}
