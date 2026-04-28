package superadmin

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
)

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
		return "Belum Memenuhi Skor Minimum"
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
