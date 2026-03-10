package superadmin

import (
	"database/sql"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/models"
)

const (
	recruitmentAuditActionConfigUpdated   = "SCORING_CONFIG_UPDATED"
	recruitmentAuditActionAutoShortlist   = "AUTO_SHORTLIST"
	recruitmentAuditActionExportReport    = "EXPORT_SCORE_REPORT"
	recruitmentAuditActionExportPDFReport = "EXPORT_SCORE_REPORT_PDF"
)

type shortlistCandidate struct {
	Application models.Application
	Score       recruitmentScoreResult
	GroupKey    string
	Division    string
	Position    string
}

type recruitmentScoringData struct {
	Apps         []models.Application
	ProfileByUID map[int64]*models.ApplicantProfile
	ScoreByAppID map[int64]recruitmentScoreResult
	Candidates   []shortlistCandidate
}

type recruitmentEvaluationBucket struct {
	GroupKey                 string
	Division                 string
	Position                 string
	TotalCandidates          int
	ShortlistedCount         int
	InterviewPositiveCount   int
	HiredPositiveCount       int
	TruePositiveInterview    int
	TruePositiveHired        int
	PrecisionInterviewAtK    float64
	PrecisionHiredAtK        float64
	RecallShortlistInterview float64
	RecallShortlistHired     float64
}

func parseQueryInt(raw string, fallback int, min int, max int) int {
	value := fallback
	if parsed, err := strconv.Atoi(strings.TrimSpace(raw)); err == nil {
		value = parsed
	}
	if value < min {
		value = min
	}
	if value > max {
		value = max
	}
	return value
}

func parseQueryFloat(raw string, fallback float64, min float64, max float64) float64 {
	value := fallback
	trimmed := strings.TrimSpace(raw)
	if trimmed != "" {
		if parsed, err := strconv.ParseFloat(trimmed, 64); err == nil {
			value = parsed
		}
	}
	if value < min {
		value = min
	}
	if value > max {
		value = max
	}
	return value
}

func parseQueryBool(raw string, fallback bool) bool {
	trimmed := strings.TrimSpace(strings.ToLower(raw))
	if trimmed == "" {
		return fallback
	}
	switch trimmed {
	case "1", "true", "yes", "ya":
		return true
	case "0", "false", "no", "tidak":
		return false
	default:
		return fallback
	}
}

func ratioPercent(numerator, denominator int) float64 {
	if denominator <= 0 {
		return 0
	}
	return roundTo(float64(numerator)/float64(denominator)*100, 2)
}

func medianScore(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sorted := make([]float64, len(values))
	copy(sorted, values)
	sort.Float64s(sorted)

	mid := len(sorted) / 2
	if len(sorted)%2 == 1 {
		return roundTo(sorted[mid], 2)
	}
	return roundTo((sorted[mid-1]+sorted[mid])/2, 2)
}

func trimToLength(value string, maxLen int) string {
	trimmed := strings.TrimSpace(value)
	if maxLen <= 0 || len(trimmed) <= maxLen {
		return trimmed
	}
	if maxLen <= 3 {
		return trimmed[:maxLen]
	}
	return trimmed[:maxLen-3] + "..."
}

func firstNonEmptyText(value string, fallback string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return fallback
	}
	return trimmed
}

func isInterviewPositiveStatus(status string) bool {
	switch strings.TrimSpace(status) {
	case "Interview", "Offering", "Hired":
		return true
	default:
		return false
	}
}

func isHiredPositiveStatus(status string) bool {
	return strings.TrimSpace(status) == "Hired"
}

func formatMonthLabel(period string) string {
	t, err := time.Parse("2006-01", period)
	if err != nil {
		return period
	}
	months := []string{
		"Januari", "Februari", "Maret", "April", "Mei", "Juni",
		"Juli", "Agustus", "September", "Oktober", "November", "Desember",
	}
	monthIndex := int(t.Month()) - 1
	if monthIndex < 0 || monthIndex >= len(months) {
		return period
	}
	return fmt.Sprintf("%s %d", months[monthIndex], t.Year())
}

func recruitmentAuditActionLabel(action string) string {
	switch action {
	case recruitmentAuditActionConfigUpdated:
		return "Konfigurasi Scoring Diperbarui"
	case recruitmentAuditActionAutoShortlist:
		return "Auto Shortlist Dijalankan"
	case recruitmentAuditActionExportReport:
		return "Export Laporan Skor"
	case recruitmentAuditActionExportPDFReport:
		return "Export Laporan Skor PDF"
	default:
		return action
	}
}

func firstNonNilTime(values ...*time.Time) time.Time {
	for _, value := range values {
		if value != nil && !value.IsZero() {
			return *value
		}
	}
	return time.Time{}
}

func boolToYesNo(value bool) string {
	if value {
		return "Ya"
	}
	return "Tidak"
}

func nullStringOr(value sql.NullString, fallback string) string {
	if value.Valid && strings.TrimSpace(value.String) != "" {
		return value.String
	}
	return fallback
}

func nullInt64ToAny(value sql.NullInt64) any {
	if value.Valid {
		return value.Int64
	}
	return nil
}

func stringOrEmpty(value any) string {
	if value == nil {
		return ""
	}
	switch v := value.(type) {
	case string:
		return strings.TrimSpace(v)
	default:
		return strings.TrimSpace(fmt.Sprintf("%v", value))
	}
}
