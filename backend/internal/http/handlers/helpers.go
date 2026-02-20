package handlers

import (
	"fmt"
	"time"
)

func formatDate(t *time.Time) string {
	if t == nil || t.IsZero() {
		return "-"
	}
	return t.Format("02 Jan 2006")
}

func formatDateISO(t *time.Time) string {
	if t == nil || t.IsZero() {
		return ""
	}
	return t.Format("2006-01-02")
}

func formatDateTime(t *time.Time) string {
	if t == nil || t.IsZero() {
		return "-"
	}
	return t.Format("02 Jan 2006 15:04")
}

func formatTimeHM(t *time.Time) string {
	if t == nil || t.IsZero() {
		return "-"
	}
	return t.Format("15:04")
}

func diffForHumans(t *time.Time) string {
	if t == nil || t.IsZero() {
		return "-"
	}
	now := time.Now()
	diff := now.Sub(*t)
	after := false
	if diff < 0 {
		after = true
		diff = -diff
	}

	seconds := int(diff.Seconds())
	switch {
	case seconds < 45:
		if after {
			return "sebentar lagi"
		}
		return "baru saja"
	case seconds < 60*60:
		minutes := seconds / 60
		if minutes <= 1 {
			minutes = 1
		}
		if after {
			return "dalam " + itoa(minutes) + " menit"
		}
		return itoa(minutes) + " menit yang lalu"
	case seconds < 60*60*24:
		hours := seconds / (60 * 60)
		if hours <= 1 {
			hours = 1
		}
		if after {
			return "dalam " + itoa(hours) + " jam"
		}
		return itoa(hours) + " jam yang lalu"
	case seconds < 60*60*24*30:
		days := seconds / (60 * 60 * 24)
		if days <= 1 {
			days = 1
		}
		if after {
			return "dalam " + itoa(days) + " hari"
		}
		return itoa(days) + " hari yang lalu"
	case seconds < 60*60*24*365:
		months := seconds / (60 * 60 * 24 * 30)
		if months <= 1 {
			months = 1
		}
		if after {
			return "dalam " + itoa(months) + " bulan"
		}
		return itoa(months) + " bulan yang lalu"
	default:
		years := seconds / (60 * 60 * 24 * 365)
		if years <= 1 {
			years = 1
		}
		if after {
			return "dalam " + itoa(years) + " tahun"
		}
		return itoa(years) + " tahun yang lalu"
	}
}

func itoa(value int) string {
	return fmt.Sprintf("%d", value)
}

// computeSuperAdminSidebarNotifications calculates badge counts for SuperAdmin sidebar.
// Pass userID to get personalized unread audit-log count.
func computeSuperAdminSidebarNotifications(db any, userID ...int64) map[string]int {
	type Querier interface {
		Get(dest interface{}, query string, args ...interface{}) error
	}

	q, ok := db.(Querier)
	if !ok {
		return map[string]int{}
	}

	notifications := map[string]int{}

	// Letters: status in ['Menunggu HR', 'Diajukan', 'Diproses'] AND current_recipient = 'hr'
	var lettersCount int
	_ = q.Get(&lettersCount, `
		SELECT COUNT(*) FROM surat 
		WHERE LOWER(status_persetujuan) IN ('menunggu hr', 'diajukan', 'diproses')
		AND LOWER(current_recipient) = 'hr'
	`)
	notifications["super-admin.letters.index"] = lettersCount

	// Recruitment: status in ['Applied', 'Screening']
	var recruitmentCount int
	_ = q.Get(&recruitmentCount, `
		SELECT COUNT(*) FROM applications 
		WHERE LOWER(status) IN ('applied', 'screening')
	`)
	notifications["super-admin.recruitment"] = recruitmentCount

	// Staff terminations: status in ['Diajukan', 'Proses', 'Diproses']
	var staffCount int
	_ = q.Get(&staffCount, `
		SELECT COUNT(*) FROM staff_terminations 
		WHERE status IN ('Diajukan', 'Proses', 'Diproses')
	`)
	notifications["super-admin.staff.index"] = staffCount

	// Complaints: status = 'new' (legacy rows might still use 'Baru')
	var complaintsCount int
	_ = q.Get(&complaintsCount, `
		SELECT COUNT(*) FROM complaints 
		WHERE LOWER(status) IN ('new', 'baru')
	`)
	notifications["super-admin.complaints.index"] = complaintsCount

	// Audit log: unread activity in the last 24 hours (per user when userID is provided).
	var auditCount int
	if len(userID) > 0 && userID[0] > 0 {
		_ = q.Get(&auditCount, `
			SELECT COUNT(*)
			FROM audit_logs al
			LEFT JOIN audit_log_views av
			  ON av.audit_log_id = al.id
			 AND av.user_id = ?
			WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
			  AND av.id IS NULL
		`, userID[0])
	} else {
		_ = q.Get(&auditCount, `
			SELECT COUNT(*) FROM audit_logs
			WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
		`)
	}
	notifications["super-admin.audit-log"] = auditCount

	return notifications
}
