package db

import (
	"database/sql"
	"errors"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type AdminStaffLetterCreateInput struct {
	UserID           int64
	DepartemenID     *int64
	NomorSurat       string
	JenisSurat       string
	TanggalSurat     time.Time
	Perihal          string
	IsiSurat         string
	Kategori         string
	Prioritas        string
	Penerima         string
	TargetDivision   *string
	PreviousDivision *string
	LampiranPath     *string
	LampiranNama     *string
	LampiranMime     *string
	LampiranSize     *int64
	Now              time.Time
}

func CountDivisionInboxLetters(db *sqlx.DB, division *string) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM surat WHERE current_recipient = 'division' AND (target_division = ? OR penerima = ?)", division, division)
	return count, wrapRepoErr("count division inbox letters", err)
}

func CountUserOutboxLetters(db *sqlx.DB, userID int64) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM surat WHERE user_id = ?", userID)
	return count, wrapRepoErr("count user outbox letters", err)
}

func CountDivisionPendingLetters(db *sqlx.DB, division *string) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM surat WHERE current_recipient = 'division' AND (target_division = ? OR penerima = ?) AND status_persetujuan IN ('Menunggu HR','Diajukan','Diproses')", division, division)
	return count, wrapRepoErr("count division pending letters", err)
}

func CountDivisionArchiveLetters(db *sqlx.DB, division *string, userID int64) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(
		&count,
		"SELECT COUNT(*) FROM surat WHERE status_persetujuan = 'Diarsipkan' AND (target_division = ? OR penerima = ? OR user_id = ?)",
		division,
		division,
		userID,
	)
	return count, wrapRepoErr("count division archive letters", err)
}

func ListDivisionIncomingLetters(db *sqlx.DB, division *string, limit int) ([]models.Surat, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 5
	}
	rows := []models.Surat{}
	err := db.Select(&rows, "SELECT * FROM surat WHERE current_recipient = 'division' AND (target_division = ? OR penerima = ?) ORDER BY tanggal_surat DESC, surat_id DESC LIMIT ?", division, division, limit)
	return rows, wrapRepoErr("list division incoming letters", err)
}

func ListDivisionInboxLettersPaged(db *sqlx.DB, division *string, limit, offset int) ([]models.Surat, error) {
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
	rows := []models.Surat{}
	err := db.Select(
		&rows,
		"SELECT * FROM surat WHERE current_recipient = 'division' AND (target_division = ? OR penerima = ?) ORDER BY tanggal_surat DESC, surat_id DESC LIMIT ? OFFSET ?",
		division,
		division,
		limit,
		offset,
	)
	return rows, wrapRepoErr("list division inbox letters paged", err)
}

func ListUserOutgoingLetters(db *sqlx.DB, userID int64, limit int) ([]models.Surat, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 5
	}
	rows := []models.Surat{}
	err := db.Select(&rows, "SELECT * FROM surat WHERE user_id = ? ORDER BY tanggal_surat DESC, surat_id DESC LIMIT ?", userID, limit)
	return rows, wrapRepoErr("list user outgoing letters", err)
}

func ListUserOutgoingLettersPaged(db *sqlx.DB, userID int64, limit, offset int) ([]models.Surat, error) {
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
	rows := []models.Surat{}
	err := db.Select(
		&rows,
		"SELECT * FROM surat WHERE user_id = ? ORDER BY tanggal_surat DESC, surat_id DESC LIMIT ? OFFSET ?",
		userID,
		limit,
		offset,
	)
	return rows, wrapRepoErr("list user outgoing letters paged", err)
}

func ListUserOutgoingLettersAll(db *sqlx.DB, userID int64) ([]models.Surat, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.Surat{}
	err := db.Select(&rows, "SELECT * FROM surat WHERE user_id = ? ORDER BY tanggal_surat DESC, surat_id DESC", userID)
	return rows, wrapRepoErr("list user outgoing letters all", err)
}

func ListInternalAnnouncements(db *sqlx.DB, limit int) ([]models.Surat, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 3
	}
	rows := []models.Surat{}
	err := db.Select(&rows, "SELECT * FROM surat WHERE kategori = 'Internal' ORDER BY tanggal_surat DESC LIMIT ?", limit)
	return rows, wrapRepoErr("list internal announcements", err)
}

func ListRecentApplications(db *sqlx.DB, limit int) ([]models.Application, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 20
	}
	rows := []models.Application{}
	err := db.Select(&rows, "SELECT * FROM applications ORDER BY submitted_at DESC LIMIT ?", limit)
	return rows, wrapRepoErr("list recent applications", err)
}

func CountApplicationsByStatus(db *sqlx.DB, status string) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM applications WHERE status = ?", status)
	return count, wrapRepoErr("count applications by status", err)
}

func ListDivisionInboxLettersAll(db *sqlx.DB, division *string) ([]models.Surat, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.Surat{}
	err := db.Select(&rows, "SELECT * FROM surat WHERE current_recipient = 'division' AND (target_division = ? OR penerima = ?) ORDER BY tanggal_surat DESC, surat_id DESC", division, division)
	return rows, wrapRepoErr("list division inbox letters all", err)
}

func ListDivisionArchiveLettersAll(db *sqlx.DB, division *string, userID int64) ([]models.Surat, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.Surat{}
	err := db.Select(&rows, "SELECT * FROM surat WHERE status_persetujuan = 'Diarsipkan' AND (target_division = ? OR penerima = ? OR user_id = ?) ORDER BY tanggal_surat DESC, surat_id DESC", division, division, userID)
	return rows, wrapRepoErr("list division archive letters all", err)
}

func ListDivisionArchiveLettersPaged(db *sqlx.DB, division *string, userID int64, limit, offset int) ([]models.Surat, error) {
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
	rows := []models.Surat{}
	err := db.Select(
		&rows,
		"SELECT * FROM surat WHERE status_persetujuan = 'Diarsipkan' AND (target_division = ? OR penerima = ? OR user_id = ?) ORDER BY tanggal_surat DESC, surat_id DESC LIMIT ? OFFSET ?",
		division,
		division,
		userID,
		limit,
		offset,
	)
	return rows, wrapRepoErr("list division archive letters paged", err)
}

func InsertAdminStaffLetter(db *sqlx.DB, input AdminStaffLetterCreateInput) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if input.Now.IsZero() {
		input.Now = time.Now()
	}
	if input.TanggalSurat.IsZero() {
		input.TanggalSurat = input.Now
	}
	_, err := db.Exec(`
		INSERT INTO surat (user_id, departemen_id, nomor_surat, tipe_surat, jenis_surat, tanggal_surat, perihal, isi_surat, status_persetujuan, kategori, prioritas, penerima, target_division, previous_division, current_recipient, lampiran_path, lampiran_nama, lampiran_mime, lampiran_size, created_at, updated_at)
		VALUES (?, ?, ?, 'keluar', ?, ?, ?, ?, 'Menunggu HR', ?, ?, ?, ?, ?, 'hr', ?, ?, ?, ?, ?, ?)
	`,
		input.UserID,
		input.DepartemenID,
		input.NomorSurat,
		input.JenisSurat,
		input.TanggalSurat.Format("2006-01-02"),
		input.Perihal,
		input.IsiSurat,
		input.Kategori,
		input.Prioritas,
		input.Penerima,
		input.TargetDivision,
		input.PreviousDivision,
		input.LampiranPath,
		input.LampiranNama,
		input.LampiranMime,
		input.LampiranSize,
		input.Now,
		input.Now,
	)
	return wrapRepoErr("insert admin staff letter", err)
}

func GetSuratByID(db *sqlx.DB, id int64) (*models.Surat, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var surat models.Surat
	err := db.Get(&surat, "SELECT * FROM surat WHERE surat_id = ?", id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("get surat by id", err)
	}
	return &surat, nil
}

func UpdateSuratReplyToHR(db *sqlx.DB, suratID int64, replyNote string, replyBy int64, repliedAt time.Time, nextTarget *string, currentDivision string) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if repliedAt.IsZero() {
		repliedAt = time.Now()
	}
	_, err := db.Exec(`UPDATE surat SET reply_note=?, reply_by=?, reply_at=?, current_recipient='hr', penerima='Admin HR', target_division=?, previous_division=?, status_persetujuan='Menunggu HR', updated_at=? WHERE surat_id = ?`,
		replyNote, replyBy, repliedAt, nextTarget, currentDivision, repliedAt, suratID)
	return wrapRepoErr("update surat reply to hr", err)
}

func InsertSuratReplyHistory(db *sqlx.DB, suratID int64, repliedBy int64, fromDivision string, toDivision *string, note string, repliedAt time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if repliedAt.IsZero() {
		repliedAt = time.Now()
	}
	_, err := db.Exec(`INSERT INTO surat_reply_histories (surat_id, replied_by, from_division, to_division, note, replied_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		suratID, repliedBy, fromDivision, toDivision, note, repliedAt, repliedAt, repliedAt)
	return wrapRepoErr("insert surat reply history", err)
}

func ReplySuratToHRWithHistory(
	db *sqlx.DB,
	suratID int64,
	replyNote string,
	replyBy int64,
	repliedAt time.Time,
	nextTarget *string,
	currentDivision string,
) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if repliedAt.IsZero() {
		repliedAt = time.Now()
	}

	tx, err := db.Beginx()
	if err != nil {
		return wrapRepoErr("begin reply surat tx", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(
		`UPDATE surat SET reply_note=?, reply_by=?, reply_at=?, current_recipient='hr', penerima='Admin HR', target_division=?, previous_division=?, status_persetujuan='Menunggu HR', updated_at=? WHERE surat_id = ?`,
		replyNote,
		replyBy,
		repliedAt,
		nextTarget,
		currentDivision,
		repliedAt,
		suratID,
	); err != nil {
		return wrapRepoErr("update surat reply", err)
	}

	if _, err := tx.Exec(
		`INSERT INTO surat_reply_histories (surat_id, replied_by, from_division, to_division, note, replied_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		suratID,
		replyBy,
		currentDivision,
		nextTarget,
		replyNote,
		repliedAt,
		repliedAt,
		repliedAt,
	); err != nil {
		return wrapRepoErr("insert surat reply history", err)
	}

	if err := tx.Commit(); err != nil {
		return wrapRepoErr("commit reply surat tx", err)
	}
	return nil
}

func ArchiveSuratByID(db *sqlx.DB, id int64) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("UPDATE surat SET status_persetujuan='Diarsipkan', current_recipient='archive' WHERE surat_id = ?", id)
	return wrapRepoErr("archive surat by id", err)
}

func UnarchiveSuratByID(db *sqlx.DB, id int64) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("UPDATE surat SET status_persetujuan='Didisposisi', current_recipient='division' WHERE surat_id = ?", id)
	return wrapRepoErr("unarchive surat by id", err)
}

func ListAppliedOrScreeningApplications(db *sqlx.DB, limit int) ([]models.Application, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 10
	}
	rows := []models.Application{}
	err := db.Select(&rows, "SELECT * FROM applications WHERE status IN ('Applied','Screening') ORDER BY submitted_at DESC LIMIT ?", limit)
	return rows, wrapRepoErr("list applied or screening applications", err)
}

func GetDepartemenByName(db *sqlx.DB, nama string) (*models.Departemen, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var row models.Departemen
	err := db.Get(&row, "SELECT * FROM departemen WHERE nama = ? LIMIT 1", nama)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("get departemen by name", err)
	}
	return &row, nil
}

func CreateDepartemenAndReturnID(db *sqlx.DB, nama, kode string) (*int64, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	res, err := db.Exec("INSERT INTO departemen (nama, kode, created_at, updated_at) VALUES (?, ?, NOW(), NOW())", nama, kode)
	if err != nil {
		return nil, wrapRepoErr("create departemen and return id insert", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, wrapRepoErr("create departemen and return id last insert id", err)
	}
	out := id
	return &out, nil
}

func GetDepartemenNameByID(db *sqlx.DB, id int64) (string, error) {
	if db == nil {
		return "", errors.New("database tidak tersedia")
	}
	var name string
	err := db.Get(&name, "SELECT nama FROM departemen WHERE id = ?", id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", wrapRepoErr("get departemen name by id", err)
	}
	return name, nil
}

func GetUserDivisionByID(db *sqlx.DB, userID int64) (string, error) {
	if db == nil {
		return "", errors.New("database tidak tersedia")
	}
	var division string
	err := db.Get(&division, "SELECT division FROM users WHERE id = ?", userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", wrapRepoErr("get user division by id", err)
	}
	return division, nil
}

func GetUserNameByID(db *sqlx.DB, userID int64) (string, error) {
	if db == nil {
		return "", errors.New("database tidak tersedia")
	}
	var name string
	err := db.Get(&name, "SELECT name FROM users WHERE id = ?", userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", wrapRepoErr("get user name by id", err)
	}
	return name, nil
}

func ListSuratReplyHistories(db *sqlx.DB, suratID int64) ([]models.SuratReplyHistory, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.SuratReplyHistory{}
	err := db.Select(&rows, "SELECT * FROM surat_reply_histories WHERE surat_id = ? ORDER BY replied_at", suratID)
	return rows, wrapRepoErr("list surat reply histories", err)
}
