package db

import (
	"errors"
	"strings"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type SuratListFilters struct {
	Search   string
	Category string
}

type SuperAdminLetterCreateInput struct {
	UserID            int64
	DepartemenID      *int64
	NomorSurat        string
	JenisSurat        string
	TanggalSurat      string
	Perihal           string
	IsiSurat          string
	Kategori          string
	Prioritas         string
	Penerima          string
	TargetDivision    string
	PreviousDivision  *string
	CurrentRecipient  string
	DisposedBy        int64
	DisposedAt        time.Time
	DispositionNote   string
	LampiranPath      *string
	LampiranNama      *string
	LampiranMime      *string
	LampiranSize      *int64
	CreatedAt         time.Time
	UpdatedAt         time.Time
	StatusPersetujuan string
}

type SuratListStats struct {
	Inbox    int `db:"inbox_count"`
	Outbox   int `db:"outbox_count"`
	Pending  int `db:"pending_count"`
	Archived int `db:"archived_count"`
}

func ListSuratByFilters(db *sqlx.DB, filters SuratListFilters) ([]models.Surat, error) {
	return ListSuratByFiltersPaged(db, filters, 500, 0)
}

func CountSuratByFilters(db *sqlx.DB, filters SuratListFilters) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	baseQuery, args := buildSuratFilterQuery(filters)
	var total int
	if err := db.Get(&total, "SELECT COUNT(*) FROM surat"+baseQuery, args...); err != nil {
		return 0, wrapRepoErr("count surat by filters", err)
	}
	return total, nil
}

func ListSuratByFiltersPaged(db *sqlx.DB, filters SuratListFilters, limit, offset int) ([]models.Surat, error) {
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

	baseQuery, args := buildSuratFilterQuery(filters)
	query := "SELECT * FROM surat" + baseQuery + " ORDER BY tanggal_surat DESC, surat_id DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)
	rows := []models.Surat{}
	err := db.Select(&rows, query, args...)
	return rows, wrapRepoErr("list surat by filters paged", err)
}

func CountSuratStatsByFilters(db *sqlx.DB, filters SuratListFilters) (SuratListStats, error) {
	if db == nil {
		return SuratListStats{}, errors.New("database tidak tersedia")
	}
	baseQuery, args := buildSuratFilterQuery(filters)
	query := `
		SELECT
			COALESCE(SUM(CASE WHEN status_persetujuan = 'Diarsipkan' THEN 1 ELSE 0 END), 0) AS archived_count,
			COALESCE(SUM(CASE WHEN status_persetujuan <> 'Diarsipkan' AND current_recipient = 'hr' THEN 1 ELSE 0 END), 0) AS inbox_count,
			COALESCE(SUM(CASE WHEN status_persetujuan <> 'Diarsipkan' AND current_recipient = 'division' THEN 1 ELSE 0 END), 0) AS outbox_count,
			COALESCE(SUM(CASE WHEN status_persetujuan <> 'Diarsipkan' AND current_recipient = 'hr' AND status_persetujuan IN ('Menunggu HR', 'Diajukan', 'Diproses') THEN 1 ELSE 0 END), 0) AS pending_count
		FROM surat` + baseQuery
	var stats SuratListStats
	if err := db.Get(&stats, query, args...); err != nil {
		return SuratListStats{}, wrapRepoErr("count surat stats by filters", err)
	}
	return stats, nil
}

func buildSuratFilterQuery(filters SuratListFilters) (string, []any) {
	clauses := make([]string, 0, 2)
	args := make([]any, 0, 4)
	if strings.TrimSpace(filters.Search) != "" {
		like := "%" + strings.TrimSpace(filters.Search) + "%"
		clauses = append(clauses, "(nomor_surat LIKE ? OR perihal LIKE ? OR penerima LIKE ?)")
		args = append(args, like, like, like)
	}
	if strings.TrimSpace(filters.Category) != "" && !strings.EqualFold(strings.TrimSpace(filters.Category), "all") {
		clauses = append(clauses, "kategori = ?")
		args = append(args, strings.TrimSpace(filters.Category))
	}
	if len(clauses) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

func InsertSuperAdminLetter(db *sqlx.DB, input SuperAdminLetterCreateInput) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if input.DisposedAt.IsZero() {
		input.DisposedAt = time.Now()
	}
	if input.CreatedAt.IsZero() {
		input.CreatedAt = input.DisposedAt
	}
	if input.UpdatedAt.IsZero() {
		input.UpdatedAt = input.DisposedAt
	}
	status := input.StatusPersetujuan
	if strings.TrimSpace(status) == "" {
		status = "Didisposisi"
	}
	currentRecipient := strings.TrimSpace(input.CurrentRecipient)
	if currentRecipient == "" {
		currentRecipient = input.TargetDivision
	}
	_, err := db.Exec(`INSERT INTO surat (user_id, departemen_id, nomor_surat, tipe_surat, jenis_surat, tanggal_surat, perihal, isi_surat, status_persetujuan, kategori, prioritas, penerima, target_division, previous_division, current_recipient, disposed_by, disposed_at, disposition_note, lampiran_path, lampiran_nama, lampiran_mime, lampiran_size, created_at, updated_at)
		VALUES (?, ?, ?, 'keluar', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		input.UserID,
		input.DepartemenID,
		input.NomorSurat,
		input.JenisSurat,
		input.TanggalSurat,
		input.Perihal,
		input.IsiSurat,
		status,
		input.Kategori,
		input.Prioritas,
		input.Penerima,
		input.TargetDivision,
		input.PreviousDivision,
		currentRecipient,
		input.DisposedBy,
		input.DisposedAt,
		input.DispositionNote,
		input.LampiranPath,
		input.LampiranNama,
		input.LampiranMime,
		input.LampiranSize,
		input.CreatedAt,
		input.UpdatedAt,
	)
	return wrapRepoErr("insert super admin letter", err)
}

func UpdateSuratDispositionToDivision(db *sqlx.DB, suratID int64, penerima string, note string, disposedBy int64, now time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if now.IsZero() {
		now = time.Now()
	}
	_, err := db.Exec(`UPDATE surat SET current_recipient='division', penerima=?, status_persetujuan='Didisposisi', disposition_note=?, disposed_by=?, disposed_at=?, updated_at=? WHERE surat_id=?`,
		penerima, note, disposedBy, now, now, suratID)
	return wrapRepoErr("update surat disposition to division", err)
}

func BulkDispositionLetters(db *sqlx.DB, ids []int64, note string, disposedBy int64, now time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if now.IsZero() {
		now = time.Now()
	}
	for _, id := range ids {
		if id <= 0 {
			continue
		}
		if _, err := db.Exec(`UPDATE surat SET current_recipient='division', penerima=COALESCE(target_division,penerima), status_persetujuan='Didisposisi', disposition_note=?, disposed_by=?, disposed_at=?, updated_at=? WHERE surat_id=?`,
			note, disposedBy, now, now, id); err != nil {
			return wrapRepoErr("bulk disposition letters update", err)
		}
	}
	return nil
}

func UpdateSuratRejectedToOrigin(db *sqlx.DB, suratID int64, originDivision, note string, disposedBy int64, now time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if now.IsZero() {
		now = time.Now()
	}
	_, err := db.Exec(`UPDATE surat SET current_recipient='division', penerima=?, target_division=?, status_persetujuan='Ditolak HR', disposition_note=?, disposed_by=?, disposed_at=?, updated_at=? WHERE surat_id=?`,
		originDivision, originDivision, note, disposedBy, now, now, suratID)
	return wrapRepoErr("update surat rejected to origin", err)
}

func UpdateSuratFinalDisposition(db *sqlx.DB, suratID int64, filePath, fileName *string, note *string, disposedBy int64, now time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if now.IsZero() {
		now = time.Now()
	}
	_, err := db.Exec(`UPDATE surat SET current_recipient='division', penerima=COALESCE(target_division,penerima), status_persetujuan='Didisposisi', is_finalized=1, disposition_document_path=?, disposition_document_name=?, disposition_note=?, disposed_by=?, disposed_at=?, updated_at=? WHERE surat_id=?`,
		filePath, fileName, note, disposedBy, now, now, suratID)
	return wrapRepoErr("update surat final disposition", err)
}

func ArchiveSurat(db *sqlx.DB, suratID int64) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec(`UPDATE surat SET status_persetujuan='Diarsipkan', current_recipient='archive' WHERE surat_id = ?`, suratID)
	return wrapRepoErr("archive surat", err)
}

func UnarchiveSurat(db *sqlx.DB, suratID int64) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec(`UPDATE surat SET status_persetujuan='Didisposisi', current_recipient='division' WHERE surat_id = ?`, suratID)
	return wrapRepoErr("unarchive surat", err)
}
