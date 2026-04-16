package complaintmodel

import "time"

type Complaint struct {
	ID              int64      `db:"id" json:"id"`
	ComplaintCode   string     `db:"complaint_code" json:"complaint_code"`
	UserID          int64      `db:"user_id" json:"user_id"`
	HandledByID     *int64     `db:"handled_by_id" json:"handled_by_id"`
	Category        string     `db:"category" json:"category"`
	Subject         string     `db:"subject" json:"subject"`
	Description     string     `db:"description" json:"description"`
	Status          string     `db:"status" json:"status"`
	Priority        string     `db:"priority" json:"priority"`
	IsAnonymous     bool       `db:"is_anonymous" json:"is_anonymous"`
	AttachmentPath  *string    `db:"attachment_path" json:"attachment_path"`
	AttachmentName  *string    `db:"attachment_name" json:"attachment_name"`
	AttachmentMime  *string    `db:"attachment_mime" json:"attachment_mime"`
	AttachmentSize  *int64     `db:"attachment_size" json:"attachment_size"`
	SubmittedAt     *time.Time `db:"submitted_at" json:"submitted_at"`
	ResolvedAt      *time.Time `db:"resolved_at" json:"resolved_at"`
	ResolutionNotes *string    `db:"resolution_notes" json:"resolution_notes"`
	CreatedAt       *time.Time `db:"created_at" json:"created_at"`
	UpdatedAt       *time.Time `db:"updated_at" json:"updated_at"`
}

type ComplaintAttachment struct {
	ID          int64      `db:"id" json:"id"`
	ComplaintID int64      `db:"complaint_id" json:"complaint_id"`
	FilePath    string     `db:"file_path" json:"file_path"`
	FileName    string     `db:"file_name" json:"file_name"`
	FileMime    string     `db:"file_mime" json:"file_mime"`
	FileSize    int64      `db:"file_size" json:"file_size"`
	SortOrder   int        `db:"sort_order" json:"sort_order"`
	CreatedAt   *time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   *time.Time `db:"updated_at" json:"updated_at"`
}

const (
	ComplaintStatusNew        = "new"
	ComplaintStatusInProgress = "in_progress"
	ComplaintStatusResolved   = "resolved"
	ComplaintStatusArchived   = "archived"
)

var ComplaintStatusLabels = map[string]string{
	ComplaintStatusNew:        "Baru",
	ComplaintStatusInProgress: "OnProgress",
	ComplaintStatusResolved:   "Selesai",
	ComplaintStatusArchived:   "Diarsipkan",
}

const (
	ComplaintPriorityHigh   = "high"
	ComplaintPriorityMedium = "medium"
	ComplaintPriorityLow    = "low"
)

var ComplaintPriorityLabels = map[string]string{
	ComplaintPriorityHigh:   "Tinggi",
	ComplaintPriorityMedium: "Sedang",
	ComplaintPriorityLow:    "Rendah",
}
