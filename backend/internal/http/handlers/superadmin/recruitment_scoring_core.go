package superadmin

import (
	"math"
	"regexp"
	"sort"
	"strings"
	"time"

	"hris-backend/internal/http/handlers"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"

	"github.com/jmoiron/sqlx"
)

const (
	recruitmentScoreMethod = "Weighted Explainable Scoring v2"

	defaultWeightEducation    = 0.25
	defaultWeightExperience   = 0.25
	defaultWeightCerts        = 0.10
	defaultWeightCompleteness = 0.05
	defaultWeightAIScreening  = 0.15

	defaultPriorityThreshold    = 85.0
	defaultRecommendedThreshold = 70.0
	defaultConsiderThreshold    = 55.0

	defaultPenaltyPerFailure       = 8.0
	defaultExtraPenaltyAfterFailed = 3
	defaultExtraPenalty            = 4.0

	programStudyMismatchScoreCap = 75.0
	programStudyMissingScoreCap  = 65.0
)

var (
	experienceYearsPattern = regexp.MustCompile(`(?i)(\d+(?:[.,]\d+)?)\s*(?:\+?\s*)?(?:tahun|thn|yrs?|years?)`)
	nonWordPattern         = regexp.MustCompile(`[^\pL\pN]+`)
)

type vacancyScoringCriteria struct {
	DivisionName string
	Position     string
	Requirements []string
	Eligibility  map[string]any
}

type recruitmentScoreBreakdown struct {
	Key          string  `json:"key"`
	Label        string  `json:"label"`
	Weight       float64 `json:"weight"`
	Score        float64 `json:"score"`
	Contribution float64 `json:"contribution"`
	Detail       string  `json:"detail"`
	Explanation  string  `json:"explanation,omitempty"`
}

type recruitmentScoreResult struct {
	Method          string                      `json:"method"`
	Total           float64                     `json:"total"`
	Rank            int                         `json:"rank"`
	TotalCandidates int                         `json:"total_candidates"`
	Eligible        bool                        `json:"eligible"`
	Recommendation  string                      `json:"recommendation"`
	Breakdown       []recruitmentScoreBreakdown `json:"breakdown"`
	Highlights      []string                    `json:"highlights"`
	Risks           []string                    `json:"risks"`
}

type scoredRecruitmentCandidate struct {
	ApplicationID int64
	GroupKey      string
	SubmittedAt   time.Time
	Score         recruitmentScoreResult
}

type recruitmentScoringConfig struct {
	Method string

	WeightEducation    float64
	WeightExperience   float64
	WeightCerts        float64
	WeightCompleteness float64
	WeightAIScreening  float64

	PriorityThreshold    float64
	RecommendedThreshold float64
	ConsiderThreshold    float64

	PenaltyPerFailure      float64
	ExtraPenaltyAfterFails int
	ExtraPenalty           float64
}

func buildRecruitmentScoreIndex(
	db *sqlx.DB,
	apps []models.Application,
	profileByUser map[int64]*models.ApplicantProfile,
) map[int64]recruitmentScoreResult {
	criteriaByVacancyKey, criteriaByPosition := loadVacancyScoringCriteria(db)
	applicationIDs := make([]int64, 0, len(apps))
	for _, app := range apps {
		applicationIDs = append(applicationIDs, app.ID)
	}
	aiScoreByApplicationID := loadLatestSuccessfulAIScoresIndex(db, applicationIDs)

	scored := make([]scoredRecruitmentCandidate, 0, len(apps))
	for _, app := range apps {
		var profile *models.ApplicantProfile
		if app.UserID != nil {
			profile = profileByUser[*app.UserID]
		}
		var aiMatchScore *float64
		if value, ok := aiScoreByApplicationID[app.ID]; ok {
			score := value
			aiMatchScore = &score
		}

		criteria := resolveVacancyScoringCriteria(app, criteriaByVacancyKey, criteriaByPosition)
		score := evaluateRecruitmentScoreWithAI(app, profile, criteria, aiMatchScore)

		submittedAt := time.Time{}
		if app.SubmittedAt != nil {
			submittedAt = *app.SubmittedAt
		}

		scored = append(scored, scoredRecruitmentCandidate{
			ApplicationID: app.ID,
			GroupKey:      recruitmentVacancyKey(app.Division, app.Position),
			SubmittedAt:   submittedAt,
			Score:         score,
		})
	}

	return assignRecruitmentRanks(scored)
}

func assignRecruitmentRanks(scored []scoredRecruitmentCandidate) map[int64]recruitmentScoreResult {
	index := make(map[int64]recruitmentScoreResult, len(scored))
	grouped := make(map[string][]scoredRecruitmentCandidate)
	for _, item := range scored {
		grouped[item.GroupKey] = append(grouped[item.GroupKey], item)
	}

	for _, group := range grouped {
		sort.Slice(group, func(i, j int) bool {
			left := group[i]
			right := group[j]
			if math.Abs(left.Score.Total-right.Score.Total) > 0.001 {
				return left.Score.Total > right.Score.Total
			}
			if !left.SubmittedAt.Equal(right.SubmittedAt) {
				return left.SubmittedAt.Before(right.SubmittedAt)
			}
			return left.ApplicationID < right.ApplicationID
		})

		rank := 1
		for i, item := range group {
			if i > 0 && math.Abs(group[i-1].Score.Total-item.Score.Total) > 0.001 {
				rank = i + 1
			}
			score := item.Score
			score.Rank = rank
			score.TotalCandidates = len(group)
			index[item.ApplicationID] = score
		}
	}

	return index
}

func loadLatestSuccessfulAIScoresIndex(db *sqlx.DB, applicationIDs []int64) map[int64]float64 {
	out := make(map[int64]float64, len(applicationIDs))
	if db == nil || len(applicationIDs) == 0 {
		return out
	}
	scores, err := dbrepo.GetLatestSuccessfulAIScoresByApplicationIDs(db, applicationIDs)
	if err != nil {
		return out
	}
	for applicationID, score := range scores {
		out[applicationID] = clamp(score, 0, 100)
	}
	return out
}

func loadVacancyScoringCriteria(db *sqlx.DB) (map[string]vacancyScoringCriteria, map[string]vacancyScoringCriteria) {
	rows, err := dbrepo.ListDivisionProfiles(db)
	if err != nil {
		rows = []models.DivisionProfile{}
	}

	byVacancyKey := make(map[string]vacancyScoringCriteria)
	byPosition := make(map[string]vacancyScoringCriteria)

	for _, row := range rows {
		if row.JobTitle == nil {
			continue
		}
		position := strings.TrimSpace(*row.JobTitle)
		if position == "" {
			continue
		}

		criteria := vacancyScoringCriteria{
			DivisionName: row.Name,
			Position:     position,
			Requirements: cleanRequirementList(handlers.DecodeJSONStringArray(row.JobRequirements)),
			Eligibility:  handlers.DecodeJSONMap(row.JobEligibility),
		}
		if criteria.Eligibility == nil {
			criteria.Eligibility = map[string]any{}
		}

		byVacancyKey[composeVacancyCriteriaKey(row.Name, position)] = criteria

		positionKey := normalizeKeyToken(position)
		if _, exists := byPosition[positionKey]; !exists {
			byPosition[positionKey] = criteria
		}
	}

	return byVacancyKey, byPosition
}

func resolveVacancyScoringCriteria(
	app models.Application,
	byVacancyKey map[string]vacancyScoringCriteria,
	byPosition map[string]vacancyScoringCriteria,
) vacancyScoringCriteria {
	if app.Division != nil {
		if criteria, ok := byVacancyKey[composeVacancyCriteriaKey(*app.Division, app.Position)]; ok {
			return criteria
		}
	}

	if criteria, ok := byPosition[normalizeKeyToken(app.Position)]; ok {
		return criteria
	}

	divisionName := ""
	if app.Division != nil {
		divisionName = strings.TrimSpace(*app.Division)
	}
	return vacancyScoringCriteria{
		DivisionName: divisionName,
		Position:     strings.TrimSpace(app.Position),
		Requirements: []string{},
		Eligibility:  map[string]any{},
	}
}

func defaultRecruitmentScoringConfig() recruitmentScoringConfig {
	return recruitmentScoringConfig{
		Method: recruitmentScoreMethod,

		WeightEducation:    defaultWeightEducation,
		WeightExperience:   defaultWeightExperience,
		WeightCerts:        defaultWeightCerts,
		WeightCompleteness: defaultWeightCompleteness,
		WeightAIScreening:  defaultWeightAIScreening,

		PriorityThreshold:    defaultPriorityThreshold,
		RecommendedThreshold: defaultRecommendedThreshold,
		ConsiderThreshold:    defaultConsiderThreshold,

		PenaltyPerFailure:      defaultPenaltyPerFailure,
		ExtraPenaltyAfterFails: defaultExtraPenaltyAfterFailed,
		ExtraPenalty:           defaultExtraPenalty,
	}
}

func scoringConfigFromEligibility(criteria map[string]any) recruitmentScoringConfig {
	config := defaultRecruitmentScoringConfig()
	changed := false

	if weights := criteriaMap(criteria, "scoring_weights"); len(weights) > 0 {
		parseWeight := func(keys ...string) (float64, bool) {
			for _, key := range keys {
				if value, ok := anyToFloat(weights[key]); ok {
					if value > 1.5 {
						value = value / 100
					}
					return clamp(value, 0, 1), true
				}
			}
			return 0, false
		}

		if value, ok := parseWeight("education", "edu"); ok {
			config.WeightEducation = value
			changed = true
		}
		if value, ok := parseWeight("experience", "exp"); ok {
			config.WeightExperience = value
			changed = true
		}
		if value, ok := parseWeight("certification", "certifications", "cert"); ok {
			config.WeightCerts = value
			changed = true
		}
		if value, ok := parseWeight("profile", "profile_completeness", "completeness"); ok {
			config.WeightCompleteness = value
			changed = true
		}
		if value, ok := parseWeight("ai_screening", "ai", "ai_cv", "cv_ai", "cv_screening"); ok {
			config.WeightAIScreening = value
			changed = true
		}
	}

	totalWeight := config.WeightEducation + config.WeightExperience + config.WeightCerts + config.WeightCompleteness + config.WeightAIScreening
	if totalWeight > 0 {
		config.WeightEducation /= totalWeight
		config.WeightExperience /= totalWeight
		config.WeightCerts /= totalWeight
		config.WeightCompleteness /= totalWeight
		config.WeightAIScreening /= totalWeight
	}

	if thresholds := criteriaMap(criteria, "scoring_thresholds"); len(thresholds) > 0 {
		if value, ok := anyToFloat(thresholds["priority_high"]); ok {
			config.PriorityThreshold = clamp(value, 0, 100)
			changed = true
		} else if value, ok := anyToFloat(thresholds["priority"]); ok {
			config.PriorityThreshold = clamp(value, 0, 100)
			changed = true
		}

		if value, ok := anyToFloat(thresholds["recommended"]); ok {
			config.RecommendedThreshold = clamp(value, 0, 100)
			changed = true
		}

		if value, ok := anyToFloat(thresholds["consider"]); ok {
			config.ConsiderThreshold = clamp(value, 0, 100)
			changed = true
		}
	}

	if value, ok := anyToFloat(criteria["ineligible_penalty_per_failure"]); ok {
		config.PenaltyPerFailure = clamp(value, 0, 40)
		changed = true
	}
	if value, ok := anyToInt(criteria["extra_penalty_after_failed_criteria"]); ok {
		config.ExtraPenaltyAfterFails = max(value, 0)
		changed = true
	}
	if value, ok := anyToFloat(criteria["extra_penalty_score"]); ok {
		config.ExtraPenalty = clamp(value, 0, 40)
		changed = true
	}

	thresholds := []float64{
		clamp(config.PriorityThreshold, 0, 100),
		clamp(config.RecommendedThreshold, 0, 100),
		clamp(config.ConsiderThreshold, 0, 100),
	}
	sort.Slice(thresholds, func(i, j int) bool { return thresholds[i] > thresholds[j] })
	config.PriorityThreshold = thresholds[0]
	config.RecommendedThreshold = thresholds[1]
	config.ConsiderThreshold = thresholds[2]

	if changed {
		config.Method = recruitmentScoreMethod + " (Custom Vacancy Profile)"
	}

	return config
}
