package superadmin

import (
	"fmt"
	"strings"
	"time"

	"hris-backend/internal/http/handlers"
	"hris-backend/internal/models"
	"hris-backend/internal/services"
)

func evaluateRecruitmentScore(
	app models.Application,
	profile *models.ApplicantProfile,
	criteria vacancyScoringCriteria,
) recruitmentScoreResult {
	return evaluateRecruitmentScoreWithAI(app, profile, criteria, nil)
}

func evaluateRecruitmentScoreWithAI(
	app models.Application,
	profile *models.ApplicantProfile,
	criteria vacancyScoringCriteria,
	aiMatchScore *float64,
) recruitmentScoreResult {
	now := time.Now()
	educations := []map[string]any{}
	experiences := []map[string]any{}
	certifications := []map[string]any{}
	if profile != nil {
		educations = handlers.DecodeJSONArray(profile.Educations)
		experiences = handlers.DecodeJSONArray(profile.Experiences)
		certifications = handlers.DecodeJSONArray(profile.Certifications)
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

	var candidateAge *int
	candidateGender := ""
	if profile != nil {
		candidateAge = handlers.CalculateAge(profile.DateOfBirth)
		if profile.Gender != nil {
			candidateGender = strings.TrimSpace(*profile.Gender)
		}
	}

	engineResult := services.EvaluateRecruitmentScoring(services.RecruitmentScoringInput{
		Config: services.RecruitmentScoringConfig{
			Method:                 scoringConfig.Method,
			WeightEducation:        scoringConfig.WeightEducation,
			WeightExperience:       scoringConfig.WeightExperience,
			WeightCertifications:   scoringConfig.WeightCerts,
			WeightCompleteness:     scoringConfig.WeightCompleteness,
			WeightAIScreening:      scoringConfig.WeightAIScreening,
			PriorityThreshold:      scoringConfig.PriorityThreshold,
			RecommendedThreshold:   scoringConfig.RecommendedThreshold,
			ConsiderThreshold:      scoringConfig.ConsiderThreshold,
			PenaltyPerFailure:      scoringConfig.PenaltyPerFailure,
			ExtraPenaltyAfterFails: scoringConfig.ExtraPenaltyAfterFails,
			ExtraPenalty:           scoringConfig.ExtraPenalty,
		},
		HighestEducation:        highestEducation,
		HighestStudyProgram:     highestStudyProgram,
		ExperienceYears:         experienceYears,
		CertificationCount:      certificationCount,
		ProfileCompleteness:     profileCompleteness,
		CandidateGender:         candidateGender,
		CandidateAge:            candidateAge,
		RequiredEducation:       requiredEducation,
		RequiredProgramStudies:  requiredProgramStudies,
		RequiredExperienceYears: requiredExperienceYears,
		RequiredGender:          requiredGender,
		MinAge:                  minAge,
		MaxAge:                  maxAge,
		AIMatchScore:            aiMatchScore,
	})

	breakdown := make([]recruitmentScoreBreakdown, 0, len(engineResult.Breakdown))
	for _, component := range engineResult.Breakdown {
		breakdown = append(breakdown, recruitmentScoreBreakdown{
			Key:          component.Key,
			Label:        component.Label,
			Weight:       component.Weight,
			Score:        component.Score,
			Contribution: component.Contribution,
			Detail:       component.Detail,
		})
	}

	return recruitmentScoreResult{
		Method:         engineResult.Method,
		Total:          engineResult.Total,
		Eligible:       engineResult.Eligible,
		Recommendation: engineResult.Recommendation,
		Breakdown:      breakdown,
		Highlights:     engineResult.Highlights,
		Risks:          engineResult.Risks,
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

	candidateRank := handlers.EducationRank(highest)
	requiredRank := handlers.EducationRank(required)

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
