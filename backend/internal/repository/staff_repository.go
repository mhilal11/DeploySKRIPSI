package db

import (
	"errors"
	"strings"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type StaffComplaintCreateInput struct {
	ComplaintCode  string
	UserID         int64
	Category       string
	Subject        string
	Description    string
	Status         string
	Priority       string
	IsAnonymous    bool
	AttachmentPath *string
	AttachmentName *string
	AttachmentMime *string
	AttachmentSize *int64
	Attachments    []ComplaintAttachmentCreateInput
	SubmittedAt    time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type ComplaintAttachmentCreateInput struct {
	FilePath  string
	FileName  string
	FileMime  string
	FileSize  int64
	SortOrder int
	CreatedAt time.Time
	UpdatedAt time.Time
}

type StaffTerminationCreateInput struct {
	Reference     string
	UserID        int64
	RequestedBy   int64
	EmployeeCode  *string
	EmployeeName  string
	Division      *string
	Position      *string
	Type          string
	Reason        string
	Suggestion    string
	RequestDate   time.Time
	EffectiveDate string
	Status        string
	Progress      int
	ChecklistJSON string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func CountComplaintsByUserID(db *sqlx.DB, userID int64) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM complaints WHERE user_id = ?", userID)
	return count, wrapRepoErr("count complaints by user id", err)
}

func CountComplaintsByUserIDAndStatuses(db *sqlx.DB, userID int64, statuses ...string) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	if len(statuses) == 0 {
		return 0, nil
	}
	placeholders := strings.Repeat("?,", len(statuses))
	placeholders = strings.TrimSuffix(placeholders, ",")
	query := "SELECT COUNT(*) FROM complaints WHERE user_id = ? AND status IN (" + placeholders + ")"
	args := make([]any, 0, len(statuses)+1)
	args = append(args, userID)
	for _, status := range statuses {
		args = append(args, status)
	}
	var count int
	err := db.Get(&count, query, args...)
	return count, wrapRepoErr("count complaints by user id and statuses", err)
}

func CountDivisionIncomingRegulations(db *sqlx.DB, division string, since *time.Time) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	if since != nil {
		err := db.Get(&count, `SELECT COUNT(*) FROM surat WHERE tipe_surat = 'masuk' AND target_division = ? AND kategori IN ('Internal','Kebijakan','Operasional') AND tanggal_surat >= ?`, division, *since)
		return count, wrapRepoErr("count division incoming regulations with since", err)
	}
	err := db.Get(&count, `SELECT COUNT(*) FROM surat WHERE tipe_surat = 'masuk' AND target_division = ? AND kategori IN ('Internal','Kebijakan','Operasional')`, division)
	return count, wrapRepoErr("count division incoming regulations", err)
}

func CountStaffTerminationsByUserID(db *sqlx.DB, userID int64) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM staff_terminations WHERE user_id = ?", userID)
	return count, wrapRepoErr("count staff terminations by user id", err)
}

func ListComplaintsByUserID(db *sqlx.DB, userID int64, limit int) ([]models.Complaint, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.Complaint{}
	if limit > 0 {
		err := db.Select(&rows, "SELECT * FROM complaints WHERE user_id = ? ORDER BY submitted_at DESC, id DESC LIMIT ?", userID, limit)
		return rows, wrapRepoErr("list complaints by user id with limit", err)
	}
	err := db.Select(&rows, "SELECT * FROM complaints WHERE user_id = ? ORDER BY submitted_at DESC, id DESC", userID)
	return rows, wrapRepoErr("list complaints by user id", err)
}

func ListComplaintsByUserIDPaged(db *sqlx.DB, userID int64, limit, offset int) ([]models.Complaint, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	rows := []models.Complaint{}
	err := db.Select(&rows, "SELECT * FROM complaints WHERE user_id = ? ORDER BY submitted_at DESC, id DESC LIMIT ? OFFSET ?", userID, limit, offset)
	return rows, wrapRepoErr("list complaints by user id paged", err)
}

func ListStaffTerminationsByUserID(db *sqlx.DB, userID int64) ([]models.StaffTermination, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.StaffTermination{}
	err := db.Select(&rows, "SELECT * FROM staff_terminations WHERE user_id = ? ORDER BY created_at DESC", userID)
	return rows, wrapRepoErr("list staff terminations by user id", err)
}

func ListStaffTerminationsByUserIDPaged(db *sqlx.DB, userID int64, limit, offset int) ([]models.StaffTermination, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	rows := []models.StaffTermination{}
	err := db.Select(&rows, "SELECT * FROM staff_terminations WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?", userID, limit, offset)
	return rows, wrapRepoErr("list staff terminations by user id paged", err)
}

func ListComplaintAttachmentsByComplaintIDs(db *sqlx.DB, complaintIDs []int64) ([]models.ComplaintAttachment, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if len(complaintIDs) == 0 {
		return []models.ComplaintAttachment{}, nil
	}
	query, args, err := sqlx.In(
		"SELECT * FROM complaint_attachments WHERE complaint_id IN (?) ORDER BY complaint_id ASC, sort_order ASC, id ASC",
		complaintIDs,
	)
	if err != nil {
		return nil, wrapRepoErr("build complaint attachments query", err)
	}
	query = db.Rebind(query)

	rows := []models.ComplaintAttachment{}
	if err := db.Select(&rows, query, args...); err != nil {
		return nil, wrapRepoErr("list complaint attachments by complaint ids", err)
	}
	return rows, nil
}

func ListDivisionIncomingRegulations(db *sqlx.DB, division string, limit int) ([]models.Surat, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.Surat{}
	if limit > 0 {
		err := db.Select(&rows, `SELECT * FROM surat WHERE tipe_surat = 'masuk' AND target_division = ? AND kategori IN ('Internal','Kebijakan','Operasional') ORDER BY tanggal_surat DESC, surat_id DESC LIMIT ?`, division, limit)
		return rows, wrapRepoErr("list division incoming regulations with limit", err)
	}
	err := db.Select(&rows, `SELECT * FROM surat WHERE tipe_surat = 'masuk' AND target_division = ? AND kategori IN ('Internal','Kebijakan','Operasional') ORDER BY tanggal_surat DESC, surat_id DESC`, division)
	return rows, wrapRepoErr("list division incoming regulations", err)
}

func ListDivisionAnnouncements(db *sqlx.DB, division string, limit int) ([]models.Surat, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 5
	}
	rows := []models.Surat{}
	err := db.Select(&rows, `SELECT * FROM surat WHERE tipe_surat = 'masuk' AND target_division = ? AND (kategori = 'Internal' OR jenis_surat = 'Pengumuman') ORDER BY tanggal_surat DESC, surat_id DESC LIMIT ?`, division, limit)
	return rows, wrapRepoErr("list division announcements", err)
}

func InsertStaffComplaint(db *sqlx.DB, input StaffComplaintCreateInput) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if input.SubmittedAt.IsZero() {
		input.SubmittedAt = time.Now().UTC()
	}
	if input.CreatedAt.IsZero() {
		input.CreatedAt = input.SubmittedAt
	}
	if input.UpdatedAt.IsZero() {
		input.UpdatedAt = input.SubmittedAt
	}
	if len(input.Attachments) > 0 {
		firstAttachment := input.Attachments[0]
		if input.AttachmentPath == nil && strings.TrimSpace(firstAttachment.FilePath) != "" {
			input.AttachmentPath = &firstAttachment.FilePath
		}
		if input.AttachmentName == nil && strings.TrimSpace(firstAttachment.FileName) != "" {
			input.AttachmentName = &firstAttachment.FileName
		}
		if input.AttachmentMime == nil && strings.TrimSpace(firstAttachment.FileMime) != "" {
			input.AttachmentMime = &firstAttachment.FileMime
		}
		if input.AttachmentSize == nil && firstAttachment.FileSize > 0 {
			input.AttachmentSize = &firstAttachment.FileSize
		}
	}

	tx, err := db.Beginx()
	if err != nil {
		return wrapRepoErr("begin insert staff complaint transaction", err)
	}

	result, err := tx.Exec(`INSERT INTO complaints (complaint_code, user_id, category, subject, description, status, priority, is_anonymous, attachment_path, attachment_name, attachment_mime, attachment_size, submitted_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		input.ComplaintCode,
		input.UserID,
		input.Category,
		input.Subject,
		input.Description,
		input.Status,
		input.Priority,
		input.IsAnonymous,
		input.AttachmentPath,
		input.AttachmentName,
		input.AttachmentMime,
		input.AttachmentSize,
		input.SubmittedAt,
		input.CreatedAt,
		input.UpdatedAt,
	)
	if err != nil {
		_ = tx.Rollback()
		return wrapRepoErr("insert staff complaint", err)
	}

	complaintID, err := result.LastInsertId()
	if err != nil {
		_ = tx.Rollback()
		return wrapRepoErr("resolve inserted complaint id", err)
	}

	for index, attachment := range input.Attachments {
		if attachment.CreatedAt.IsZero() {
			attachment.CreatedAt = input.CreatedAt
		}
		if attachment.UpdatedAt.IsZero() {
			attachment.UpdatedAt = input.UpdatedAt
		}
		if attachment.SortOrder <= 0 {
			attachment.SortOrder = index + 1
		}
		if err := insertComplaintAttachmentTx(tx, complaintID, attachment); err != nil {
			_ = tx.Rollback()
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return wrapRepoErr("commit insert staff complaint", err)
	}
	return nil
}

func insertComplaintAttachmentTx(tx *sqlx.Tx, complaintID int64, input ComplaintAttachmentCreateInput) error {
	if tx == nil {
		return errors.New("transaction tidak tersedia")
	}
	_, err := tx.Exec(
		`INSERT INTO complaint_attachments (complaint_id, file_path, file_name, file_mime, file_size, sort_order, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		complaintID,
		input.FilePath,
		input.FileName,
		input.FileMime,
		input.FileSize,
		input.SortOrder,
		input.CreatedAt,
		input.UpdatedAt,
	)
	return wrapRepoErr("insert complaint attachment", err)
}

func InsertStaffTermination(db *sqlx.DB, input StaffTerminationCreateInput) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if input.Type == "" {
		input.Type = "Resign"
	}
	if input.Status == "" {
		input.Status = "Diajukan"
	}
	if input.ChecklistJSON == "" {
		input.ChecklistJSON = "{}"
	}
	if input.RequestDate.IsZero() {
		input.RequestDate = time.Now().UTC()
	}
	if input.CreatedAt.IsZero() {
		input.CreatedAt = input.RequestDate
	}
	if input.UpdatedAt.IsZero() {
		input.UpdatedAt = input.RequestDate
	}
	_, err := db.Exec(`INSERT INTO staff_terminations (reference, user_id, requested_by, employee_code, employee_name, division, position, type, reason, suggestion, request_date, effective_date, status, progress, checklist, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		input.Reference,
		input.UserID,
		input.RequestedBy,
		input.EmployeeCode,
		input.EmployeeName,
		input.Division,
		input.Position,
		input.Type,
		input.Reason,
		input.Suggestion,
		input.RequestDate.Format("2006-01-02"),
		input.EffectiveDate,
		input.Status,
		input.Progress,
		input.ChecklistJSON,
		input.CreatedAt,
		input.UpdatedAt,
	)
	return wrapRepoErr("insert staff termination", err)
}
