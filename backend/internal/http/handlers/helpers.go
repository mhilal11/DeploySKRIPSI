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
