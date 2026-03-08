package superadmin

import (
	"hris-backend/internal/http/handlers"

	"bytes"
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
	"github.com/jung-kurt/gofpdf"
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

func SuperAdminRecruitmentAutoShortlist(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
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
				if profile := handlers.GetApplicantProfile(db, *app.UserID); profile != nil {
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
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
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
				if profile := handlers.GetApplicantProfile(db, *app.UserID); profile != nil {
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
			handlers.FormatDateISO(app.SubmittedAt),
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

func SuperAdminRecruitmentExportScoreReportPDF(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	statusFilter := strings.TrimSpace(c.Query("status"))
	divisionFilter := strings.TrimSpace(c.Query("division"))
	positionFilter := strings.TrimSpace(c.Query("position"))

	db := middleware.GetDB(c)
	scoringData := loadRecruitmentScoringData(db)
	filtered := filterScoringCandidates(scoringData.Candidates, statusFilter, divisionFilter, positionFilter)

	sort.Slice(filtered, func(i, j int) bool {
		left := filtered[i]
		right := filtered[j]
		if left.Division != right.Division {
			return left.Division < right.Division
		}
		if left.Position != right.Position {
			return left.Position < right.Position
		}
		if math.Abs(left.Score.Total-right.Score.Total) > 0.001 {
			return left.Score.Total > right.Score.Total
		}
		return left.Application.ID < right.Application.ID
	})

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(10, 10, 10)
	pdf.SetAutoPageBreak(true, 10)
	pdf.AddPage()

	now := time.Now()
	pdf.SetFont("Arial", "B", 14)
	pdf.CellFormat(0, 8, "Recruitment Scoring Report", "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(0, 5, fmt.Sprintf("Generated: %s", now.Format("02 Jan 2006 15:04")), "", 1, "L", false, 0, "")
	pdf.MultiCell(
		0,
		5,
		fmt.Sprintf(
			"Filter - Status: %s | Division: %s | Position: %s",
			firstNonEmptyText(statusFilter, "All"),
			firstNonEmptyText(divisionFilter, "All"),
			firstNonEmptyText(positionFilter, "All"),
		),
		"",
		"L",
		false,
	)
	pdf.Ln(1)

	totalScore := 0.0
	eligibleCount := 0
	for _, item := range filtered {
		totalScore += item.Score.Total
		if item.Score.Eligible {
			eligibleCount++
		}
	}
	avgScore := 0.0
	if len(filtered) > 0 {
		avgScore = totalScore / float64(len(filtered))
	}

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(0, 6, "Summary", "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(0, 5, fmt.Sprintf("Total Candidates: %d", len(filtered)), "", 1, "L", false, 0, "")
	pdf.CellFormat(0, 5, fmt.Sprintf("Average Score: %.2f", roundTo(avgScore, 2)), "", 1, "L", false, 0, "")
	pdf.CellFormat(0, 5, fmt.Sprintf("Eligible Candidates: %d", eligibleCount), "", 1, "L", false, 0, "")
	pdf.Ln(1)

	drawTableHeader := func() {
		pdf.SetFillColor(37, 99, 235)
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Arial", "B", 8)
		headers := []string{"No", "Candidate", "Division", "Position", "Status", "Score", "Rank", "Recommendation"}
		widths := []float64{8, 34, 22, 30, 18, 14, 10, 54}
		for i := range headers {
			pdf.CellFormat(widths[i], 6, headers[i], "1", 0, "C", true, 0, "")
		}
		pdf.Ln(-1)
		pdf.SetTextColor(0, 0, 0)
		pdf.SetFont("Arial", "", 8)
	}

	drawTableHeader()

	for i, item := range filtered {
		if pdf.GetY() > 276 {
			pdf.AddPage()
			drawTableHeader()
		}

		values := []string{
			strconv.Itoa(i + 1),
			trimToLength(item.Application.FullName, 28),
			trimToLength(item.Division, 18),
			trimToLength(item.Position, 24),
			trimToLength(item.Application.Status, 12),
			fmt.Sprintf("%.1f", item.Score.Total),
			strconv.Itoa(item.Score.Rank),
			trimToLength(item.Score.Recommendation, 33),
		}
		widths := []float64{8, 34, 22, 30, 18, 14, 10, 54}

		for col := range values {
			align := "L"
			if col == 0 || col == 5 || col == 6 {
				align = "C"
			}
			pdf.CellFormat(widths[col], 5.5, values[col], "1", 0, align, false, 0, "")
		}
		pdf.Ln(-1)
	}

	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal membuat PDF laporan scoring.")
		return
	}

	actorID := user.ID
	appendRecruitmentScoringAudit(
		db,
		&actorID,
		recruitmentAuditActionExportPDFReport,
		divisionFilter,
		positionFilter,
		map[string]any{
			"status_filter":   statusFilter,
			"division_filter": divisionFilter,
			"position_filter": positionFilter,
			"exported_count":  len(filtered),
			"format":          "pdf",
		},
	)

	filename := fmt.Sprintf("recruitment-score-report-%s.pdf", now.Format("20060102-150405"))
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	c.Data(http.StatusOK, "application/pdf", out.Bytes())
}

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

	_ = db.Select(&result.Apps, "SELECT * FROM applications ORDER BY submitted_at DESC, id ASC")

	for _, app := range result.Apps {
		if app.UserID == nil {
			continue
		}
		if _, exists := result.ProfileByUID[*app.UserID]; exists {
			continue
		}
		if profile := handlers.GetApplicantProfile(db, *app.UserID); profile != nil {
			result.ProfileByUID[*app.UserID] = profile
		}
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
			"created_at":      handlers.FormatDateTime(row.CreatedAt),
			"created_at_diff": handlers.DiffForHumans(row.CreatedAt),
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
