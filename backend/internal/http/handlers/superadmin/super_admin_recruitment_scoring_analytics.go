package superadmin

import (
	"math"
	"net/http"
	"sort"
	"time"

	"hris-backend/internal/http/handlers"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func SuperAdminRecruitmentScoringEvaluation(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	topK := parseQueryInt(c.Query("k"), 3, 1, 20)
	eligibleOnly := parseQueryBool(c.Query("eligible_only"), true)
	minScore := parseQueryFloat(c.Query("min_score"), 70, 0, 100)

	db := middleware.GetDB(c)
	scoringData := loadRecruitmentScoringData(db)
	candidates := scoringData.Candidates
	shortlisted := pickAutoShortlistCandidates(candidates, topK, eligibleOnly, minScore)

	buckets := map[string]*recruitmentEvaluationBucket{}
	totalInterviewPositive := 0
	totalHiredPositive := 0
	truePositiveInterview := 0
	truePositiveHired := 0

	for _, candidate := range candidates {
		bucket, exists := buckets[candidate.GroupKey]
		if !exists {
			bucket = &recruitmentEvaluationBucket{
				GroupKey: candidate.GroupKey,
				Division: candidate.Division,
				Position: candidate.Position,
			}
			buckets[candidate.GroupKey] = bucket
		}
		bucket.TotalCandidates++

		if isInterviewPositiveStatus(candidate.Application.Status) {
			bucket.InterviewPositiveCount++
			totalInterviewPositive++
		}
		if isHiredPositiveStatus(candidate.Application.Status) {
			bucket.HiredPositiveCount++
			totalHiredPositive++
		}
	}

	for _, candidate := range shortlisted {
		bucket := buckets[candidate.GroupKey]
		if bucket == nil {
			continue
		}
		bucket.ShortlistedCount++

		if isInterviewPositiveStatus(candidate.Application.Status) {
			bucket.TruePositiveInterview++
			truePositiveInterview++
		}
		if isHiredPositiveStatus(candidate.Application.Status) {
			bucket.TruePositiveHired++
			truePositiveHired++
		}
	}

	rows := make([]map[string]any, 0, len(buckets))
	for _, bucket := range buckets {
		bucket.PrecisionInterviewAtK = ratioPercent(bucket.TruePositiveInterview, bucket.ShortlistedCount)
		bucket.PrecisionHiredAtK = ratioPercent(bucket.TruePositiveHired, bucket.ShortlistedCount)
		bucket.RecallShortlistInterview = ratioPercent(bucket.TruePositiveInterview, bucket.InterviewPositiveCount)
		bucket.RecallShortlistHired = ratioPercent(bucket.TruePositiveHired, bucket.HiredPositiveCount)

		rows = append(rows, map[string]any{
			"group_key":                     bucket.GroupKey,
			"division":                      bucket.Division,
			"position":                      bucket.Position,
			"total_candidates":              bucket.TotalCandidates,
			"shortlisted_count":             bucket.ShortlistedCount,
			"interview_positive_count":      bucket.InterviewPositiveCount,
			"hired_positive_count":          bucket.HiredPositiveCount,
			"tp_interview":                  bucket.TruePositiveInterview,
			"tp_hired":                      bucket.TruePositiveHired,
			"precision_at_k_interview":      bucket.PrecisionInterviewAtK,
			"precision_at_k_hired":          bucket.PrecisionHiredAtK,
			"recall_shortlist_vs_interview": bucket.RecallShortlistInterview,
			"recall_shortlist_vs_hired":     bucket.RecallShortlistHired,
		})
	}

	sort.Slice(rows, func(i, j int) bool {
		leftDivision := stringOrEmpty(rows[i]["division"])
		rightDivision := stringOrEmpty(rows[j]["division"])
		if leftDivision != rightDivision {
			return leftDivision < rightDivision
		}
		leftPosition := stringOrEmpty(rows[i]["position"])
		rightPosition := stringOrEmpty(rows[j]["position"])
		return leftPosition < rightPosition
	})

	c.JSON(http.StatusOK, gin.H{
		"config": gin.H{
			"top_k":         topK,
			"eligible_only": eligibleOnly,
			"min_score":     minScore,
		},
		"summary": gin.H{
			"total_candidates":              len(candidates),
			"groups":                        len(rows),
			"shortlisted_count":             len(shortlisted),
			"interview_positive_count":      totalInterviewPositive,
			"hired_positive_count":          totalHiredPositive,
			"tp_interview":                  truePositiveInterview,
			"tp_hired":                      truePositiveHired,
			"precision_at_k_interview":      ratioPercent(truePositiveInterview, len(shortlisted)),
			"precision_at_k_hired":          ratioPercent(truePositiveHired, len(shortlisted)),
			"recall_shortlist_vs_interview": ratioPercent(truePositiveInterview, totalInterviewPositive),
			"recall_shortlist_vs_hired":     ratioPercent(truePositiveHired, totalHiredPositive),
		},
		"by_vacancy": rows,
	})
}

func SuperAdminRecruitmentScoringAnalytics(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	monthsWindow := parseQueryInt(c.Query("months"), 12, 3, 36)
	now := time.Now()
	windowStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).
		AddDate(0, -(monthsWindow - 1), 0)

	db := middleware.GetDB(c)
	scoringData := loadRecruitmentScoringData(db)

	candidates := make([]shortlistCandidate, 0, len(scoringData.Candidates))
	for _, candidate := range scoringData.Candidates {
		submittedAt := firstNonNilTime(candidate.Application.SubmittedAt, candidate.Application.CreatedAt)
		if submittedAt.IsZero() || !submittedAt.Before(windowStart) {
			candidates = append(candidates, candidate)
		}
	}

	if len(candidates) == 0 {
		candidates = scoringData.Candidates
	}

	type aggregate struct {
		count          int
		totalScore     float64
		scores         []float64
		eligibleCount  int
		interviewCount int
		hiredCount     int
	}

	global := aggregate{}
	divisionAgg := map[string]*aggregate{}
	periodAgg := map[string]*aggregate{}

	for _, candidate := range candidates {
		global.count++
		global.totalScore += candidate.Score.Total
		global.scores = append(global.scores, candidate.Score.Total)
		if candidate.Score.Eligible {
			global.eligibleCount++
		}
		if isInterviewPositiveStatus(candidate.Application.Status) {
			global.interviewCount++
		}
		if isHiredPositiveStatus(candidate.Application.Status) {
			global.hiredCount++
		}

		divisionKey := firstNonEmptyText(candidate.Division, "Tanpa Divisi")
		if _, exists := divisionAgg[divisionKey]; !exists {
			divisionAgg[divisionKey] = &aggregate{}
		}
		division := divisionAgg[divisionKey]
		division.count++
		division.totalScore += candidate.Score.Total
		division.scores = append(division.scores, candidate.Score.Total)
		if candidate.Score.Eligible {
			division.eligibleCount++
		}
		if isInterviewPositiveStatus(candidate.Application.Status) {
			division.interviewCount++
		}
		if isHiredPositiveStatus(candidate.Application.Status) {
			division.hiredCount++
		}

		submittedAt := firstNonNilTime(candidate.Application.SubmittedAt, candidate.Application.CreatedAt)
		if !submittedAt.IsZero() {
			periodKey := submittedAt.Format("2006-01")
			if _, exists := periodAgg[periodKey]; !exists {
				periodAgg[periodKey] = &aggregate{}
			}
			period := periodAgg[periodKey]
			period.count++
			period.totalScore += candidate.Score.Total
			period.scores = append(period.scores, candidate.Score.Total)
			if candidate.Score.Eligible {
				period.eligibleCount++
			}
			if isInterviewPositiveStatus(candidate.Application.Status) {
				period.interviewCount++
			}
			if isHiredPositiveStatus(candidate.Application.Status) {
				period.hiredCount++
			}
		}
	}

	globalAvg := 0.0
	if global.count > 0 {
		globalAvg = global.totalScore / float64(global.count)
	}

	divisionRows := make([]map[string]any, 0, len(divisionAgg))
	for division, agg := range divisionAgg {
		avg := 0.0
		if agg.count > 0 {
			avg = agg.totalScore / float64(agg.count)
		}
		gap := roundTo(avg-globalAvg, 2)
		fairnessFlag := "Seimbang"
		switch {
		case math.Abs(gap) >= 10:
			fairnessFlag = "Waspada"
		case math.Abs(gap) >= 5:
			fairnessFlag = "Monitor"
		}

		divisionRows = append(divisionRows, map[string]any{
			"division":                division,
			"applications_count":      agg.count,
			"avg_score":               roundTo(avg, 2),
			"median_score":            medianScore(agg.scores),
			"eligible_rate":           ratioPercent(agg.eligibleCount, agg.count),
			"interview_positive_rate": ratioPercent(agg.interviewCount, agg.count),
			"hired_rate":              ratioPercent(agg.hiredCount, agg.count),
			"score_gap_from_global":   gap,
			"fairness_flag":           fairnessFlag,
		})
	}

	sort.Slice(divisionRows, func(i, j int) bool {
		leftCount, _ := anyToInt(divisionRows[i]["applications_count"])
		rightCount, _ := anyToInt(divisionRows[j]["applications_count"])
		if leftCount != rightCount {
			return leftCount > rightCount
		}
		return stringOrEmpty(divisionRows[i]["division"]) < stringOrEmpty(divisionRows[j]["division"])
	})

	periodKeys := make([]string, 0, len(periodAgg))
	for key := range periodAgg {
		periodKeys = append(periodKeys, key)
	}
	sort.Strings(periodKeys)

	periodRows := make([]map[string]any, 0, len(periodKeys))
	prevAvg := 0.0
	hasPrev := false
	for _, period := range periodKeys {
		agg := periodAgg[period]
		avg := 0.0
		if agg.count > 0 {
			avg = agg.totalScore / float64(agg.count)
		}

		driftDelta := 0.0
		driftLevel := "Stabil"
		if hasPrev {
			driftDelta = roundTo(avg-prevAvg, 2)
			switch {
			case math.Abs(driftDelta) >= 8:
				driftLevel = "Tinggi"
			case math.Abs(driftDelta) >= 4:
				driftLevel = "Sedang"
			}
		}

		periodRows = append(periodRows, map[string]any{
			"period":                  period,
			"period_label":            formatMonthLabel(period),
			"applications_count":      agg.count,
			"avg_score":               roundTo(avg, 2),
			"median_score":            medianScore(agg.scores),
			"eligible_rate":           ratioPercent(agg.eligibleCount, agg.count),
			"interview_positive_rate": ratioPercent(agg.interviewCount, agg.count),
			"hired_rate":              ratioPercent(agg.hiredCount, agg.count),
			"drift_score_delta":       driftDelta,
			"drift_level":             driftLevel,
		})

		prevAvg = avg
		hasPrev = true
	}

	c.JSON(http.StatusOK, gin.H{
		"window_months": monthsWindow,
		"summary": gin.H{
			"total_candidates":               global.count,
			"global_avg_score":               roundTo(globalAvg, 2),
			"global_median_score":            medianScore(global.scores),
			"global_eligible_rate":           ratioPercent(global.eligibleCount, global.count),
			"global_interview_positive_rate": ratioPercent(global.interviewCount, global.count),
			"global_hired_rate":              ratioPercent(global.hiredCount, global.count),
		},
		"by_division": divisionRows,
		"by_period":   periodRows,
	})
}
