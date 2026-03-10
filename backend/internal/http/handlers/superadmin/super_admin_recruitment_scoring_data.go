package superadmin

import (
	"encoding/json"
	"math"
	"sort"
	"strings"
	"time"

	"hris-backend/internal/http/handlers"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"

	"github.com/jmoiron/sqlx"
)

func loadRecruitmentScoringData(db *sqlx.DB) recruitmentScoringData {
	result := recruitmentScoringData{
		Apps:         []models.Application{},
		ProfileByUID: map[int64]*models.ApplicantProfile{},
		ScoreByAppID: map[int64]recruitmentScoreResult{},
		Candidates:   []shortlistCandidate{},
	}
	if db == nil {
		return result
	}

	apps, err := dbrepo.ListApplicationsForScoring(db, nil)
	if err != nil {
		return result
	}
	result.Apps = apps

	userIDs := uniqueApplicantUserIDs(apps)
	profiles, err := dbrepo.ListApplicantProfilesByUserIDs(db, userIDs)
	if err == nil {
		result.ProfileByUID = profiles
	}

	result.ScoreByAppID = buildRecruitmentScoreIndex(db, result.Apps, result.ProfileByUID)
	result.Candidates = make([]shortlistCandidate, 0, len(result.Apps))
	for _, app := range result.Apps {
		score, ok := result.ScoreByAppID[app.ID]
		if !ok {
			continue
		}
		division := ""
		if app.Division != nil {
			division = strings.TrimSpace(*app.Division)
		}
		result.Candidates = append(result.Candidates, shortlistCandidate{
			Application: app,
			Score:       score,
			GroupKey:    recruitmentVacancyKey(app.Division, app.Position),
			Division:    division,
			Position:    strings.TrimSpace(app.Position),
		})
	}
	return result
}

func filterScoringCandidates(
	candidates []shortlistCandidate,
	statusFilter string,
	divisionFilter string,
	positionFilter string,
) []shortlistCandidate {
	filtered := make([]shortlistCandidate, 0, len(candidates))
	for _, candidate := range candidates {
		if statusFilter != "" && !strings.EqualFold(candidate.Application.Status, statusFilter) {
			continue
		}
		if divisionFilter != "" && !strings.EqualFold(candidate.Division, divisionFilter) {
			continue
		}
		if positionFilter != "" && !strings.EqualFold(candidate.Position, positionFilter) {
			continue
		}
		filtered = append(filtered, candidate)
	}
	return filtered
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

	detailBytes, _ := json.Marshal(details)
	now := time.Now()
	_ = dbrepo.InsertRecruitmentScoringAudit(
		db,
		actorUserID,
		action,
		divisionName,
		positionTitle,
		models.JSON(detailBytes),
		now,
	)
}

func loadRecruitmentScoringAudits(db *sqlx.DB, limit int) []map[string]any {
	if db == nil {
		return []map[string]any{}
	}

	rows, err := dbrepo.ListRecruitmentScoringAudits(db, limit)
	if err != nil {
		return []map[string]any{}
	}

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
			"created_at":      handlers.FormatDateTime(row.CreatedAt),
			"created_at_diff": handlers.DiffForHumans(row.CreatedAt),
		})
	}

	return result
}

func uniqueApplicantUserIDs(apps []models.Application) []int64 {
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
