package db

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type ComplaintListFilters struct {
	Search   string
	Status   string
	Priority string
	Category string
}

type ComplaintUpdateInput struct {
	ID              int64
	Status          string
	Priority        string
	ResolutionNotes string
	HandledByID     int64
	ResolvedAt      *time.Time
}

func ListComplaintsByFilters(db *sqlx.DB, filters ComplaintListFilters) ([]models.Complaint, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	query := "SELECT * FROM complaints"
	clauses := []string{}
	args := []any{}

	if strings.TrimSpace(filters.Search) != "" {
		like := "%" + strings.TrimSpace(filters.Search) + "%"
		clauses = append(clauses, "(complaint_code LIKE ? OR subject LIKE ? OR description LIKE ?)")
		args = append(args, like, like, like)
	}

	status := strings.ToLower(strings.TrimSpace(filters.Status))
	if status != "" && status != "all" {
		switch status {
		case "new":
			clauses = append(clauses, "LOWER(status) IN ('new','baru','open')")
		case "in_progress":
			clauses = append(clauses, "LOWER(status) IN ('in_progress','onprogress','inprogress','processing','proses','diproses')")
		case "resolved":
			clauses = append(clauses, "LOWER(status) IN ('resolved','selesai','closed','done')")
		case "archived":
			clauses = append(clauses, "LOWER(status) IN ('archived','diarsipkan','archive')")
		}
	}

	priority := strings.ToLower(strings.TrimSpace(filters.Priority))
	if priority != "" && priority != "all" {
		switch priority {
		case "high":
			clauses = append(clauses, "LOWER(priority) IN ('high','tinggi')")
		case "medium":
			clauses = append(clauses, "LOWER(priority) IN ('medium','sedang','normal')")
		case "low":
			clauses = append(clauses, "LOWER(priority) IN ('low','rendah')")
		}
	}

	if strings.TrimSpace(filters.Category) != "" && !strings.EqualFold(strings.TrimSpace(filters.Category), "all") {
		clauses = append(clauses, "category = ?")
		args = append(args, strings.TrimSpace(filters.Category))
	}

	if len(clauses) > 0 {
		query += " WHERE " + strings.Join(clauses, " AND ")
	}
	query += " ORDER BY submitted_at DESC"

	rows := []models.Complaint{}
	err := db.Select(&rows, query, args...)
	return rows, err
}

func GetComplaintByID(db *sqlx.DB, id int64) (*models.Complaint, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var complaint models.Complaint
	if err := db.Get(&complaint, "SELECT * FROM complaints WHERE id = ?", id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &complaint, nil
}

func UpdateComplaint(db *sqlx.DB, input ComplaintUpdateInput) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	var resolvedAt any
	if input.ResolvedAt != nil {
		resolvedAt = *input.ResolvedAt
	}
	_, err := db.Exec(`UPDATE complaints SET status = ?, priority = ?, resolution_notes = ?, handled_by_id = ?, resolved_at = ? WHERE id = ?`,
		input.Status, input.Priority, input.ResolutionNotes, input.HandledByID, resolvedAt, input.ID)
	return err
}
