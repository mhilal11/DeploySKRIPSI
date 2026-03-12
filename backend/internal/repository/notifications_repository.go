package db

import (
	"errors"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type NotificationRow struct {
	ID          string     `db:"id"`
	Type        string     `db:"type"`
	Title       string     `db:"title"`
	Description string     `db:"description"`
	URL         string     `db:"url"`
	CreatedAt   *time.Time `db:"created_at"`
}

func CountPendingHRLetters(db *sqlx.DB) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, `
		SELECT COUNT(*) FROM surat
		WHERE LOWER(status_persetujuan) IN ('menunggu hr', 'diajukan', 'diproses')
		  AND LOWER(current_recipient) = 'hr'
	`)
	return count, wrapRepoErr("count pending hr letters", err)
}

func CountPendingRecruitmentApplications(db *sqlx.DB) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, `SELECT COUNT(*) FROM applications WHERE LOWER(status) IN ('applied', 'screening')`)
	return count, wrapRepoErr("count pending recruitment applications", err)
}

func CountPendingStaffTerminations(db *sqlx.DB) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, `SELECT COUNT(*) FROM staff_terminations WHERE status IN ('Diajukan', 'Proses', 'Diproses')`)
	return count, wrapRepoErr("count pending staff terminations", err)
}

func CountNewComplaints(db *sqlx.DB) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, `SELECT COUNT(*) FROM complaints WHERE LOWER(status) IN ('new', 'baru')`)
	return count, wrapRepoErr("count new complaints", err)
}

func CountUnreadRecentAuditLogs(db *sqlx.DB, userID int64) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, `
		SELECT COUNT(*)
		FROM audit_logs al
		LEFT JOIN audit_log_views av
		  ON av.audit_log_id = al.id
		 AND av.user_id = ?
		WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
		  AND av.id IS NULL
	`, userID)
	return count, wrapRepoErr("count unread recent audit logs", err)
}

func CountRecentAuditLogs(db *sqlx.DB) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, `SELECT COUNT(*) FROM audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`)
	return count, wrapRepoErr("count recent audit logs", err)
}

func ListPendingHRLetters(db *sqlx.DB) ([]models.Surat, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.Surat{}
	err := db.Select(&rows, `
		SELECT * FROM surat
		WHERE LOWER(current_recipient) = 'hr'
		  AND LOWER(status_persetujuan) IN ('menunggu hr','diajukan','diproses')
		ORDER BY created_at DESC
	`)
	return rows, wrapRepoErr("list pending hr letters", err)
}

func ListPendingRecruitmentApplications(db *sqlx.DB) ([]models.Application, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.Application{}
	err := db.Select(&rows, `
		SELECT * FROM applications
		WHERE LOWER(status) IN ('applied','screening')
		ORDER BY created_at DESC
	`)
	return rows, wrapRepoErr("list pending recruitment applications", err)
}

func ListPendingStaffTerminations(db *sqlx.DB) ([]models.StaffTermination, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.StaffTermination{}
	err := db.Select(&rows, `
		SELECT * FROM staff_terminations
		WHERE status IN ('Diajukan','Proses','Diproses')
		ORDER BY request_date DESC
	`)
	return rows, wrapRepoErr("list pending staff terminations", err)
}

func ListNewComplaints(db *sqlx.DB) ([]models.Complaint, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.Complaint{}
	err := db.Select(&rows, `
		SELECT * FROM complaints
		WHERE LOWER(status) IN ('new', 'baru')
		ORDER BY created_at DESC
	`)
	return rows, wrapRepoErr("list new complaints", err)
}

func ListUnreadAuditLogs(db *sqlx.DB, userID int64) ([]models.AuditLog, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.AuditLog{}
	err := db.Select(&rows, `
		SELECT id, module, action, entity_type, entity_id, description, created_at
		FROM audit_logs
		WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
		  AND id NOT IN (
			SELECT audit_log_id
			FROM audit_log_views
			WHERE user_id = ?
		  )
		ORDER BY created_at DESC
	`, userID)
	return rows, wrapRepoErr("list unread audit logs", err)
}

func ListPendingHRLettersPaged(db *sqlx.DB, limit, offset int) ([]models.Surat, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	rows := []models.Surat{}
	err := db.Select(&rows, `
		SELECT * FROM surat
		WHERE LOWER(current_recipient) = 'hr'
		  AND LOWER(status_persetujuan) IN ('menunggu hr','diajukan','diproses')
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, limit, offset)
	return rows, wrapRepoErr("list pending hr letters paged", err)
}

func ListPendingRecruitmentApplicationsPaged(db *sqlx.DB, limit, offset int) ([]models.Application, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	rows := []models.Application{}
	err := db.Select(&rows, `
		SELECT * FROM applications
		WHERE LOWER(status) IN ('applied','screening')
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, limit, offset)
	return rows, wrapRepoErr("list pending recruitment applications paged", err)
}

func ListPendingStaffTerminationsPaged(db *sqlx.DB, limit, offset int) ([]models.StaffTermination, error) {
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
	err := db.Select(&rows, `
		SELECT * FROM staff_terminations
		WHERE status IN ('Diajukan','Proses','Diproses')
		ORDER BY request_date DESC
		LIMIT ? OFFSET ?
	`, limit, offset)
	return rows, wrapRepoErr("list pending staff terminations paged", err)
}

func ListNewComplaintsPaged(db *sqlx.DB, limit, offset int) ([]models.Complaint, error) {
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
	err := db.Select(&rows, `
		SELECT * FROM complaints
		WHERE LOWER(status) IN ('new', 'baru')
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, limit, offset)
	return rows, wrapRepoErr("list new complaints paged", err)
}

func ListUnreadAuditLogsPaged(db *sqlx.DB, userID int64, limit, offset int) ([]models.AuditLog, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	rows := []models.AuditLog{}
	err := db.Select(&rows, `
		SELECT id, module, action, entity_type, entity_id, description, created_at
		FROM audit_logs
		WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
		  AND id NOT IN (
			SELECT audit_log_id
			FROM audit_log_views
			WHERE user_id = ?
		  )
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, userID, limit, offset)
	return rows, wrapRepoErr("list unread audit logs paged", err)
}

func ListUnifiedNotificationsPaged(db *sqlx.DB, userID int64, limit, offset int) ([]NotificationRow, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	rows := []NotificationRow{}
	err := db.Select(&rows, `
		SELECT id, type, title, description, url, created_at
		FROM (
			SELECT
				CONCAT('letter-', surat_id) AS id,
				'letter' AS type,
				'Surat Perlu Ditindaklanjuti' AS title,
				CONCAT('Surat ', nomor_surat, ' - ', perihal) AS description,
				'/super-admin/kelola-surat' AS url,
				created_at AS created_at
			FROM surat
			WHERE LOWER(current_recipient) = 'hr'
			  AND LOWER(status_persetujuan) IN ('menunggu hr', 'diajukan', 'diproses')

			UNION ALL

			SELECT
				CONCAT('application-', id) AS id,
				'application' AS type,
				'Aplikasi Pelamar Baru' AS title,
				CONCAT(full_name, ' melamar posisi ', position) AS description,
				'/super-admin/recruitment' AS url,
				created_at AS created_at
			FROM applications
			WHERE LOWER(status) IN ('applied', 'screening')

			UNION ALL

			SELECT
				CONCAT('termination-', id) AS id,
				'termination' AS type,
				'Pengajuan Offboarding' AS title,
				CONCAT('Pengajuan offboarding ', employee_name) AS description,
				'/super-admin/kelola-staff' AS url,
				request_date AS created_at
			FROM staff_terminations
			WHERE status IN ('Diajukan', 'Proses', 'Diproses')

			UNION ALL

			SELECT
				CONCAT('complaint-', id) AS id,
				'complaint' AS type,
				'Pengaduan Baru' AS title,
				subject AS description,
				'/super-admin/kelola-pengaduan' AS url,
				created_at AS created_at
			FROM complaints
			WHERE LOWER(status) IN ('new', 'baru')

			UNION ALL

			SELECT
				CONCAT('audit-', id) AS id,
				'audit' AS type,
				CASE
					WHEN action IS NOT NULL AND action <> '' THEN CONCAT('Audit: ', action)
					ELSE 'Aktivitas Audit Baru'
				END AS title,
				COALESCE(NULLIF(description, ''), 'Aktivitas audit baru tercatat.') AS description,
				'/super-admin/audit-log' AS url,
				created_at AS created_at
			FROM audit_logs
			WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
			  AND id NOT IN (
				SELECT audit_log_id
				FROM audit_log_views
				WHERE user_id = ?
			  )
		) notifications
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, userID, limit, offset)
	return rows, wrapRepoErr("list unified notifications paged", err)
}
