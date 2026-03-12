package handlers

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
	dbrepo "hris-backend/internal/repository"
)

var (
	displayLocationMu sync.RWMutex
	displayLocation   = defaultDisplayLocation()
)

func defaultDisplayLocation() *time.Location {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		return time.UTC
	}
	return loc
}

func SetDisplayLocation(timezone string) error {
	name := strings.TrimSpace(timezone)
	if name == "" {
		name = "Asia/Jakarta"
	}
	loc, err := time.LoadLocation(name)
	if err != nil {
		return err
	}
	displayLocationMu.Lock()
	displayLocation = loc
	displayLocationMu.Unlock()
	return nil
}

func currentDisplayLocation() *time.Location {
	displayLocationMu.RLock()
	loc := displayLocation
	displayLocationMu.RUnlock()
	return loc
}

func toDisplayTime(t *time.Time) time.Time {
	return t.In(currentDisplayLocation())
}

func FormatDate(t *time.Time) string {
	if t == nil || t.IsZero() {
		return "-"
	}
	local := toDisplayTime(t)
	return local.Format("02 Jan 2006")
}

func FormatDateISO(t *time.Time) string {
	if t == nil || t.IsZero() {
		return ""
	}
	local := toDisplayTime(t)
	return local.Format("2006-01-02")
}

func FormatDateTime(t *time.Time) string {
	if t == nil || t.IsZero() {
		return "-"
	}
	local := toDisplayTime(t)
	return local.Format("02 Jan 2006 15:04")
}

func FormatTimeHM(t *time.Time) string {
	if t == nil || t.IsZero() {
		return "-"
	}
	local := toDisplayTime(t)
	return local.Format("15:04")
}

func DiffForHumans(t *time.Time) string {
	if t == nil || t.IsZero() {
		return "-"
	}
	target := toDisplayTime(t)
	now := time.Now().In(currentDisplayLocation())
	diff := now.Sub(target)
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
func ComputeSuperAdminSidebarNotifications(db any, userID ...int64) map[string]int {
	sqlDB, ok := db.(*sqlx.DB)
	if !ok {
		return map[string]int{}
	}

	notifications := map[string]int{}

	lettersCount, _ := dbrepo.CountPendingHRLetters(sqlDB)
	notifications["super-admin.letters.index"] = lettersCount

	recruitmentCount, _ := dbrepo.CountPendingRecruitmentApplications(sqlDB)
	notifications["super-admin.recruitment"] = recruitmentCount

	staffCount, _ := dbrepo.CountPendingStaffTerminations(sqlDB)
	notifications["super-admin.staff.index"] = staffCount

	complaintsCount, _ := dbrepo.CountNewComplaints(sqlDB)
	notifications["super-admin.complaints.index"] = complaintsCount

	auditCount := 0
	if len(userID) > 0 && userID[0] > 0 {
		auditCount, _ = dbrepo.CountUnreadRecentAuditLogs(sqlDB, userID[0])
	} else {
		auditCount, _ = dbrepo.CountRecentAuditLogs(sqlDB)
	}
	notifications["super-admin.audit-log"] = auditCount

	return notifications
}
