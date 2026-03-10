package superadmin

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/http/handlers"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jung-kurt/gofpdf"
)

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
	apps, err := dbrepo.ListApplicationsForScoring(db, []string{"Applied", "Screening"})
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat kandidat recruitment")
		return
	}
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
	profiles, err := dbrepo.ListApplicantProfilesByUserIDs(db, uniqueApplicantUserIDs(apps))
	if err == nil {
		profileByUser = profiles
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
			rows, err := dbrepo.PromoteApplicationToScreening(db, candidate.Application.ID, now)
			if err == nil && rows > 0 {
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

	for _, candidate := range filtered {
		componentScores := map[string]float64{}
		for _, item := range candidate.Score.Breakdown {
			componentScores[item.Key] = item.Score
		}

		_ = writer.Write([]string{
			strconv.FormatInt(candidate.Application.ID, 10),
			candidate.Application.FullName,
			candidate.Application.Email,
			candidate.Division,
			candidate.Position,
			candidate.Application.Status,
			boolToYesNo(candidate.Score.Eligible),
			candidate.Score.Recommendation,
			fmt.Sprintf("%.2f", candidate.Score.Total),
			strconv.Itoa(candidate.Score.Rank),
			strconv.Itoa(candidate.Score.TotalCandidates),
			fmt.Sprintf("%.1f", componentScores["education"]),
			fmt.Sprintf("%.1f", componentScores["experience"]),
			fmt.Sprintf("%.1f", componentScores["skills"]),
			fmt.Sprintf("%.1f", componentScores["certification"]),
			fmt.Sprintf("%.1f", componentScores["profile"]),
			strings.Join(candidate.Score.Highlights, " | "),
			strings.Join(candidate.Score.Risks, " | "),
			handlers.FormatDateISO(candidate.Application.SubmittedAt),
		})
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
			"exported_count":  len(filtered),
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
