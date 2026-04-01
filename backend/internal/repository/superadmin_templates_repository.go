package db

import (
	"database/sql"
	"errors"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type LetterTemplateCreateInput struct {
	Name            string
	FilePath        string
	FileName        string
	TemplateContent string
	HeaderText      string
	FooterText      string
	LogoPath        *string
	CreatedBy       int64
	Now             time.Time
}

type LetterTemplateUpdateInput struct {
	ID              int64
	Name            string
	FilePath        string
	FileName        string
	TemplateContent string
	HeaderText      string
	FooterText      string
	LogoPath        *string
	UpdatedAt       time.Time
}

func ListLetterTemplates(db *sqlx.DB) ([]models.LetterTemplate, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.LetterTemplate{}
	err := db.Select(&rows, "SELECT * FROM letter_templates ORDER BY created_at DESC")
	return rows, wrapRepoErr("list letter templates", err)
}

func CountLetterTemplates(db *sqlx.DB) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM letter_templates")
	return count, wrapRepoErr("count letter templates", err)
}

func ListLetterTemplatesPaged(db *sqlx.DB, limit, offset int) ([]models.LetterTemplate, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}
	rows := []models.LetterTemplate{}
	err := db.Select(&rows, "SELECT * FROM letter_templates ORDER BY created_at DESC LIMIT ? OFFSET ?", limit, offset)
	return rows, wrapRepoErr("list letter templates paged", err)
}

func CreateLetterTemplate(db *sqlx.DB, input LetterTemplateCreateInput) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if input.Now.IsZero() {
		input.Now = time.Now()
	}
	_, err := db.Exec(`INSERT INTO letter_templates (name, file_path, file_name, template_content, header_text, footer_text, logo_path, is_active, created_by, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
		input.Name,
		input.FilePath,
		input.FileName,
		input.TemplateContent,
		input.HeaderText,
		input.FooterText,
		input.LogoPath,
		input.CreatedBy,
		input.Now,
		input.Now,
	)
	return wrapRepoErr("create letter template", err)
}

func DeactivateOtherLetterTemplatesByPath(db *sqlx.DB, activeFilePath string) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("UPDATE letter_templates SET is_active = 0 WHERE file_path != ?", activeFilePath)
	return wrapRepoErr("deactivate other letter templates", err)
}

func GetLetterTemplateIsActive(db *sqlx.DB, id int64) (bool, error) {
	if db == nil {
		return false, errors.New("database tidak tersedia")
	}
	var active bool
	err := db.Get(&active, "SELECT is_active FROM letter_templates WHERE id = ?", id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, wrapRepoErr("get letter template is_active", err)
	}
	return active, nil
}

func DeactivateAllLetterTemplates(db *sqlx.DB) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("UPDATE letter_templates SET is_active = 0")
	return wrapRepoErr("deactivate all letter templates", err)
}

func SetLetterTemplateActive(db *sqlx.DB, id int64, active bool) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("UPDATE letter_templates SET is_active = ? WHERE id = ?", active, id)
	return wrapRepoErr("set letter template active", err)
}

func GetLetterTemplateByID(db *sqlx.DB, id int64) (*models.LetterTemplate, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var row models.LetterTemplate
	if err := db.Get(&row, "SELECT * FROM letter_templates WHERE id = ?", id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("get letter template by id", err)
	}
	return &row, nil
}

func GetActiveLetterTemplate(db *sqlx.DB) (*models.LetterTemplate, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var row models.LetterTemplate
	if err := db.Get(&row, "SELECT * FROM letter_templates WHERE is_active = 1 LIMIT 1"); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("get active letter template", err)
	}
	return &row, nil
}

func UpdateLetterTemplate(db *sqlx.DB, input LetterTemplateUpdateInput) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if input.UpdatedAt.IsZero() {
		input.UpdatedAt = time.Now()
	}
	_, err := db.Exec(`UPDATE letter_templates SET name=?, file_path=?, file_name=?, template_content=?, header_text=?, footer_text=?, logo_path=?, updated_at=? WHERE id = ?`,
		input.Name,
		input.FilePath,
		input.FileName,
		input.TemplateContent,
		input.HeaderText,
		input.FooterText,
		input.LogoPath,
		input.UpdatedAt,
		input.ID,
	)
	return wrapRepoErr("update letter template", err)
}

func DeleteLetterTemplateByID(db *sqlx.DB, id int64) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("DELETE FROM letter_templates WHERE id = ?", id)
	return wrapRepoErr("delete letter template by id", err)
}

func CreateAndActivateLetterTemplate(db *sqlx.DB, input LetterTemplateCreateInput) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if input.Now.IsZero() {
		input.Now = time.Now()
	}

	tx, err := db.Beginx()
	if err != nil {
		return wrapRepoErr("begin create and activate template tx", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(
		`INSERT INTO letter_templates (name, file_path, file_name, template_content, header_text, footer_text, logo_path, is_active, created_by, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
		input.Name,
		input.FilePath,
		input.FileName,
		input.TemplateContent,
		input.HeaderText,
		input.FooterText,
		input.LogoPath,
		input.CreatedBy,
		input.Now,
		input.Now,
	); err != nil {
		return wrapRepoErr("insert active letter template", err)
	}

	if _, err := tx.Exec(
		"UPDATE letter_templates SET is_active = 0 WHERE file_path != ?",
		input.FilePath,
	); err != nil {
		return wrapRepoErr("deactivate previous letter templates", err)
	}

	if err := tx.Commit(); err != nil {
		return wrapRepoErr("commit create and activate template tx", err)
	}
	return nil
}
