package services

import (
	"fmt"
	"math"
	"regexp"
	"strings"
)

type RecruitmentScoringConfig struct {
	Method                 string
	WeightEducation        float64
	WeightExperience       float64
	WeightCertifications   float64
	WeightCompleteness     float64
	WeightAIScreening      float64
	PriorityThreshold      float64
	RecommendedThreshold   float64
	ConsiderThreshold      float64
	PenaltyPerFailure      float64
	ExtraPenaltyAfterFails int
	ExtraPenalty           float64
}

type RecruitmentScoringInput struct {
	Config                  RecruitmentScoringConfig
	HighestEducation        string
	HighestStudyProgram     string
	ExperienceYears         float64
	CertificationCount      int
	ProfileCompleteness     float64
	CandidateGender         string
	CandidateAge            *int
	RequiredEducation       string
	RequiredProgramStudies  []string
	RequiredExperienceYears int
	RequiredGender          string
	MinAge                  int
	MaxAge                  int
	AIMatchScore            *float64
}

type RecruitmentScoringBreakdown struct {
	Key          string
	Label        string
	Weight       float64
	Score        float64
	Contribution float64
	Detail       string
	Explanation  string
}

type RecruitmentScoringResult struct {
	Method         string
	Total          float64
	Eligible       bool
	Recommendation string
	Breakdown      []RecruitmentScoringBreakdown
	Highlights     []string
	Risks          []string
}

var scoringNonWordPattern = regexp.MustCompile(`[^\pL\pN]+`)

var genericProgramStudyTokensEngine = map[string]struct{}{
	"ilmu":    {},
	"teknik":  {},
	"studi":   {},
	"study":   {},
	"program": {},
	"science": {},
}

func EvaluateRecruitmentScoring(input RecruitmentScoringInput) RecruitmentScoringResult {
	cfg := input.Config
	requiredEducation := normalizeEducationLevelEngine(input.RequiredEducation)
	requiredProgramStudies := cleanRequirementListEngine(input.RequiredProgramStudies)
	requiredGender := strings.TrimSpace(input.RequiredGender)

	educationScore, educationDetail, educationPass := scoreEducationCriterionEngine(input.HighestEducation, requiredEducation)
	educationScore, educationDetail, educationExplanation := adjustEducationScoreByProgramStudyEngine(
		educationScore,
		educationDetail,
		educationPass,
		input.HighestStudyProgram,
		requiredProgramStudies,
	)
	experienceScore, experienceDetail, experiencePass := scoreExperienceCriterionEngine(input.ExperienceYears, input.RequiredExperienceYears)
	certificationScore, certificationDetail := scoreCertificationCriterionEngine(input.CertificationCount)
	completenessScore, completenessDetail := scoreCompletenessCriterionEngine(input.ProfileCompleteness)

	weightEducation := cfg.WeightEducation
	weightExperience := cfg.WeightExperience
	weightCertifications := cfg.WeightCertifications
	weightProfile := cfg.WeightCompleteness
	weightAI := cfg.WeightAIScreening
	hasAIScore := input.AIMatchScore != nil
	if !hasAIScore {
		weightAI = 0
	}
	totalWeight := weightEducation + weightExperience + weightCertifications + weightProfile + weightAI
	if totalWeight <= 0 {
		totalWeight = 1
	}
	weightEducation /= totalWeight
	weightExperience /= totalWeight
	weightCertifications /= totalWeight
	weightProfile /= totalWeight
	weightAI /= totalWeight

	breakdown := []RecruitmentScoringBreakdown{
		componentScoreEngine("education", "Pendidikan", weightEducation, educationScore, educationDetail, educationExplanation),
		componentScoreEngine("experience", "Pengalaman", weightExperience, experienceScore, experienceDetail),
		componentScoreEngine("certification", "Sertifikasi", weightCertifications, certificationScore, certificationDetail),
		componentScoreEngine("profile", "Kelengkapan Profil", weightProfile, completenessScore, completenessDetail),
	}
	if hasAIScore {
		breakdown = append(breakdown, componentScoreEngine(
			"ai_screening",
			"AI CV Screening",
			weightAI,
			clampEngine(*input.AIMatchScore, 0, 100),
			fmt.Sprintf("Skor kecocokan AI terhadap lowongan: %.1f/100.", clampEngine(*input.AIMatchScore, 0, 100)),
			"",
		))
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
	}

	if input.RequiredExperienceYears > 0 {
		if experiencePass {
			highlights = append(highlights, fmt.Sprintf("Pengalaman kerja memenuhi minimal %d tahun.", input.RequiredExperienceYears))
		} else {
			eligible = false
			hardFailureCount++
			risks = append(risks, fmt.Sprintf("Pengalaman kerja belum memenuhi minimal %d tahun.", input.RequiredExperienceYears))
		}
	}

	if input.CertificationCount > 0 {
		highlights = append(highlights, fmt.Sprintf("%d sertifikasi terdeteksi.", input.CertificationCount))
	}

	if input.ProfileCompleteness < 70 {
		risks = append(risks, "Kelengkapan profil masih rendah; data kandidat bisa belum merepresentasikan kompetensi penuh.")
	}
	if hasAIScore {
		normalizedAIScore := clampEngine(*input.AIMatchScore, 0, 100)
		switch {
		case normalizedAIScore >= 85:
			highlights = append(highlights, fmt.Sprintf("AI CV screening menunjukkan kecocokan sangat tinggi (%.1f/100).", normalizedAIScore))
		case normalizedAIScore >= 70:
			highlights = append(highlights, fmt.Sprintf("AI CV screening menunjukkan kecocokan baik (%.1f/100).", normalizedAIScore))
		case normalizedAIScore < 55:
			risks = append(risks, fmt.Sprintf("AI CV screening menunjukkan kecocokan rendah (%.1f/100).", normalizedAIScore))
		}
	}

	if strings.TrimSpace(requiredGender) != "" && !strings.EqualFold(requiredGender, "none") && !strings.EqualFold(requiredGender, "any") {
		candidateGender := strings.TrimSpace(input.CandidateGender)
		if candidateGender == "" {
			eligible = false
			hardFailureCount++
			risks = append(risks, fmt.Sprintf("Kriteria jenis kelamin %q tidak bisa diverifikasi karena data belum lengkap.", requiredGender))
		} else if !strings.EqualFold(candidateGender, requiredGender) {
			eligible = false
			hardFailureCount++
			risks = append(risks, fmt.Sprintf("Jenis kelamin tidak sesuai kriteria lowongan (%s).", requiredGender))
		} else {
			highlights = append(highlights, "Jenis kelamin sesuai dengan kriteria lowongan.")
		}
	}

	if input.MinAge > 0 || input.MaxAge > 0 {
		if input.CandidateAge == nil {
			eligible = false
			hardFailureCount++
			risks = append(risks, "Usia tidak bisa diverifikasi karena tanggal lahir belum lengkap.")
		} else {
			age := *input.CandidateAge
			if input.MinAge > 0 && age < input.MinAge {
				eligible = false
				hardFailureCount++
				risks = append(risks, fmt.Sprintf("Usia kandidat (%d) di bawah batas minimum %d tahun.", age, input.MinAge))
			}
			if input.MaxAge > 0 && age > input.MaxAge {
				eligible = false
				hardFailureCount++
				risks = append(risks, fmt.Sprintf("Usia kandidat (%d) di atas batas maksimum %d tahun.", age, input.MaxAge))
			}
			if (input.MinAge == 0 || age >= input.MinAge) && (input.MaxAge == 0 || age <= input.MaxAge) {
				highlights = append(highlights, fmt.Sprintf("Usia kandidat berada dalam rentang kriteria (%d tahun).", age))
			}
		}
	}

	total := 0.0
	for _, component := range breakdown {
		total += component.Contribution
	}

	if hardFailureCount > 0 {
		penalty := float64(hardFailureCount) * cfg.PenaltyPerFailure
		if hardFailureCount >= cfg.ExtraPenaltyAfterFails {
			penalty += cfg.ExtraPenalty
		}
		total -= penalty
		if total < 0 {
			total = 0
		}
		risks = append(risks, fmt.Sprintf("Skor dikenakan penalti %.1f karena %d kriteria wajib tidak terpenuhi.", penalty, hardFailureCount))
	}

	total = roundToEngine(total, 2)
	for i := range breakdown {
		breakdown[i].Weight = roundToEngine(breakdown[i].Weight*100, 1)
		breakdown[i].Score = roundToEngine(breakdown[i].Score, 1)
		breakdown[i].Contribution = roundToEngine(breakdown[i].Contribution, 2)
	}
	method := cfg.Method
	if hasAIScore {
		method += " + AI CV Screening"
	}

	return RecruitmentScoringResult{
		Method:         method,
		Total:          total,
		Eligible:       eligible,
		Recommendation: recommendationEngine(total, eligible, cfg),
		Breakdown:      breakdown,
		Highlights:     uniqueStringsEngine(highlights),
		Risks:          uniqueStringsEngine(risks),
	}
}

func componentScoreEngine(key, label string, weight, score float64, detail string, explanation ...string) RecruitmentScoringBreakdown {
	info := ""
	if len(explanation) > 0 {
		info = strings.TrimSpace(explanation[0])
	}
	return RecruitmentScoringBreakdown{
		Key:          key,
		Label:        label,
		Weight:       weight,
		Score:        clampEngine(score, 0, 100),
		Contribution: clampEngine(score, 0, 100) * weight,
		Detail:       detail,
		Explanation:  info,
	}
}

func scoreEducationCriterionEngine(highest, required string) (float64, string, bool) {
	highest = normalizeEducationLevelEngine(highest)
	required = normalizeEducationLevelEngine(required)

	candidateRank := educationRankEngine(highest)
	requiredRank := educationRankEngine(required)
	if required == "" {
		if candidateRank == 0 {
			return 35, "Data pendidikan belum lengkap.", true
		}
		score := 40 + float64(candidateRank)*8
		return clampEngine(score, 0, 100), fmt.Sprintf("Pendidikan tertinggi: %s.", highest), true
	}
	if candidateRank == 0 {
		return 10, fmt.Sprintf("Tidak ada data pendidikan yang dapat diverifikasi untuk minimal %s.", required), false
	}
	if candidateRank < requiredRank {
		gap := float64(requiredRank - candidateRank)
		score := 55 - gap*20
		return clampEngine(score, 0, 100), fmt.Sprintf("Pendidikan %s masih di bawah syarat minimal %s.", highest, required), false
	}
	return 100, fmt.Sprintf("Pendidikan %s memenuhi syarat minimal %s.", highest, required), true
}

func scoreExperienceCriterionEngine(experienceYears float64, requiredYears int) (float64, string, bool) {
	experienceYears = clampEngine(experienceYears, 0, 80)
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
		return clampEngine(ratio*70, 0, 100), fmt.Sprintf("Pengalaman %.1f tahun, masih di bawah minimum %d tahun.", experienceYears, requiredYears), false
	}
	extra := experienceYears - required
	score := 75 + extra*8
	return clampEngine(score, 0, 100), fmt.Sprintf("Pengalaman %.1f tahun memenuhi minimum %d tahun.", experienceYears, requiredYears), true
}

func scoreCertificationCriterionEngine(count int) (float64, string) {
	if count <= 0 {
		return 0, "Belum ada sertifikasi yang tercantum."
	}
	return 100, fmt.Sprintf("%d sertifikasi terdeteksi.", count)
}

func scoreCompletenessCriterionEngine(completeness float64) (float64, string) {
	return clampEngine(completeness, 0, 100), fmt.Sprintf("Kelengkapan profil %.1f%%.", completeness)
}

func recommendationEngine(total float64, eligible bool, cfg RecruitmentScoringConfig) string {
	switch {
	case !eligible && total >= cfg.RecommendedThreshold:
		return "Perlu Review Manual"
	case !eligible:
		return "Tidak Direkomendasikan"
	case total >= cfg.PriorityThreshold:
		return "Prioritas Tinggi"
	case total >= cfg.RecommendedThreshold:
		return "Direkomendasikan"
	case total >= cfg.ConsiderThreshold:
		return "Pertimbangkan"
	default:
		return "Perlu Pengayaan Data"
	}
}

func adjustEducationScoreByProgramStudyEngine(score float64, detail string, educationPass bool, candidateProgram string, requiredPrograms []string) (float64, string, string) {
	cleanedPrograms := cleanRequirementListEngine(requiredPrograms)
	if len(cleanedPrograms) == 0 || !educationPass {
		return clampEngine(score, 0, 100), detail, ""
	}
	candidateProgram = strings.TrimSpace(candidateProgram)
	if candidateProgram == "" {
		adjusted := math.Min(score, 65)
		return clampEngine(adjusted, 0, 100),
			fmt.Sprintf("%s Program studi kandidat belum terdeteksi; target prodi: %s.", detail, strings.Join(cleanedPrograms, ", ")),
			"Program studi kandidat tidak bisa diverifikasi karena data field of study belum tersedia."
	}
	if match := matchingProgramStudyEngine(candidateProgram, cleanedPrograms); match.MatchedProgram != "" {
		return clampEngine(score, 0, 100),
			fmt.Sprintf("%s Program studi %s sesuai dengan kriteria (%s).", detail, candidateProgram, match.MatchedProgram),
			match.Explanation
	}
	adjusted := math.Min(score, 75)
	return clampEngine(adjusted, 0, 100),
		fmt.Sprintf("%s Program studi %s belum sesuai dengan kriteria (%s).", detail, candidateProgram, strings.Join(cleanedPrograms, ", ")),
		"Tidak ditemukan kecocokan nama program studi secara langsung maupun pada kata kunci utamanya. Kata umum akademik seperti 'ilmu' dan 'teknik' tidak dipakai sendiri sebagai dasar kecocokan."
}

type programStudyMatchEngineResult struct {
	MatchedProgram string
	Explanation    string
}

func matchingProgramStudyEngine(candidateProgram string, requiredPrograms []string) programStudyMatchEngineResult {
	candidateNorm := normalizeForMatchEngine(candidateProgram)
	if candidateNorm == "" {
		return programStudyMatchEngineResult{}
	}
	candidateTokens := normalizeProgramStudyTokensEngine(candidateNorm)
	candidateSet := tokensToSetEngine(candidateTokens)
	for _, requiredProgram := range requiredPrograms {
		requiredNorm := normalizeForMatchEngine(requiredProgram)
		if requiredNorm == "" {
			continue
		}
		if candidateNorm == requiredNorm {
			return programStudyMatchEngineResult{
				MatchedProgram: requiredProgram,
				Explanation:    "Dicocokkan karena nama program studi kandidat sama persis dengan target lowongan.",
			}
		}
		if strings.Contains(candidateNorm, requiredNorm) {
			return programStudyMatchEngineResult{
				MatchedProgram: requiredProgram,
				Explanation:    "Dicocokkan karena nama program studi kandidat memuat nama target lowongan secara langsung.",
			}
		}
		requiredTokens := normalizeProgramStudyTokensEngine(requiredNorm)
		if match, matchedTokens := programStudyTokensMatchEngine(requiredTokens, candidateSet); match {
			return programStudyMatchEngineResult{
				MatchedProgram: requiredProgram,
				Explanation: fmt.Sprintf(
					"Dicocokkan berdasarkan kata kunci utama yang sama: %s. Kata umum akademik seperti 'ilmu' dan 'teknik' diabaikan agar tidak menghasilkan kecocokan palsu.",
					strings.Join(matchedTokens, ", "),
				),
			}
		}
	}
	return programStudyMatchEngineResult{}
}

func normalizeProgramStudyTokensEngine(text string) []string {
	parts := strings.Fields(normalizeForMatchEngine(text))
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if len(part) < 2 {
			continue
		}
		if _, generic := genericProgramStudyTokensEngine[part]; generic {
			continue
		}
		out = append(out, part)
	}
	return out
}

func tokensToSetEngine(tokens []string) map[string]struct{} {
	set := make(map[string]struct{}, len(tokens))
	for _, token := range tokens {
		set[token] = struct{}{}
	}
	return set
}

func programStudyTokensMatchEngine(requiredTokens []string, candidateSet map[string]struct{}) (bool, []string) {
	if len(requiredTokens) == 0 {
		return false, nil
	}
	matchedTokens := make([]string, 0, len(requiredTokens))
	for _, token := range requiredTokens {
		if _, ok := candidateSet[token]; ok {
			matchedTokens = append(matchedTokens, token)
		}
	}
	threshold := requiredProgramStudyThresholdEngine(len(requiredTokens))
	return len(matchedTokens) >= threshold, matchedTokens
}

func requiredProgramStudyThresholdEngine(tokenCount int) int {
	switch {
	case tokenCount <= 1:
		return 1
	case tokenCount == 2:
		return 2
	default:
		return tokenCount - 1
	}
}

func cleanRequirementListEngine(requirements []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(requirements))
	for _, requirement := range requirements {
		trimmed := strings.TrimSpace(requirement)
		if trimmed == "" {
			continue
		}
		key := normalizeForMatchEngine(trimmed)
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

func normalizeForMatchEngine(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = scoringNonWordPattern.ReplaceAllString(normalized, " ")
	return strings.Join(strings.Fields(normalized), " ")
}

func tokenizeToSetEngine(text string) map[string]struct{} {
	parts := strings.Fields(normalizeForMatchEngine(text))
	set := make(map[string]struct{}, len(parts))
	for _, part := range parts {
		if len(part) >= 2 {
			set[part] = struct{}{}
		}
	}
	return set
}

func requirementMatchesEngine(requirement, normalizedSkillText string, skillSet map[string]struct{}) bool {
	reqNorm := normalizeForMatchEngine(requirement)
	if reqNorm == "" {
		return false
	}
	if strings.Contains(normalizedSkillText, reqNorm) {
		return true
	}
	reqTokens := strings.Fields(reqNorm)
	if len(reqTokens) == 0 {
		return false
	}
	matchCount := 0
	for _, token := range reqTokens {
		if _, ok := skillSet[token]; ok {
			matchCount++
			continue
		}
		for _, alias := range tokenAliasesEngine(token) {
			if _, ok := skillSet[alias]; ok {
				matchCount++
				break
			}
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

func tokenAliasesEngine(token string) []string {
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

func educationRankEngine(level string) int {
	switch strings.TrimSpace(strings.ToLower(level)) {
	case "s3", "doktor", "doctor", "doctoral":
		return 6
	case "s2", "magister", "master":
		return 5
	case "s1", "sarjana", "bachelor":
		return 4
	case "d4":
		return 3
	case "d3":
		return 2
	case "d2", "d1":
		return 1
	default:
		return 0
	}
}

func normalizeEducationLevelEngine(value string) string {
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

func uniqueStringsEngine(values []string) []string {
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

func clampEngine(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func roundToEngine(value float64, precision int) float64 {
	if precision < 0 {
		return value
	}
	pow := math.Pow(10, float64(precision))
	return math.Round(value*pow) / pow
}
