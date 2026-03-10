package superadmin

import (
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/http/handlers"
)

func highestEducationFromEntries(educations []map[string]any, fallback *string) string {
	highestRank := 0
	highest := ""

	for _, edu := range educations {
		level := normalizeEducationLevel(anyToString(edu["degree"]))
		rank := handlers.EducationRank(level)
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
		rank := handlers.EducationRank(level)
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
