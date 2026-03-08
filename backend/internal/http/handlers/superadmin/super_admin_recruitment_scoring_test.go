package superadmin

import (
	"testing"
	"time"

	"hris-backend/internal/models"
)

func TestPickAutoShortlistCandidates_PicksTopNPerVacancy(t *testing.T) {
	candidates := []shortlistCandidate{
		{
			Application: models.Application{ID: 1, Position: "Backend Engineer", Status: "Applied"},
			Score:       recruitmentScoreResult{Total: 90, Eligible: true},
			GroupKey:    "it::backend engineer",
			Division:    "IT",
			Position:    "Backend Engineer",
		},
		{
			Application: models.Application{ID: 2, Position: "Backend Engineer", Status: "Applied"},
			Score:       recruitmentScoreResult{Total: 80, Eligible: true},
			GroupKey:    "it::backend engineer",
			Division:    "IT",
			Position:    "Backend Engineer",
		},
		{
			Application: models.Application{ID: 3, Position: "Backend Engineer", Status: "Applied"},
			Score:       recruitmentScoreResult{Total: 60, Eligible: true},
			GroupKey:    "it::backend engineer",
			Division:    "IT",
			Position:    "Backend Engineer",
		},
		{
			Application: models.Application{ID: 4, Position: "Recruiter", Status: "Screening"},
			Score:       recruitmentScoreResult{Total: 88, Eligible: true},
			GroupKey:    "hr::recruiter",
			Division:    "HR",
			Position:    "Recruiter",
		},
	}

	selected := pickAutoShortlistCandidates(candidates, 2, true, 70)

	if len(selected) != 3 {
		t.Fatalf("expected 3 shortlisted candidates (2 IT + 1 HR), got %d", len(selected))
	}

	ids := map[int64]bool{}
	for _, item := range selected {
		ids[item.Application.ID] = true
	}
	if !ids[1] || !ids[2] || !ids[4] {
		t.Fatalf("expected shortlisted ids [1,2,4], got %+v", ids)
	}
}

func TestPickAutoShortlistCandidates_SortsIneligibleAfterEligible(t *testing.T) {
	submittedEarly := timePtr(time.Date(2026, 1, 2, 0, 0, 0, 0, time.UTC))
	submittedLate := timePtr(time.Date(2026, 1, 3, 0, 0, 0, 0, time.UTC))
	candidates := []shortlistCandidate{
		{
			Application: models.Application{ID: 10, Position: "Data Analyst", Status: "Applied", SubmittedAt: submittedLate},
			Score:       recruitmentScoreResult{Total: 92, Eligible: false},
			GroupKey:    "data::data analyst",
			Division:    "Data",
			Position:    "Data Analyst",
		},
		{
			Application: models.Application{ID: 11, Position: "Data Analyst", Status: "Applied", SubmittedAt: submittedEarly},
			Score:       recruitmentScoreResult{Total: 85, Eligible: true},
			GroupKey:    "data::data analyst",
			Division:    "Data",
			Position:    "Data Analyst",
		},
	}

	selected := pickAutoShortlistCandidates(candidates, 1, false, 0)
	if len(selected) != 1 {
		t.Fatalf("expected 1 selected, got %d", len(selected))
	}
	if selected[0].Application.ID != 11 {
		t.Fatalf("expected eligible candidate to be prioritized, got id=%d", selected[0].Application.ID)
	}
}

func TestFilterScoringCandidates_AppliesFilters(t *testing.T) {
	candidates := []shortlistCandidate{
		{
			Application: models.Application{ID: 1, Status: "Applied"},
			Division:    "IT",
			Position:    "Backend Engineer",
		},
		{
			Application: models.Application{ID: 2, Status: "Hired"},
			Division:    "IT",
			Position:    "Backend Engineer",
		},
		{
			Application: models.Application{ID: 3, Status: "Hired"},
			Division:    "HR",
			Position:    "Recruiter",
		},
	}

	filtered := filterScoringCandidates(candidates, "Hired", "IT", "Backend Engineer")
	if len(filtered) != 1 {
		t.Fatalf("expected one candidate after filtering, got %d", len(filtered))
	}
	if filtered[0].Application.ID != 2 {
		t.Fatalf("expected candidate id 2, got %d", filtered[0].Application.ID)
	}
}

func TestRatioPercent(t *testing.T) {
	if value := ratioPercent(2, 4); value != 50 {
		t.Fatalf("expected 50 percent, got %.2f", value)
	}
	if value := ratioPercent(1, 0); value != 0 {
		t.Fatalf("expected 0 percent when denominator is zero, got %.2f", value)
	}
}

func TestMedianScore(t *testing.T) {
	if value := medianScore([]float64{80, 60, 90}); value != 80 {
		t.Fatalf("expected median 80, got %.2f", value)
	}
	if value := medianScore([]float64{80, 60, 90, 100}); value != 85 {
		t.Fatalf("expected median 85, got %.2f", value)
	}
}

func TestStatusHelpers(t *testing.T) {
	if !isInterviewPositiveStatus("Interview") || !isInterviewPositiveStatus("Offering") || !isInterviewPositiveStatus("Hired") {
		t.Fatal("expected Interview/Offering/Hired to be interview-positive statuses")
	}
	if isInterviewPositiveStatus("Applied") {
		t.Fatal("did not expect Applied to be interview-positive")
	}
	if !isHiredPositiveStatus("Hired") {
		t.Fatal("expected Hired to be hired-positive")
	}
	if isHiredPositiveStatus("Interview") {
		t.Fatal("did not expect Interview to be hired-positive")
	}
}

func TestFormatMonthLabel(t *testing.T) {
	if value := formatMonthLabel("2026-02"); value != "Februari 2026" {
		t.Fatalf("unexpected month label: %s", value)
	}
	if value := formatMonthLabel("invalid"); value != "invalid" {
		t.Fatalf("expected invalid period to stay unchanged, got %s", value)
	}
}
