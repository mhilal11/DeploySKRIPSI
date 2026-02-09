package handlers

import (
	"fmt"
	"math"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

const (
	recruitmentScoreMethod = "Weighted Explainable Scoring v2"

	defaultWeightEducation    = 0.30
	defaultWeightExperience   = 0.30
	defaultWeightSkills       = 0.25
	defaultWeightCerts        = 0.10
	defaultWeightCompleteness = 0.05

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
	WeightSkills       float64
	WeightCerts        float64
	WeightCompleteness float64

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

	scored := make([]scoredRecruitmentCandidate, 0, len(apps))
	for _, app := range apps {
		var profile *models.ApplicantProfile
		if app.UserID != nil {
			profile = profileByUser[*app.UserID]
		}

		criteria := resolveVacancyScoringCriteria(app, criteriaByVacancyKey, criteriaByPosition)
		score := evaluateRecruitmentScore(app, profile, criteria)

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

func loadVacancyScoringCriteria(db *sqlx.DB) (map[string]vacancyScoringCriteria, map[string]vacancyScoringCriteria) {
	rows := []models.DivisionProfile{}
	_ = db.Select(&rows, "SELECT * FROM division_profiles")

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
			Requirements: cleanRequirementList(decodeJSONStringArray(row.JobRequirements)),
			Eligibility:  decodeJSONMap(row.JobEligibility),
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
		WeightSkills:       defaultWeightSkills,
		WeightCerts:        defaultWeightCerts,
		WeightCompleteness: defaultWeightCompleteness,

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
		if value, ok := parseWeight("skills", "skill"); ok {
			config.WeightSkills = value
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
	}

	totalWeight := config.WeightEducation + config.WeightExperience + config.WeightSkills + config.WeightCerts + config.WeightCompleteness
	if totalWeight > 0 {
		config.WeightEducation /= totalWeight
		config.WeightExperience /= totalWeight
		config.WeightSkills /= totalWeight
		config.WeightCerts /= totalWeight
		config.WeightCompleteness /= totalWeight
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

func evaluateRecruitmentScore(
	app models.Application,
	profile *models.ApplicantProfile,
	criteria vacancyScoringCriteria,
) recruitmentScoreResult {
	now := time.Now()
	educations := []map[string]any{}
	experiences := []map[string]any{}
	certifications := []map[string]any{}
	if profile != nil {
		educations = decodeJSONArray(profile.Educations)
		experiences = decodeJSONArray(profile.Experiences)
		certifications = decodeJSONArray(profile.Certifications)
	}

	requiredEducation := normalizeEducationLevel(criteriaString(criteria.Eligibility, "min_education"))
	requiredProgramStudies := criteriaStringList(criteria.Eligibility, "program_studies", "study_programs", "program_study")
	requiredExperienceYears := criteriaInt(criteria.Eligibility, "min_experience_years")
	requiredGender := strings.TrimSpace(criteriaString(criteria.Eligibility, "gender"))
	minAge := criteriaInt(criteria.Eligibility, "min_age")
	maxAge := criteriaInt(criteria.Eligibility, "max_age")
	scoringConfig := scoringConfigFromEligibility(criteria.Eligibility)

	highestEducation := highestEducationFromEntries(educations, app.Education)
	highestStudyProgram := highestStudyProgramFromEntries(educations)
	experienceYears := experienceYearsFromEntries(experiences, now)
	if experienceYears <= 0 && app.Experience != nil {
		experienceYears = parseExperienceYearsFromText(*app.Experience)
	}
	certificationCount := countCertifications(certifications)
	profileCompleteness := computeApplicantProfileCompleteness(profile, app, educations, experiences)

	educationScore, educationDetail, educationPass := scoreEducationCriterion(highestEducation, requiredEducation)
	educationScore, educationDetail = adjustEducationScoreByProgramStudy(
		educationScore,
		educationDetail,
		educationPass,
		highestStudyProgram,
		requiredProgramStudies,
	)
	experienceScore, experienceDetail, experiencePass := scoreExperienceCriterion(experienceYears, requiredExperienceYears)
	skillScore, skillDetail, matchedRequirements, missingRequirements := scoreSkillCriterion(criteria.Requirements, derefString(app.Skills))
	certificationScore, certificationDetail := scoreCertificationCriterion(certificationCount)
	completenessScore, completenessDetail := scoreCompletenessCriterion(profileCompleteness)

	breakdown := []recruitmentScoreBreakdown{
		componentScore("education", "Pendidikan", scoringConfig.WeightEducation, educationScore, educationDetail),
		componentScore("experience", "Pengalaman", scoringConfig.WeightExperience, experienceScore, experienceDetail),
		componentScore("skills", "Kecocokan Skill", scoringConfig.WeightSkills, skillScore, skillDetail),
		componentScore("certification", "Sertifikasi", scoringConfig.WeightCerts, certificationScore, certificationDetail),
		componentScore("profile", "Kelengkapan Profil", scoringConfig.WeightCompleteness, completenessScore, completenessDetail),
	}

	highlights := []string{}
	risks := []string{}
	eligible := true
	hardFailureCount := 0

	if requiredEducation != "" {
		if educationPass {
			highlights = append(highlights, fmt.Sprintf("Pendidikan memenuhi syarat minimal %s.", requiredEducation))
		} else {
			eligible = false
			hardFailureCount++
			risks = append(risks, fmt.Sprintf("Pendidikan belum memenuhi syarat minimal %s.", requiredEducation))
		}
	} else if highestEducation != "" {
		highlights = append(highlights, fmt.Sprintf("Pendidikan tertinggi terdeteksi: %s.", highestEducation))
	}

	if requiredExperienceYears > 0 {
		if experiencePass {
			highlights = append(highlights, fmt.Sprintf("Pengalaman kerja memenuhi minimal %d tahun.", requiredExperienceYears))
		} else {
			eligible = false
			hardFailureCount++
			risks = append(risks, fmt.Sprintf("Pengalaman kerja belum memenuhi minimal %d tahun.", requiredExperienceYears))
		}
	} else if experienceYears > 0 {
		highlights = append(highlights, fmt.Sprintf("Total pengalaman kerja terhitung %.1f tahun.", experienceYears))
	}

	if len(criteria.Requirements) > 0 {
		if len(matchedRequirements) > 0 {
			highlights = append(highlights, fmt.Sprintf("%d dari %d requirement skill cocok.", len(matchedRequirements), len(criteria.Requirements)))
		}
		if len(missingRequirements) > 0 {
			risks = append(risks, fmt.Sprintf("Masih ada %d requirement skill yang belum terlihat pada profil/CV.", len(missingRequirements)))
		}
	}

	if certificationCount > 0 {
		highlights = append(highlights, fmt.Sprintf("%d sertifikasi terdeteksi.", certificationCount))
	}

	if profileCompleteness < 70 {
		risks = append(risks, "Kelengkapan profil masih rendah; data kandidat bisa belum merepresentasikan kompetensi penuh.")
	}

	if strings.TrimSpace(requiredGender) != "" && !strings.EqualFold(requiredGender, "none") && !strings.EqualFold(requiredGender, "any") {
		if profile == nil || profile.Gender == nil || strings.TrimSpace(*profile.Gender) == "" {
			eligible = false
			hardFailureCount++
			risks = append(risks, fmt.Sprintf("Kriteria jenis kelamin %q tidak bisa diverifikasi karena data belum lengkap.", requiredGender))
		} else if !strings.EqualFold(strings.TrimSpace(*profile.Gender), requiredGender) {
			eligible = false
			hardFailureCount++
			risks = append(risks, fmt.Sprintf("Jenis kelamin tidak sesuai kriteria lowongan (%s).", requiredGender))
		} else {
			highlights = append(highlights, "Jenis kelamin sesuai dengan kriteria lowongan.")
		}
	}

	if minAge > 0 || maxAge > 0 {
		var age *int
		if profile != nil {
			age = calculateAge(profile.DateOfBirth)
		}
		if age == nil {
			eligible = false
			hardFailureCount++
			risks = append(risks, "Usia tidak bisa diverifikasi karena tanggal lahir belum lengkap.")
		} else {
			if minAge > 0 && *age < minAge {
				eligible = false
				hardFailureCount++
				risks = append(risks, fmt.Sprintf("Usia kandidat (%d) di bawah batas minimum %d tahun.", *age, minAge))
			}
			if maxAge > 0 && *age > maxAge {
				eligible = false
				hardFailureCount++
				risks = append(risks, fmt.Sprintf("Usia kandidat (%d) di atas batas maksimum %d tahun.", *age, maxAge))
			}
			if (minAge == 0 || *age >= minAge) && (maxAge == 0 || *age <= maxAge) {
				highlights = append(highlights, fmt.Sprintf("Usia kandidat berada dalam rentang kriteria (%d tahun).", *age))
			}
		}
	}

	total := 0.0
	for _, component := range breakdown {
		total += component.Contribution
	}

	if hardFailureCount > 0 {
		penalty := float64(hardFailureCount) * scoringConfig.PenaltyPerFailure
		if hardFailureCount >= scoringConfig.ExtraPenaltyAfterFails {
			penalty += scoringConfig.ExtraPenalty
		}
		total -= penalty
		if total < 0 {
			total = 0
		}
		risks = append(risks, fmt.Sprintf("Skor dikenakan penalti %.1f karena %d kriteria wajib tidak terpenuhi.", penalty, hardFailureCount))
	}

	total = roundTo(total, 2)
	for i := range breakdown {
		breakdown[i].Weight = roundTo(breakdown[i].Weight*100, 1)
		breakdown[i].Score = roundTo(breakdown[i].Score, 1)
		breakdown[i].Contribution = roundTo(breakdown[i].Contribution, 2)
	}

	return recruitmentScoreResult{
		Method:         scoringConfig.Method,
		Total:          total,
		Eligible:       eligible,
		Recommendation: scoreRecommendation(total, eligible, scoringConfig),
		Breakdown:      breakdown,
		Highlights:     uniqueStrings(highlights),
		Risks:          uniqueStrings(risks),
	}
}

func componentScore(key, label string, weight, score float64, detail string) recruitmentScoreBreakdown {
	return recruitmentScoreBreakdown{
		Key:          key,
		Label:        label,
		Weight:       weight,
		Score:        clamp(score, 0, 100),
		Contribution: clamp(score, 0, 100) * weight,
		Detail:       detail,
	}
}

func scoreEducationCriterion(highest, required string) (float64, string, bool) {
	highest = normalizeEducationLevel(highest)
	required = normalizeEducationLevel(required)

	candidateRank := educationRank(highest)
	requiredRank := educationRank(required)

	if required == "" {
		if candidateRank == 0 {
			return 35, "Data pendidikan belum lengkap.", true
		}
		score := 40 + float64(candidateRank)*8
		return clamp(score, 0, 100), fmt.Sprintf("Pendidikan tertinggi: %s.", highest), true
	}

	if candidateRank == 0 {
		return 10, fmt.Sprintf("Tidak ada data pendidikan yang dapat diverifikasi untuk minimal %s.", required), false
	}

	if candidateRank < requiredRank {
		gap := float64(requiredRank - candidateRank)
		score := 55 - gap*20
		return clamp(score, 0, 100), fmt.Sprintf("Pendidikan %s masih di bawah syarat minimal %s.", highest, required), false
	}

	return 100, fmt.Sprintf("Pendidikan %s memenuhi syarat minimal %s.", highest, required), true
}

func scoreExperienceCriterion(experienceYears float64, requiredYears int) (float64, string, bool) {
	experienceYears = clamp(experienceYears, 0, 80)
	if requiredYears <= 0 {
		if experienceYears <= 0 {
			return 100, "Lowongan tidak mensyaratkan pengalaman minimal; kandidat tanpa pengalaman tetap memenuhi.", true
		}
		return 100, fmt.Sprintf("Total pengalaman kerja %.1f tahun.", experienceYears), true
	}

	if experienceYears <= 0 {
		return 5, fmt.Sprintf("Belum ada pengalaman kerja, minimal %d tahun.", requiredYears), false
	}

	required := float64(requiredYears)
	if experienceYears < required {
		ratio := experienceYears / required
		score := ratio * 70
		return clamp(score, 0, 100), fmt.Sprintf("Pengalaman %.1f tahun, masih di bawah minimum %d tahun.", experienceYears, requiredYears), false
	}

	extra := experienceYears - required
	score := 75 + extra*8
	return clamp(score, 0, 100), fmt.Sprintf("Pengalaman %.1f tahun memenuhi minimum %d tahun.", experienceYears, requiredYears), true
}

func scoreSkillCriterion(requirements []string, skillText string) (float64, string, []string, []string) {
	cleanedRequirements := cleanRequirementList(requirements)
	normalizedSkillText := normalizeForMatch(skillText)
	if len(cleanedRequirements) == 0 {
		if strings.TrimSpace(normalizedSkillText) == "" {
			return 45, "Lowongan belum memiliki requirement skill terstruktur, dan skill kandidat belum terisi.", nil, nil
		}
		return 70, "Lowongan belum memiliki requirement skill terstruktur; profil kandidat memiliki data skill.", nil, nil
	}

	if strings.TrimSpace(normalizedSkillText) == "" {
		return 5, fmt.Sprintf("Belum ada data skill kandidat yang bisa dicocokkan (0/%d).", len(cleanedRequirements)), nil, cleanedRequirements
	}

	skillSet := tokenizeToSet(normalizedSkillText)
	matched := []string{}
	missing := []string{}
	for _, requirement := range cleanedRequirements {
		if requirementMatches(requirement, normalizedSkillText, skillSet) {
			matched = append(matched, requirement)
			continue
		}
		missing = append(missing, requirement)
	}

	ratio := float64(len(matched)) / float64(len(cleanedRequirements))
	score := ratio * 100
	return clamp(score, 0, 100),
		fmt.Sprintf("Kecocokan skill %d/%d requirement.", len(matched), len(cleanedRequirements)),
		matched,
		missing
}

func scoreCertificationCriterion(count int) (float64, string) {
	if count <= 0 {
		return 0, "Belum ada sertifikasi yang tercantum."
	}
	return 100, fmt.Sprintf("%d sertifikasi terdeteksi.", count)
}

func scoreCompletenessCriterion(completeness float64) (float64, string) {
	return clamp(completeness, 0, 100), fmt.Sprintf("Kelengkapan profil %.1f%%.", completeness)
}

func computeApplicantProfileCompleteness(
	profile *models.ApplicantProfile,
	app models.Application,
	educations []map[string]any,
	experiences []map[string]any,
) float64 {
	totalFields := 0
	filledFields := 0

	check := func(ok bool) {
		totalFields++
		if ok {
			filledFields++
		}
	}

	if profile != nil {
		check(profile.FullName != nil && strings.TrimSpace(*profile.FullName) != "")
		check(profile.Email != nil && strings.TrimSpace(*profile.Email) != "")
		check(profile.Phone != nil && strings.TrimSpace(*profile.Phone) != "")
		check(profile.DateOfBirth != nil && !profile.DateOfBirth.IsZero())
		check(profile.Gender != nil && strings.TrimSpace(*profile.Gender) != "")
		check(profile.Address != nil && strings.TrimSpace(*profile.Address) != "")
		check(profile.City != nil && strings.TrimSpace(*profile.City) != "")
		check(profile.Province != nil && strings.TrimSpace(*profile.Province) != "")
		check(len(educations) > 0)
		check(len(experiences) > 0)
	} else {
		check(strings.TrimSpace(app.FullName) != "")
		check(strings.TrimSpace(app.Email) != "")
		check(app.Phone != nil && strings.TrimSpace(*app.Phone) != "")
		check(app.Education != nil && strings.TrimSpace(*app.Education) != "")
		check(app.Experience != nil && strings.TrimSpace(*app.Experience) != "")
		check(app.Skills != nil && strings.TrimSpace(*app.Skills) != "")
		check(app.CvFile != nil && strings.TrimSpace(*app.CvFile) != "")
	}

	if totalFields == 0 {
		return 0
	}
	return roundTo(float64(filledFields)/float64(totalFields)*100, 1)
}

func highestEducationFromEntries(educations []map[string]any, fallback *string) string {
	highestRank := 0
	highest := ""

	for _, edu := range educations {
		level := normalizeEducationLevel(anyToString(edu["degree"]))
		rank := educationRank(level)
		if rank > highestRank {
			highestRank = rank
			highest = level
		}
	}

	if highest != "" {
		return highest
	}

	if fallback != nil {
		return normalizeEducationLevel(*fallback)
	}
	return ""
}

func highestStudyProgramFromEntries(educations []map[string]any) string {
	highestRank := 0
	highestProgram := ""

	for _, edu := range educations {
		level := normalizeEducationLevel(anyToString(edu["degree"]))
		rank := educationRank(level)
		program := strings.TrimSpace(anyToString(edu["field_of_study"]))

		if rank > highestRank {
			highestRank = rank
			highestProgram = program
			continue
		}
		if rank == highestRank && highestProgram == "" && program != "" {
			highestProgram = program
		}
	}

	if highestProgram != "" {
		return highestProgram
	}

	for _, edu := range educations {
		program := strings.TrimSpace(anyToString(edu["field_of_study"]))
		if program != "" {
			return program
		}
	}

	return ""
}

func normalizeEducationLevel(value string) string {
	text := strings.ToUpper(strings.TrimSpace(value))
	switch {
	case text == "":
		return ""
	case strings.Contains(text, "S3"), strings.Contains(text, "DOKTOR"):
		return "S3"
	case strings.Contains(text, "S2"), strings.Contains(text, "MAGISTER"):
		return "S2"
	case strings.Contains(text, "D4"):
		return "D4"
	case strings.Contains(text, "S1"), strings.Contains(text, "SARJANA"):
		return "S1"
	case strings.Contains(text, "D3"):
		return "D3"
	case strings.Contains(text, "D2"):
		return "D2"
	case strings.Contains(text, "D1"):
		return "D1"
	case strings.Contains(text, "SMK"):
		return "SMK"
	case strings.Contains(text, "SMA"), strings.Contains(text, "SLTA"), strings.Contains(text, "MA"):
		return "SMA"
	default:
		return text
	}
}

func experienceYearsFromEntries(experiences []map[string]any, now time.Time) float64 {
	totalMonths := 0

	for _, exp := range experiences {
		start, okStart := parseExperienceDate(exp["start_date"], now)
		if !okStart {
			start, okStart = parseExperienceDate(exp["start_year"], now)
		}
		if !okStart {
			continue
		}

		end, okEnd := parseExperienceDate(exp["end_date"], now)
		if !okEnd {
			end, okEnd = parseExperienceDate(exp["end_year"], now)
		}
		if isCurrentExperience(exp["is_current"]) || !okEnd {
			end = beginningOfMonth(now)
		}

		months := monthsBetween(start, end)
		if months > 0 {
			totalMonths += months
		}
	}

	if totalMonths <= 0 {
		return 0
	}
	return roundTo(float64(totalMonths)/12, 1)
}

func parseExperienceDate(value any, now time.Time) (time.Time, bool) {
	switch v := value.(type) {
	case string:
		s := strings.TrimSpace(strings.ToLower(v))
		if s == "" {
			return time.Time{}, false
		}
		switch s {
		case "present", "current", "sekarang", "now":
			return beginningOfMonth(now), true
		}

		layouts := []string{"2006-01", "2006-01-02", "2006/01", "2006"}
		for _, layout := range layouts {
			if t, err := time.Parse(layout, s); err == nil {
				return beginningOfMonth(t), true
			}
		}

		if len(s) >= 4 {
			if year, err := strconv.Atoi(s[:4]); err == nil && year >= 1950 && year <= now.Year()+1 {
				return time.Date(year, time.January, 1, 0, 0, 0, 0, now.Location()), true
			}
		}
	case float64:
		year := int(v)
		if year >= 1950 && year <= now.Year()+1 {
			return time.Date(year, time.January, 1, 0, 0, 0, 0, now.Location()), true
		}
	case int:
		if v >= 1950 && v <= now.Year()+1 {
			return time.Date(v, time.January, 1, 0, 0, 0, 0, now.Location()), true
		}
	case int64:
		year := int(v)
		if year >= 1950 && year <= now.Year()+1 {
			return time.Date(year, time.January, 1, 0, 0, 0, 0, now.Location()), true
		}
	}
	return time.Time{}, false
}

func isCurrentExperience(value any) bool {
	switch v := value.(type) {
	case bool:
		return v
	case string:
		s := strings.TrimSpace(strings.ToLower(v))
		return s == "1" || s == "true" || s == "yes" || s == "ya"
	case float64:
		return int(v) == 1
	case int:
		return v == 1
	default:
		return false
	}
}

func monthsBetween(start, end time.Time) int {
	if end.Before(start) {
		return 0
	}
	months := (end.Year()-start.Year())*12 + int(end.Month()-start.Month())
	if end.Day() >= start.Day() {
		months++
	}
	if months <= 0 {
		return 1
	}
	return months
}

func parseExperienceYearsFromText(value string) float64 {
	matches := experienceYearsPattern.FindStringSubmatch(strings.TrimSpace(value))
	if len(matches) < 2 {
		return 0
	}
	raw := strings.ReplaceAll(matches[1], ",", ".")
	years, err := strconv.ParseFloat(raw, 64)
	if err != nil || years < 0 {
		return 0
	}
	return roundTo(years, 1)
}

func countCertifications(certs []map[string]any) int {
	count := 0
	for _, cert := range certs {
		if strings.TrimSpace(anyToString(cert["name"])) != "" ||
			strings.TrimSpace(anyToString(cert["issuing_organization"])) != "" ||
			strings.TrimSpace(anyToString(cert["credential_id"])) != "" {
			count++
		}
	}
	return count
}

func cleanRequirementList(requirements []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(requirements))
	for _, requirement := range requirements {
		trimmed := strings.TrimSpace(requirement)
		if trimmed == "" {
			continue
		}
		key := normalizeForMatch(trimmed)
		if key == "" {
			continue
		}
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}

func requirementMatches(requirement, normalizedSkillText string, skillSet map[string]struct{}) bool {
	reqNorm := normalizeForMatch(requirement)
	if reqNorm == "" {
		return false
	}

	if strings.Contains(normalizedSkillText, reqNorm) {
		return true
	}

	reqTokens := tokenizeComparable(reqNorm)
	if len(reqTokens) == 0 {
		return false
	}

	matchCount := 0
	for _, token := range reqTokens {
		if tokenInSkillSet(token, skillSet) {
			matchCount++
		}
	}

	threshold := int(math.Ceil(float64(len(reqTokens)) * 0.5))
	if threshold < 1 {
		threshold = 1
	}
	if len(reqTokens) >= 4 && threshold > 2 {
		threshold = 2
	}
	return matchCount >= threshold
}

func tokenInSkillSet(token string, skillSet map[string]struct{}) bool {
	if _, ok := skillSet[token]; ok {
		return true
	}
	for _, alias := range tokenAliases(token) {
		if _, ok := skillSet[alias]; ok {
			return true
		}
	}
	return false
}

func tokenAliases(token string) []string {
	switch token {
	case "golang", "go":
		return []string{"go", "golang"}
	case "js", "javascript":
		return []string{"js", "javascript"}
	case "node", "nodejs":
		return []string{"node", "nodejs"}
	case "react", "reactjs":
		return []string{"react", "reactjs"}
	case "mysql", "sql":
		return []string{"mysql", "sql", "postgresql", "postgres"}
	default:
		return nil
	}
}

func tokenizeToSet(text string) map[string]struct{} {
	tokens := tokenizeComparable(text)
	set := make(map[string]struct{}, len(tokens))
	for _, token := range tokens {
		set[token] = struct{}{}
	}
	return set
}

func tokenizeComparable(text string) []string {
	if text == "" {
		return nil
	}
	cleaned := normalizeForMatch(text)
	if cleaned == "" {
		return nil
	}

	parts := strings.Fields(cleaned)
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if _, isStopWord := commonStopWords[part]; isStopWord {
			continue
		}
		if len(part) < 2 {
			continue
		}
		out = append(out, part)
	}
	return out
}

func normalizeForMatch(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = nonWordPattern.ReplaceAllString(normalized, " ")
	return strings.Join(strings.Fields(normalized), " ")
}

func recruitmentVacancyKey(division *string, position string) string {
	divisionName := ""
	if division != nil {
		divisionName = *division
	}
	return composeVacancyCriteriaKey(divisionName, position)
}

func composeVacancyCriteriaKey(division, position string) string {
	return normalizeKeyToken(division) + "::" + normalizeKeyToken(position)
}

func normalizeKeyToken(value string) string {
	return strings.ToLower(strings.Join(strings.Fields(strings.TrimSpace(value)), " "))
}

func criteriaString(criteria map[string]any, key string) string {
	if criteria == nil {
		return ""
	}
	if raw, ok := criteria[key]; ok {
		return strings.TrimSpace(anyToString(raw))
	}
	return ""
}

func criteriaInt(criteria map[string]any, key string) int {
	if criteria == nil {
		return 0
	}
	raw, exists := criteria[key]
	if !exists {
		return 0
	}
	switch v := raw.(type) {
	case int:
		return v
	case int64:
		return int(v)
	case float64:
		return int(v)
	case string:
		v = strings.TrimSpace(v)
		if v == "" {
			return 0
		}
		i, err := strconv.Atoi(v)
		if err == nil {
			return i
		}
		f, err := strconv.ParseFloat(strings.ReplaceAll(v, ",", "."), 64)
		if err == nil {
			return int(f)
		}
	}
	return 0
}

func criteriaMap(criteria map[string]any, key string) map[string]any {
	if criteria == nil {
		return nil
	}
	raw, exists := criteria[key]
	if !exists {
		return nil
	}
	switch value := raw.(type) {
	case map[string]any:
		return value
	default:
		return nil
	}
}

func criteriaStringList(criteria map[string]any, keys ...string) []string {
	if criteria == nil {
		return nil
	}

	seen := map[string]struct{}{}
	out := []string{}
	appendValue := func(raw any) {
		for _, item := range anyToStringSlice(raw) {
			trimmed := strings.TrimSpace(item)
			if trimmed == "" {
				continue
			}
			key := normalizeForMatch(trimmed)
			if key == "" {
				continue
			}
			if _, exists := seen[key]; exists {
				continue
			}
			seen[key] = struct{}{}
			out = append(out, trimmed)
		}
	}

	for _, key := range keys {
		raw, exists := criteria[key]
		if !exists {
			continue
		}
		appendValue(raw)
	}

	return out
}

func anyToFloat(value any) (float64, bool) {
	switch v := value.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case string:
		trimmed := strings.TrimSpace(v)
		if trimmed == "" {
			return 0, false
		}
		if parsed, err := strconv.ParseFloat(strings.ReplaceAll(trimmed, ",", "."), 64); err == nil {
			return parsed, true
		}
	}
	return 0, false
}

func anyToInt(value any) (int, bool) {
	switch v := value.(type) {
	case int:
		return v, true
	case int64:
		return int(v), true
	case float64:
		return int(v), true
	case string:
		trimmed := strings.TrimSpace(v)
		if trimmed == "" {
			return 0, false
		}
		if parsed, err := strconv.Atoi(trimmed); err == nil {
			return parsed, true
		}
		if parsedFloat, err := strconv.ParseFloat(strings.ReplaceAll(trimmed, ",", "."), 64); err == nil {
			return int(parsedFloat), true
		}
	}
	return 0, false
}

func anyToString(value any) string {
	switch v := value.(type) {
	case string:
		return v
	case fmt.Stringer:
		return v.String()
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case float32:
		return strconv.FormatFloat(float64(v), 'f', -1, 64)
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	default:
		return ""
	}
}

func anyToStringSlice(value any) []string {
	switch v := value.(type) {
	case []string:
		out := make([]string, 0, len(v))
		for _, item := range v {
			trimmed := strings.TrimSpace(item)
			if trimmed != "" {
				out = append(out, trimmed)
			}
		}
		return out
	case []any:
		out := make([]string, 0, len(v))
		for _, item := range v {
			trimmed := strings.TrimSpace(anyToString(item))
			if trimmed != "" {
				out = append(out, trimmed)
			}
		}
		return out
	case string:
		normalized := strings.NewReplacer("\n", ",", ";", ",", "|", ",").Replace(v)
		parts := strings.Split(normalized, ",")
		out := make([]string, 0, len(parts))
		for _, part := range parts {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				out = append(out, trimmed)
			}
		}
		return out
	default:
		return nil
	}
}

func adjustEducationScoreByProgramStudy(
	score float64,
	detail string,
	educationPass bool,
	candidateProgram string,
	requiredPrograms []string,
) (float64, string) {
	cleanedPrograms := cleanRequirementList(requiredPrograms)
	if len(cleanedPrograms) == 0 {
		return clamp(score, 0, 100), detail
	}
	if !educationPass {
		return clamp(score, 0, 100), detail
	}

	candidateProgram = strings.TrimSpace(candidateProgram)
	if candidateProgram == "" {
		adjusted := math.Min(score, programStudyMissingScoreCap)
		return clamp(adjusted, 0, 100),
			fmt.Sprintf("%s Program studi kandidat belum terdeteksi; target prodi: %s.", detail, strings.Join(cleanedPrograms, ", "))
	}

	if matchedProgram := matchingProgramStudy(candidateProgram, cleanedPrograms); matchedProgram != "" {
		return clamp(score, 0, 100),
			fmt.Sprintf("%s Program studi %s sesuai dengan kriteria (%s).", detail, candidateProgram, matchedProgram)
	}

	adjusted := math.Min(score, programStudyMismatchScoreCap)
	return clamp(adjusted, 0, 100),
		fmt.Sprintf("%s Program studi %s belum sesuai dengan kriteria (%s).", detail, candidateProgram, strings.Join(cleanedPrograms, ", "))
}

func matchingProgramStudy(candidateProgram string, requiredPrograms []string) string {
	candidateNorm := normalizeForMatch(candidateProgram)
	if candidateNorm == "" {
		return ""
	}

	candidateSet := tokenizeToSet(candidateNorm)
	for _, requiredProgram := range requiredPrograms {
		requiredNorm := normalizeForMatch(requiredProgram)
		if requiredNorm == "" {
			continue
		}
		if strings.Contains(candidateNorm, requiredNorm) || strings.Contains(requiredNorm, candidateNorm) {
			return requiredProgram
		}
		if requirementMatches(requiredProgram, candidateNorm, candidateSet) {
			return requiredProgram
		}
	}

	return ""
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func beginningOfMonth(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
}

func scoreRecommendation(total float64, eligible bool, config recruitmentScoringConfig) string {
	switch {
	case !eligible && total >= config.RecommendedThreshold:
		return "Perlu Review Manual"
	case !eligible:
		return "Tidak Direkomendasikan"
	case total >= config.PriorityThreshold:
		return "Prioritas Tinggi"
	case total >= config.RecommendedThreshold:
		return "Direkomendasikan"
	case total >= config.ConsiderThreshold:
		return "Pertimbangkan"
	default:
		return "Perlu Pengayaan Data"
	}
}

func uniqueStrings(values []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}

func clamp(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func roundTo(value float64, precision int) float64 {
	if precision < 0 {
		return value
	}
	pow := math.Pow(10, float64(precision))
	return math.Round(value*pow) / pow
}

var commonStopWords = map[string]struct{}{
	"dan": {}, "atau": {}, "yang": {}, "di": {}, "ke": {}, "dengan": {}, "untuk": {}, "pada": {},
	"mampu": {}, "memiliki": {}, "minimal": {}, "pengalaman": {}, "tahun": {}, "sebagai": {}, "dalam": {},
	"the": {}, "and": {}, "with": {}, "for": {}, "from": {}, "able": {}, "ability": {}, "minimum": {},
}
