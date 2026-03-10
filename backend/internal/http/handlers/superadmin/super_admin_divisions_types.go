package superadmin

import (
	"strconv"
	"strings"
)

type OpenJobRequest struct {
	JobID                  *int64                 `json:"job_id" form:"job_id"`
	JobTitle               string                 `json:"job_title" form:"job_title"`
	JobDescription         string                 `json:"job_description" form:"job_description"`
	JobRequirements        []string               `json:"job_requirements" form:"job_requirements"`
	JobEligibilityCriteria map[string]interface{} `json:"job_eligibility_criteria" form:"job_eligibility_criteria"`
}

type CreateDivisionRequest struct {
	Name        string  `json:"name" form:"name"`
	Description *string `json:"description" form:"description"`
	ManagerName *string `json:"manager_name" form:"manager_name"`
	Capacity    *int    `json:"capacity" form:"capacity"`
}

type UpdateDivisionRequest struct {
	Description *string `json:"description" form:"description"`
	ManagerName *string `json:"manager_name" form:"manager_name"`
	Capacity    *int    `json:"capacity" form:"capacity"`
}

func sanitizeEligibilityCriteria(input map[string]interface{}) map[string]interface{} {
	out := make(map[string]interface{})
	if input == nil {
		return out
	}

	setIntRange := func(key string, minValue, maxValue int) {
		if value, ok := parseAnyInt(input[key]); ok {
			if value < minValue {
				value = minValue
			}
			if value > maxValue {
				value = maxValue
			}
			out[key] = value
		}
	}

	setIntRange("min_age", 17, 65)
	setIntRange("max_age", 17, 65)
	setIntRange("min_experience_years", 0, 40)

	if minAge, hasMin := out["min_age"].(int); hasMin {
		if maxAge, hasMax := out["max_age"].(int); hasMax && maxAge < minAge {
			out["max_age"] = minAge
		}
	}

	if rawGender, ok := input["gender"]; ok {
		gender := strings.TrimSpace(rawToString(rawGender))
		if gender == "Laki-laki" || gender == "Perempuan" {
			out["gender"] = gender
		}
	}

	if rawEducation, ok := input["min_education"]; ok {
		education := strings.ToUpper(strings.TrimSpace(rawToString(rawEducation)))
		if education == "SMA" || education == "SMK" || education == "D1" || education == "D2" || education == "D3" || education == "D4" || education == "S1" || education == "S2" || education == "S3" {
			out["min_education"] = education
		}
	}

	if programs := parseStringArray(input["program_studies"], input["study_programs"], input["program_study"]); len(programs) > 0 {
		out["program_studies"] = programs
	}

	if rawWeights, ok := input["scoring_weights"]; ok {
		if weightsMap := mapStringAny(rawWeights); len(weightsMap) > 0 {
			weights := map[string]float64{}
			assignWeight := func(targetKey string, sourceKeys ...string) {
				for _, sourceKey := range sourceKeys {
					if value, exists := parseAnyFloat(weightsMap[sourceKey]); exists {
						if value < 0 {
							value = 0
						}
						if value > 100 {
							value = 100
						}
						weights[targetKey] = value
						return
					}
				}
			}

			assignWeight("education", "education", "edu")
			assignWeight("experience", "experience", "exp")
			assignWeight("skills", "skills", "skill")
			assignWeight("certification", "certification", "certifications", "cert")
			assignWeight("profile", "profile", "profile_completeness", "completeness")
			assignWeight("ai_screening", "ai_screening", "ai", "ai_cv", "cv_ai", "cv_screening")

			if len(weights) > 0 {
				out["scoring_weights"] = weights
			}
		}
	}

	if rawThresholds, ok := input["scoring_thresholds"]; ok {
		if thresholdMap := mapStringAny(rawThresholds); len(thresholdMap) > 0 {
			thresholds := map[string]float64{}
			assignThreshold := func(targetKey string, sourceKeys ...string) {
				for _, sourceKey := range sourceKeys {
					if value, exists := parseAnyFloat(thresholdMap[sourceKey]); exists {
						if value < 0 {
							value = 0
						}
						if value > 100 {
							value = 100
						}
						thresholds[targetKey] = value
						return
					}
				}
			}
			assignThreshold("priority", "priority", "priority_high")
			assignThreshold("recommended", "recommended")
			assignThreshold("consider", "consider")

			if len(thresholds) > 0 {
				out["scoring_thresholds"] = thresholds
			}
		}
	}

	if value, ok := parseAnyFloat(input["ineligible_penalty_per_failure"]); ok {
		if value < 0 {
			value = 0
		}
		if value > 40 {
			value = 40
		}
		out["ineligible_penalty_per_failure"] = value
	}

	if value, ok := parseAnyInt(input["extra_penalty_after_failed_criteria"]); ok {
		if value < 0 {
			value = 0
		}
		if value > 10 {
			value = 10
		}
		out["extra_penalty_after_failed_criteria"] = value
	}

	if value, ok := parseAnyFloat(input["extra_penalty_score"]); ok {
		if value < 0 {
			value = 0
		}
		if value > 40 {
			value = 40
		}
		out["extra_penalty_score"] = value
	}

	return out
}

func normalizeOptionalText(value *string) *string {
	if value == nil {
		return nil
	}
	clean := strings.TrimSpace(*value)
	if clean == "" {
		return nil
	}
	return &clean
}

func rawToString(value interface{}) string {
	switch v := value.(type) {
	case string:
		return v
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case int:
		return strconv.Itoa(v)
	default:
		return ""
	}
}

func parseAnyInt(value interface{}) (int, bool) {
	switch v := value.(type) {
	case int:
		return v, true
	case int64:
		return int(v), true
	case float64:
		return int(v), true
	case string:
		v = strings.TrimSpace(v)
		if v == "" {
			return 0, false
		}
		if parsed, err := strconv.Atoi(v); err == nil {
			return parsed, true
		}
		if parsed, err := strconv.ParseFloat(strings.ReplaceAll(v, ",", "."), 64); err == nil {
			return int(parsed), true
		}
	}
	return 0, false
}

func parseAnyFloat(value interface{}) (float64, bool) {
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
		v = strings.TrimSpace(v)
		if v == "" {
			return 0, false
		}
		if parsed, err := strconv.ParseFloat(strings.ReplaceAll(v, ",", "."), 64); err == nil {
			return parsed, true
		}
	}
	return 0, false
}

func mapStringAny(value interface{}) map[string]interface{} {
	switch data := value.(type) {
	case map[string]interface{}:
		return data
	default:
		return nil
	}
}

func parseStringArray(values ...interface{}) []string {
	seen := map[string]struct{}{}
	out := []string{}

	add := func(raw string) {
		cleaned := strings.TrimSpace(raw)
		if cleaned == "" {
			return
		}
		key := strings.ToLower(cleaned)
		if _, exists := seen[key]; exists {
			return
		}
		seen[key] = struct{}{}
		out = append(out, cleaned)
	}

	for _, value := range values {
		switch v := value.(type) {
		case []string:
			for _, item := range v {
				add(item)
			}
		case []interface{}:
			for _, item := range v {
				add(rawToString(item))
			}
		case string:
			normalized := strings.NewReplacer("\n", ",", ";", ",", "|", ",").Replace(v)
			for _, part := range strings.Split(normalized, ",") {
				add(part)
			}
		}
	}

	if len(out) > 10 {
		return out[:10]
	}
	return out
}
