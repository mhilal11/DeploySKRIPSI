package superadmin

import (
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func toInt64(value string) int64 {
	parsed, err := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
	if err != nil {
		return 0
	}
	return parsed
}

func extractApplicationUserIDs(apps []models.Application) []int64 {
	seen := map[int64]struct{}{}
	ids := make([]int64, 0, len(apps))
	for _, app := range apps {
		if app.UserID == nil || *app.UserID <= 0 {
			continue
		}
		if _, exists := seen[*app.UserID]; exists {
			continue
		}
		seen[*app.UserID] = struct{}{}
		ids = append(ids, *app.UserID)
	}
	return ids
}

// helpers
func trimTime(value *string) *string {
	if value == nil {
		return nil
	}
	v := *value
	if len(v) >= 5 {
		v = v[:5]
	}
	return &v
}

func summarizeEducation(educations []map[string]any) *string {
	if len(educations) == 0 {
		return nil
	}
	edu := educations[0]
	parts := []string{}
	if v, ok := edu["degree"].(string); ok && v != "" {
		parts = append(parts, v)
	}
	if v, ok := edu["field_of_study"].(string); ok && v != "" {
		parts = append(parts, v)
	}
	if v, ok := edu["institution"].(string); ok && v != "" {
		parts = append(parts, v)
	}
	if len(parts) == 0 {
		return nil
	}
	s := strings.Join(parts, " - ")
	return &s
}

func summarizeExperience(experiences []map[string]any) *string {
	if len(experiences) == 0 {
		return nil
	}
	exp := experiences[0]
	parts := []string{}
	if v, ok := exp["position"].(string); ok && v != "" {
		parts = append(parts, v)
	}
	if v, ok := exp["company"].(string); ok && v != "" {
		parts = append(parts, v)
	}
	if len(parts) == 0 {
		return nil
	}
	s := strings.Join(parts, " @ ")
	return &s
}

func chooseString(primary *string, fallback *string) string {
	if primary != nil && *primary != "" {
		return *primary
	}
	if fallback != nil {
		return *fallback
	}
	return ""
}

func defaultRecruitmentSLASettings() map[string]int {
	return map[string]int{
		"Applied":   2,
		"Screening": 3,
		"Interview": 2,
		"Offering":  2,
	}
}

func loadRecruitmentSLASettings(db *sqlx.DB) map[string]int {
	settings := defaultRecruitmentSLASettings()
	rows, err := dbrepo.ListRecruitmentSLASettings(db)
	if err != nil {
		return settings
	}

	for _, row := range rows {
		stage := strings.TrimSpace(row.Stage)
		if _, ok := settings[stage]; !ok {
			continue
		}
		if row.TargetDays > 0 {
			settings[stage] = row.TargetDays
		}
	}
	return settings
}

func isRecruitmentSLAStage(status string) bool {
	switch status {
	case "Applied", "Screening", "Interview", "Offering":
		return true
	default:
		return false
	}
}

func applicationStageStartedAt(app models.Application) *time.Time {
	switch app.Status {
	case "Applied":
		return app.SubmittedAt
	case "Screening":
		if app.ScreeningAt != nil && !app.ScreeningAt.IsZero() {
			return app.ScreeningAt
		}
		return app.SubmittedAt
	case "Interview":
		if app.InterviewAt != nil && !app.InterviewAt.IsZero() {
			return app.InterviewAt
		}
		if app.ScreeningAt != nil && !app.ScreeningAt.IsZero() {
			return app.ScreeningAt
		}
		return app.SubmittedAt
	case "Offering":
		if app.OfferingAt != nil && !app.OfferingAt.IsZero() {
			return app.OfferingAt
		}
		if app.InterviewAt != nil && !app.InterviewAt.IsZero() {
			return app.InterviewAt
		}
		if app.ScreeningAt != nil && !app.ScreeningAt.IsZero() {
			return app.ScreeningAt
		}
		return app.SubmittedAt
	default:
		return nil
	}
}

func calculateElapsedDays(start, end time.Time) int {
	if end.Before(start) {
		return 0
	}
	return int(end.Sub(start).Hours() / 24)
}

func calculateRemainingDays(dueAt, now time.Time) int {
	if now.After(dueAt) {
		return 0
	}
	return int(dueAt.Sub(now).Hours() / 24)
}

func loadChecklist(db *sqlx.DB, applicationID int64) models.OnboardingChecklist {
	checklist, err := dbrepo.GetOnboardingChecklistByApplicationID(db, applicationID)
	if err != nil || checklist == nil {
		return models.OnboardingChecklist{ApplicationID: applicationID}
	}
	return *checklist
}

func isUserStaff(db *sqlx.DB, userID *int64) bool {
	if userID == nil {
		return false
	}
	role, _ := dbrepo.GetUserRoleByID(db, *userID)
	return role == models.RoleStaff
}

func conflictInterview(db *sqlx.DB, currentID int64, date, start, end string) bool {
	rows, err := dbrepo.ListInterviewApplicationsByDate(db, currentID, date)
	if err != nil {
		return false
	}
	startTime, err := time.Parse("15:04", start)
	if err != nil {
		return false
	}
	endTime, err := time.Parse("15:04", end)
	if err != nil {
		return false
	}

	for _, app := range rows {
		if app.InterviewTime == nil {
			continue
		}
		startVal := trimTime(app.InterviewTime)
		if startVal == nil {
			continue
		}
		otherStart, err := time.Parse("15:04", *startVal)
		if err != nil {
			continue
		}
		otherEnd := otherStart.Add(30 * time.Minute)
		if app.InterviewEndTime != nil {
			endVal := trimTime(app.InterviewEndTime)
			if endVal != nil {
				if t, err := time.Parse("15:04", *endVal); err == nil {
					otherEnd = t
				}
			}
		}
		if otherStart.Before(endTime) && otherEnd.After(startTime) {
			return true
		}
	}
	return false
}

func parseBool(value string) int {
	if value == "true" || value == "1" {
		return 1
	}
	return 0
}

func isValidApplicationStatus(status string) bool {
	for _, s := range models.ApplicationStatuses {
		if s == status {
			return true
		}
	}
	return false
}

func superAdminRecruitmentCVURL(c *gin.Context, applicationID int64, cvPath *string) *string {
	if cvPath == nil || strings.TrimSpace(*cvPath) == "" {
		return nil
	}
	cfg := middleware.GetConfig(c)
	base := strings.TrimRight(cfg.BaseURL, "/")
	url := fmt.Sprintf("%s/api/super-admin/recruitment/%d/cv", base, applicationID)
	return &url
}

func resolveStorageFilePath(storagePath, relativePath string) (string, bool) {
	cleaned := strings.TrimSpace(strings.ReplaceAll(relativePath, "\\", "/"))
	if cleaned == "" || strings.HasPrefix(cleaned, "http://") || strings.HasPrefix(cleaned, "https://") {
		return "", false
	}

	cleaned = strings.TrimPrefix(cleaned, "/")
	cleaned = path.Clean("/" + cleaned)
	cleaned = strings.TrimPrefix(cleaned, "/")
	if cleaned == "" || strings.HasPrefix(cleaned, "../") {
		return "", false
	}

	addRoot := func(roots []string, candidate string) []string {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			return roots
		}
		for _, existing := range roots {
			if strings.EqualFold(existing, candidate) {
				return roots
			}
		}
		return append(roots, candidate)
	}

	roots := []string{}
	roots = addRoot(roots, storagePath)

	if cwd, err := os.Getwd(); err == nil {
		trimmed := strings.TrimPrefix(storagePath, "./")
		roots = addRoot(roots, filepath.Join(cwd, storagePath))
		roots = addRoot(roots, filepath.Join(cwd, trimmed))
		roots = addRoot(roots, filepath.Join(cwd, "storage"))
		roots = addRoot(roots, filepath.Join(cwd, "backend", "storage"))
	}

	if exe, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exe)
		trimmed := strings.TrimPrefix(storagePath, "./")
		roots = addRoot(roots, filepath.Join(exeDir, trimmed))
		roots = addRoot(roots, filepath.Join(exeDir, "..", "storage"))
		roots = addRoot(roots, filepath.Join(exeDir, "..", "..", "storage"))
	}

	for _, root := range roots {
		candidate := filepath.Clean(filepath.Join(root, filepath.FromSlash(cleaned)))
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			return candidate, true
		}
	}

	return "", false
}
