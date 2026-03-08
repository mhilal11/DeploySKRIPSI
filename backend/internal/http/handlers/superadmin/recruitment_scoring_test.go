package superadmin

import (
	"testing"
	"time"

	"hris-backend/internal/models"
)

func TestEvaluateRecruitmentScore_FailsMinimumCriteria(t *testing.T) {
	app := models.Application{
		ID:       11,
		FullName: "Kandidat Uji",
		Email:    "uji@example.com",
		Position: "Backend Engineer",
		Skills:   strPtr("PHP, HTML"),
	}

	profile := &models.ApplicantProfile{
		FullName:    strPtr("Kandidat Uji"),
		Email:       strPtr("uji@example.com"),
		Phone:       strPtr("08123456789"),
		DateOfBirth: timePtr(time.Date(2004, 1, 10, 0, 0, 0, 0, time.UTC)),
		Educations:  models.JSON(`[{"degree":"D3","field_of_study":"Teknik Informatika"}]`),
		Experiences: models.JSON(`[
			{"position":"Junior Developer","start_date":"2025-01","end_date":"2025-08","is_current":false}
		]`),
	}

	criteria := vacancyScoringCriteria{
		DivisionName: "IT",
		Position:     "Backend Engineer",
		Requirements: []string{"Golang", "REST API"},
		Eligibility: map[string]any{
			"min_education":        "S1",
			"min_experience_years": 2,
		},
	}

	score := evaluateRecruitmentScore(app, profile, criteria)

	if score.Eligible {
		t.Fatalf("expected candidate to be ineligible, got eligible with score %.2f", score.Total)
	}
	if score.Total >= 70 {
		t.Fatalf("expected penalized score below 70, got %.2f", score.Total)
	}
	if len(score.Risks) == 0 {
		t.Fatal("expected risks to be present when criteria are not met")
	}
}

func TestEvaluateRecruitmentScore_HigherForStrongerCandidate(t *testing.T) {
	baseApp := models.Application{
		Position: "Data Analyst",
		Skills:   strPtr("Excel, SQL"),
	}

	criteria := vacancyScoringCriteria{
		DivisionName: "Data",
		Position:     "Data Analyst",
		Requirements: []string{"SQL", "Dashboard", "Analisis Data"},
		Eligibility: map[string]any{
			"min_education":        "S1",
			"min_experience_years": 1,
		},
	}

	strongProfile := &models.ApplicantProfile{
		Educations: models.JSON(`[{"degree":"S2"}]`),
		Experiences: models.JSON(`[
			{"position":"Data Analyst","start_date":"2020-01","end_date":"2024-12"}
		]`),
		Certifications: models.JSON(`[{"name":"Google Data Analytics"}]`),
	}

	weakProfile := &models.ApplicantProfile{
		Educations:     models.JSON(`[{"degree":"S1"}]`),
		Experiences:    models.JSON(`[]`),
		Certifications: models.JSON(`[]`),
	}

	strongScore := evaluateRecruitmentScore(baseApp, strongProfile, criteria)
	weakScore := evaluateRecruitmentScore(baseApp, weakProfile, criteria)

	if strongScore.Total <= weakScore.Total {
		t.Fatalf("expected strong candidate score %.2f to be higher than weak score %.2f", strongScore.Total, weakScore.Total)
	}
}

func TestScoreEducationCriterion_MeetsMinimumGetsFullScore(t *testing.T) {
	score, _, pass := scoreEducationCriterion("S1", "S1")
	if !pass {
		t.Fatal("expected S1 vs S1 to pass minimum education")
	}
	if score != 100 {
		t.Fatalf("expected S1 vs S1 to score 100, got %.2f", score)
	}
}

func TestScoreSkillCriterion_ZeroMatchGetsZero(t *testing.T) {
	score, detail, matched, missing := scoreSkillCriterion(
		[]string{"Golang"},
		"PHP, HTML, CSS",
	)
	if score != 0 {
		t.Fatalf("expected 0/1 skill match to score 0, got %.2f", score)
	}
	if detail != "Kecocokan skill 0/1 requirement." {
		t.Fatalf("unexpected detail: %s", detail)
	}
	if len(matched) != 0 {
		t.Fatalf("expected no matched requirements, got %d", len(matched))
	}
	if len(missing) != 1 {
		t.Fatalf("expected one missing requirement, got %d", len(missing))
	}
}

func TestScoreExperienceCriterion_NoMinimumAnyExperienceGetsFullScore(t *testing.T) {
	score, detail, pass := scoreExperienceCriterion(1.2, 0)
	if !pass {
		t.Fatal("expected experience criterion to pass when no minimum is set")
	}
	if score != 100 {
		t.Fatalf("expected 1.2 years with minimum 0 to score 100, got %.2f", score)
	}
	if detail != "Total pengalaman kerja 1.2 tahun." {
		t.Fatalf("unexpected detail: %s", detail)
	}
}

func TestScoreExperienceCriterion_NoMinimumZeroExperienceGetsFullScore(t *testing.T) {
	score, detail, pass := scoreExperienceCriterion(0, 0)
	if !pass {
		t.Fatal("expected zero experience to pass when no minimum is set")
	}
	if score != 100 {
		t.Fatalf("expected 0 years with minimum 0 to score 100, got %.2f", score)
	}
	expectedDetail := "Lowongan tidak mensyaratkan pengalaman minimal; kandidat tanpa pengalaman tetap memenuhi."
	if detail != expectedDetail {
		t.Fatalf("unexpected detail: %s", detail)
	}
}

func TestScoreCertificationCriterion_AnyCertificationGetsFullScore(t *testing.T) {
	score, detail := scoreCertificationCriterion(1)
	if score != 100 {
		t.Fatalf("expected one certification to score 100, got %.2f", score)
	}
	if detail != "1 sertifikasi terdeteksi." {
		t.Fatalf("unexpected detail: %s", detail)
	}
}

func TestEvaluateRecruitmentScore_ProgramStudyMatchHigherThanMismatch(t *testing.T) {
	app := models.Application{
		Position: "Software Engineer",
		Skills:   strPtr("Golang, REST API"),
	}

	criteria := vacancyScoringCriteria{
		DivisionName: "IT",
		Position:     "Software Engineer",
		Requirements: []string{"Golang"},
		Eligibility: map[string]any{
			"min_education":   "S1",
			"program_studies": []any{"Teknik Informatika", "Sistem Informasi"},
		},
	}

	matchProfile := &models.ApplicantProfile{
		Educations: models.JSON(`[{"degree":"S1","field_of_study":"Teknik Informatika"}]`),
	}

	mismatchProfile := &models.ApplicantProfile{
		Educations: models.JSON(`[{"degree":"S1","field_of_study":"Akuntansi"}]`),
	}

	matchScore := evaluateRecruitmentScore(app, matchProfile, criteria)
	mismatchScore := evaluateRecruitmentScore(app, mismatchProfile, criteria)

	matchEducation := scoreByComponentKey(matchScore.Breakdown, "education")
	mismatchEducation := scoreByComponentKey(mismatchScore.Breakdown, "education")

	if matchEducation <= mismatchEducation {
		t.Fatalf("expected matched study program score %.2f to be higher than mismatch %.2f", matchEducation, mismatchEducation)
	}
	if matchScore.Total <= mismatchScore.Total {
		t.Fatalf("expected total score %.2f to be higher than mismatch %.2f", matchScore.Total, mismatchScore.Total)
	}
}

func TestEvaluateRecruitmentScore_UsesCustomScoringProfile(t *testing.T) {
	app := models.Application{
		Position: "Backend Engineer",
		Skills:   strPtr("Golang, REST API, Unit Testing, Docker"),
	}

	profile := &models.ApplicantProfile{
		Educations: models.JSON(`[{"degree":"S1"}]`),
		Experiences: models.JSON(`[
			{"position":"Backend Engineer","start_date":"2024-01","is_current":true}
		]`),
	}

	defaultCriteria := vacancyScoringCriteria{
		DivisionName: "IT",
		Position:     "Backend Engineer",
		Requirements: []string{"Golang", "REST API"},
		Eligibility:  map[string]any{},
	}

	customCriteria := vacancyScoringCriteria{
		DivisionName: "IT",
		Position:     "Backend Engineer",
		Requirements: []string{"Golang", "REST API"},
		Eligibility: map[string]any{
			"scoring_weights": map[string]any{
				"education":     25,
				"experience":    25,
				"skills":        70,
				"certification": 10,
				"profile":       5,
			},
		},
	}

	defaultScore := evaluateRecruitmentScore(app, profile, defaultCriteria)
	customScore := evaluateRecruitmentScore(app, profile, customCriteria)

	if customScore.Total != defaultScore.Total {
		t.Fatalf("expected total score to stay same when only skill weight changes, got custom %.2f vs default %.2f", customScore.Total, defaultScore.Total)
	}

	if _, ok := breakdownByKey(customScore.Breakdown, "skills"); ok {
		t.Fatal("expected skills component to be removed from custom breakdown")
	}
	if _, ok := breakdownByKey(defaultScore.Breakdown, "skills"); ok {
		t.Fatal("expected skills component to be removed from default breakdown")
	}
	if customScore.Method == defaultScore.Method {
		t.Fatalf("expected custom scoring method label to differ, got %q", customScore.Method)
	}
}

func TestScoringConfigFromEligibility_NormalizesWeightsAndThresholds(t *testing.T) {
	config := scoringConfigFromEligibility(map[string]any{
		"scoring_weights": map[string]any{
			"education":  50,
			"experience": 30,
			"skills":     20,
		},
		"scoring_thresholds": map[string]any{
			"priority":    60,
			"recommended": 80,
			"consider":    40,
		},
	})

	totalWeight := config.WeightEducation + config.WeightExperience + config.WeightCerts + config.WeightCompleteness + config.WeightAIScreening
	if totalWeight < 0.999 || totalWeight > 1.001 {
		t.Fatalf("expected normalized total weight ~1, got %.4f", totalWeight)
	}
	if !(config.PriorityThreshold >= config.RecommendedThreshold && config.RecommendedThreshold >= config.ConsiderThreshold) {
		t.Fatalf("expected descending thresholds, got priority=%.1f recommended=%.1f consider=%.1f",
			config.PriorityThreshold, config.RecommendedThreshold, config.ConsiderThreshold)
	}
}

func TestAssignRecruitmentRanks_PerVacancy(t *testing.T) {
	scored := []scoredRecruitmentCandidate{
		{
			ApplicationID: 1,
			GroupKey:      "it::backend engineer",
			SubmittedAt:   time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			Score:         recruitmentScoreResult{Total: 90},
		},
		{
			ApplicationID: 2,
			GroupKey:      "it::backend engineer",
			SubmittedAt:   time.Date(2026, 1, 2, 0, 0, 0, 0, time.UTC),
			Score:         recruitmentScoreResult{Total: 80},
		},
		{
			ApplicationID: 3,
			GroupKey:      "finance::accounting staff",
			SubmittedAt:   time.Date(2026, 1, 3, 0, 0, 0, 0, time.UTC),
			Score:         recruitmentScoreResult{Total: 75},
		},
	}

	index := assignRecruitmentRanks(scored)

	if index[1].Rank != 1 || index[2].Rank != 2 {
		t.Fatalf("expected backend ranks [1,2], got [%d,%d]", index[1].Rank, index[2].Rank)
	}
	if index[1].TotalCandidates != 2 || index[2].TotalCandidates != 2 {
		t.Fatalf("expected backend candidate count to be 2, got [%d,%d]", index[1].TotalCandidates, index[2].TotalCandidates)
	}
	if index[3].Rank != 1 || index[3].TotalCandidates != 1 {
		t.Fatalf("expected finance candidate rank 1/1, got rank=%d total=%d", index[3].Rank, index[3].TotalCandidates)
	}
}

func strPtr(v string) *string { return &v }

func timePtr(v time.Time) *time.Time { return &v }

func scoreByComponentKey(items []recruitmentScoreBreakdown, key string) float64 {
	for _, item := range items {
		if item.Key == key {
			return item.Score
		}
	}
	return 0
}

func breakdownByKey(items []recruitmentScoreBreakdown, key string) (recruitmentScoreBreakdown, bool) {
	for _, item := range items {
		if item.Key == key {
			return item, true
		}
	}
	return recruitmentScoreBreakdown{}, false
}
