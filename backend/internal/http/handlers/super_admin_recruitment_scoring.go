package handlers

import (
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

const (
	recruitmentAuditActionConfigUpdated = "SCORING_CONFIG_UPDATED"
	recruitmentAuditActionAutoShortlist = "AUTO_SHORTLIST"
	recruitmentAuditActionExportReport  = "EXPORT_SCORE_REPORT"
)

type shortlistCandidate struct {
	Application models.Application
	Score       recruitmentScoreResult
	GroupKey    string
	Division    string
	Position    string
}

type recruitmentScoringAuditRow struct {
	ID            int64          `db:"id"`
	ActorUserID   sql.NullInt64  `db:"actor_user_id"`
	ActorName     sql.NullString `db:"actor_name"`
	Action        string         `db:"action"`
	DivisionName  sql.NullString `db:"division_name"`
	PositionTitle sql.NullString `db:"position_title"`
	DetailsJSON   models.JSON    `db:"details_json"`
	CreatedAt     *time.Time     `db:"created_at"`
}

func SuperAdminRecruitmentAutoShortlist(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	var payload struct {
		TopN         int      `json:"top_n"`
		EligibleOnly *bool    `json:"eligible_only"`
		MinScore     *float64 `json:"min_score"`
	}
	_ = c.ShouldBindJSON(&payload)

	topN := payload.TopN
	if topN <= 0 {
		topN = 3
	}
	if topN > 20 {
		topN = 20
	}

	eligibleOnly := true
	if payload.EligibleOnly != nil {
		eligibleOnly = *payload.EligibleOnly
	}

	minScore := 70.0
	if payload.MinScore != nil {
		minScore = *payload.MinScore
	}
	if minScore < 0 {
		minScore = 0
	}
	if minScore > 100 {
		minScore = 100
	}

	db := middleware.GetDB(c)
	apps := []models.Application{}
	_ = db.Select(&apps, "SELECT * FROM applications WHERE status IN ('Applied','Screening') ORDER BY submitted_at DESC, id ASC")

	if len(apps) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"status": "Tidak ada kandidat dengan status Applied/Screening untuk diproses.",
			"summary": gin.H{
				"shortlisted_count": 0,
				"updated_count":     0,
				"group_count":       0,
			},
		})
		return
	}

	profileByUser := map[int64]*models.ApplicantProfile{}
	for _, app := range apps {
		if app.UserID != nil {
			if _, ok := profileByUser[*app.UserID]; !ok {
				if profile := getApplicantProfile(db, *app.UserID); profile != nil {
					profileByUser[*app.UserID] = profile
				}
			}
		}
	}

	scoreByID := buildRecruitmentScoreIndex(db, apps, profileByUser)

	candidates := make([]shortlistCandidate, 0, len(apps))
	for _, app := range apps {
		score, ok := scoreByID[app.ID]
		if !ok {
			continue
		}
		division := ""
		if app.Division != nil {
			division = strings.TrimSpace(*app.Division)
		}
		position := strings.TrimSpace(app.Position)
		candidates = append(candidates, shortlistCandidate{
			Application: app,
			Score:       score,
			GroupKey:    recruitmentVacancyKey(app.Division, app.Position),
			Division:    division,
			Position:    position,
		})
	}

	selected := pickAutoShortlistCandidates(candidates, topN, eligibleOnly, minScore)
	if len(selected) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"status": "Tidak ada kandidat yang lolos aturan auto-shortlist.",
			"summary": gin.H{
				"shortlisted_count": 0,
				"updated_count":     0,
				"group_count":       0,
			},
		})
		return
	}

	now := time.Now()
	updatedCount := 0
	groupSummary := map[string]map[string]any{}
	selectedPreview := make([]map[string]any, 0, len(selected))

	for _, candidate := range selected {
		updatedThisCandidate := 0
		if candidate.Application.Status == "Applied" {
			result, _ := db.Exec(
				"UPDATE applications SET status = 'Screening', screening_at = IFNULL(screening_at, ?), updated_at = ? WHERE id = ? AND status = 'Applied'",
				now,
				now,
				candidate.Application.ID,
			)
			if rows, _ := result.RowsAffected(); rows > 0 {
				updatedThisCandidate = int(rows)
				updatedCount += updatedThisCandidate
			}
		}

		meta, exists := groupSummary[candidate.GroupKey]
		if !exists {
			meta = map[string]any{
				"division":                 candidate.Division,
				"position":                 candidate.Position,
				"selected_count":           0,
				"updated_to_screening":     0,
				"selected_application_ids": []int64{},
			}
			groupSummary[candidate.GroupKey] = meta
		}
		meta["selected_count"] = meta["selected_count"].(int) + 1
		meta["updated_to_screening"] = meta["updated_to_screening"].(int) + updatedThisCandidate
		meta["selected_application_ids"] = append(meta["selected_application_ids"].([]int64), candidate.Application.ID)

		selectedPreview = append(selectedPreview, map[string]any{
			"application_id": candidate.Application.ID,
			"name":           candidate.Application.FullName,
			"division":       candidate.Division,
			"position":       candidate.Position,
			"score":          roundTo(candidate.Score.Total, 2),
			"rank":           candidate.Score.Rank,
			"eligible":       candidate.Score.Eligible,
		})
	}

	auditActorID := user.ID
	for _, meta := range groupSummary {
		appendRecruitmentScoringAudit(
			db,
			&auditActorID,
			recruitmentAuditActionAutoShortlist,
			stringOrEmpty(meta["division"]),
			stringOrEmpty(meta["position"]),
			map[string]any{
				"top_n":                    topN,
				"eligible_only":            eligibleOnly,
				"min_score":                minScore,
				"selected_count":           meta["selected_count"],
				"selected_application_ids": meta["selected_application_ids"],
				"updated_to_screening":     meta["updated_to_screening"],
			},
		)
	}

	c.JSON(http.StatusOK, gin.H{
		"status": fmt.Sprintf("Auto-shortlist selesai. %d kandidat dipilih, %d kandidat otomatis masuk Screening.", len(selected), updatedCount),
		"summary": gin.H{
			"shortlisted_count": len(selected),
			"updated_count":     updatedCount,
			"group_count":       len(groupSummary),
			"selected":          selectedPreview,
		},
	})
}

func SuperAdminRecruitmentExportScoreReport(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	statusFilter := strings.TrimSpace(c.Query("status"))
	divisionFilter := strings.TrimSpace(c.Query("division"))
	positionFilter := strings.TrimSpace(c.Query("position"))

	db := middleware.GetDB(c)
	apps := []models.Application{}
	_ = db.Select(&apps, "SELECT * FROM applications ORDER BY submitted_at DESC, id ASC")

	profileByUser := map[int64]*models.ApplicantProfile{}
	for _, app := range apps {
		if app.UserID != nil {
			if _, ok := profileByUser[*app.UserID]; !ok {
				if profile := getApplicantProfile(db, *app.UserID); profile != nil {
					profileByUser[*app.UserID] = profile
				}
			}
		}
	}
	scoreByID := buildRecruitmentScoreIndex(db, apps, profileByUser)

	filename := fmt.Sprintf("recruitment-score-report-%s.csv", time.Now().Format("20060102-150405"))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	c.Header("Cache-Control", "no-cache")

	_, _ = c.Writer.Write([]byte{0xEF, 0xBB, 0xBF})
	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	_ = writer.Write([]string{
		"Application ID",
		"Candidate Name",
		"Email",
		"Division",
		"Position",
		"Status",
		"Eligible",
		"Recommendation",
		"Total Score",
		"Rank",
		"Total Candidates",
		"Education Score",
		"Experience Score",
		"Skill Score",
		"Certification Score",
		"Profile Completeness Score",
		"Highlights",
		"Risks",
		"Submitted Date",
	})

	exportedCount := 0
	for _, app := range apps {
		score, ok := scoreByID[app.ID]
		if !ok {
			continue
		}

		division := ""
		if app.Division != nil {
			division = strings.TrimSpace(*app.Division)
		}
		if statusFilter != "" && !strings.EqualFold(app.Status, statusFilter) {
			continue
		}
		if divisionFilter != "" && !strings.EqualFold(division, divisionFilter) {
			continue
		}
		if positionFilter != "" && !strings.EqualFold(strings.TrimSpace(app.Position), positionFilter) {
			continue
		}

		componentScores := map[string]float64{}
		for _, item := range score.Breakdown {
			componentScores[item.Key] = item.Score
		}

		_ = writer.Write([]string{
			strconv.FormatInt(app.ID, 10),
			app.FullName,
			app.Email,
			division,
			app.Position,
			app.Status,
			boolToYesNo(score.Eligible),
			score.Recommendation,
			fmt.Sprintf("%.2f", score.Total),
			strconv.Itoa(score.Rank),
			strconv.Itoa(score.TotalCandidates),
			fmt.Sprintf("%.1f", componentScores["education"]),
			fmt.Sprintf("%.1f", componentScores["experience"]),
			fmt.Sprintf("%.1f", componentScores["skills"]),
			fmt.Sprintf("%.1f", componentScores["certification"]),
			fmt.Sprintf("%.1f", componentScores["profile"]),
			strings.Join(score.Highlights, " | "),
			strings.Join(score.Risks, " | "),
			formatDateISO(app.SubmittedAt),
		})
		exportedCount++
	}

	actorID := user.ID
	appendRecruitmentScoringAudit(
		db,
		&actorID,
		recruitmentAuditActionExportReport,
		divisionFilter,
		positionFilter,
		map[string]any{
			"status_filter":   statusFilter,
			"division_filter": divisionFilter,
			"position_filter": positionFilter,
			"exported_count":  exportedCount,
		},
	)
}

func pickAutoShortlistCandidates(
	candidates []shortlistCandidate,
	topN int,
	eligibleOnly bool,
	minScore float64,
) []shortlistCandidate {
	if topN <= 0 || len(candidates) == 0 {
		return nil
	}

	grouped := map[string][]shortlistCandidate{}
	for _, candidate := range candidates {
		grouped[candidate.GroupKey] = append(grouped[candidate.GroupKey], candidate)
	}

	selected := make([]shortlistCandidate, 0)
	for _, group := range grouped {
		sort.Slice(group, func(i, j int) bool {
			left := group[i]
			right := group[j]
			if left.Score.Eligible != right.Score.Eligible {
				return left.Score.Eligible && !right.Score.Eligible
			}
			if math.Abs(left.Score.Total-right.Score.Total) > 0.001 {
				return left.Score.Total > right.Score.Total
			}
			leftTime := firstNonNilTime(left.Application.SubmittedAt, left.Application.CreatedAt)
			rightTime := firstNonNilTime(right.Application.SubmittedAt, right.Application.CreatedAt)
			if !leftTime.Equal(rightTime) {
				return leftTime.Before(rightTime)
			}
			return left.Application.ID < right.Application.ID
		})

		picked := 0
		for _, candidate := range group {
			if eligibleOnly && !candidate.Score.Eligible {
				continue
			}
			if candidate.Score.Total < minScore {
				continue
			}
			selected = append(selected, candidate)
			picked++
			if picked >= topN {
				break
			}
		}
	}

	sort.Slice(selected, func(i, j int) bool {
		if selected[i].Division != selected[j].Division {
			return selected[i].Division < selected[j].Division
		}
		if selected[i].Position != selected[j].Position {
			return selected[i].Position < selected[j].Position
		}
		if math.Abs(selected[i].Score.Total-selected[j].Score.Total) > 0.001 {
			return selected[i].Score.Total > selected[j].Score.Total
		}
		return selected[i].Application.ID < selected[j].Application.ID
	})

	return selected
}

func appendRecruitmentScoringAudit(
	db *sqlx.DB,
	actorUserID *int64,
	action string,
	divisionName string,
	positionTitle string,
	details map[string]any,
) {
	if db == nil || strings.TrimSpace(action) == "" {
		return
	}
	_ = ensureRecruitmentScoringAuditTable(db)

	detailBytes, _ := json.Marshal(details)
	now := time.Now()
	_, _ = db.Exec(
		`INSERT INTO recruitment_scoring_audits (actor_user_id, action, division_name, position_title, details_json, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		actorUserID,
		action,
		nullableTrimmed(divisionName),
		nullableTrimmed(positionTitle),
		models.JSON(detailBytes),
		now,
	)
}

func loadRecruitmentScoringAudits(db *sqlx.DB, limit int) []map[string]any {
	if db == nil {
		return []map[string]any{}
	}
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if err := ensureRecruitmentScoringAuditTable(db); err != nil {
		return []map[string]any{}
	}

	rows := []recruitmentScoringAuditRow{}
	_ = db.Select(&rows, `
		SELECT a.id, a.actor_user_id, a.action, a.division_name, a.position_title, a.details_json, a.created_at,
		       u.name AS actor_name
		FROM recruitment_scoring_audits a
		LEFT JOIN users u ON u.id = a.actor_user_id
		ORDER BY a.created_at DESC, a.id DESC
		LIMIT ?`, limit)

	result := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		details := map[string]any{}
		if len(row.DetailsJSON) > 0 {
			_ = json.Unmarshal([]byte(row.DetailsJSON), &details)
		}

		result = append(result, map[string]any{
			"id":              row.ID,
			"action":          row.Action,
			"action_label":    recruitmentAuditActionLabel(row.Action),
			"actor_user_id":   nullInt64ToAny(row.ActorUserID),
			"actor_name":      nullStringOr(row.ActorName, "System"),
			"division_name":   nullStringOr(row.DivisionName, "-"),
			"position_title":  nullStringOr(row.PositionTitle, "-"),
			"details":         details,
			"created_at":      formatDateTime(row.CreatedAt),
			"created_at_diff": diffForHumans(row.CreatedAt),
		})
	}

	return result
}

func ensureRecruitmentScoringAuditTable(db *sqlx.DB) error {
	_, err := db.Exec(`
CREATE TABLE IF NOT EXISTS recruitment_scoring_audits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(64) NOT NULL,
  division_name VARCHAR(120) NULL,
  position_title VARCHAR(120) NULL,
  details_json JSON NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_recruitment_scoring_audits_created_at (created_at),
  INDEX idx_recruitment_scoring_audits_action (action),
  CONSTRAINT fk_recruitment_scoring_audits_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
	return err
}

func recruitmentAuditActionLabel(action string) string {
	switch action {
	case recruitmentAuditActionConfigUpdated:
		return "Konfigurasi Scoring Diperbarui"
	case recruitmentAuditActionAutoShortlist:
		return "Auto Shortlist Dijalankan"
	case recruitmentAuditActionExportReport:
		return "Export Laporan Skor"
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

func nullableTrimmed(value string) any {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return trimmed
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
