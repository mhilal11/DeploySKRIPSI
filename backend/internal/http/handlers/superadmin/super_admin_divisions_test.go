package superadmin

import "testing"

func TestSanitizeEligibilityCriteria_ClampsAndNormalizes(t *testing.T) {
	input := map[string]interface{}{
		"min_age":                             10,
		"max_age":                             70,
		"min_experience_years":                "5",
		"gender":                              "Laki-laki",
		"min_education":                       "s1",
		"program_studies":                     []interface{}{" Teknik Informatika ", "Sistem Informasi", "teknik informatika", ""},
		"ineligible_penalty_per_failure":      99,
		"extra_penalty_after_failed_criteria": -2,
		"extra_penalty_score":                 "7.5",
		"scoring_weights": map[string]interface{}{
			"education":    40,
			"experience":   30,
			"skills":       30,
			"ai_screening": 15,
		},
		"scoring_thresholds": map[string]interface{}{
			"priority":    120,
			"recommended": 75,
			"consider":    -5,
		},
	}

	result := sanitizeEligibilityCriteria(input)

	if result["min_age"].(int) != 17 {
		t.Fatalf("expected min_age to clamp at 17, got %v", result["min_age"])
	}
	if result["max_age"].(int) != 65 {
		t.Fatalf("expected max_age to clamp at 65, got %v", result["max_age"])
	}
	if result["min_experience_years"].(int) != 5 {
		t.Fatalf("expected min_experience_years=5, got %v", result["min_experience_years"])
	}
	if result["min_education"].(string) != "S1" {
		t.Fatalf("expected min_education=S1, got %v", result["min_education"])
	}
	programs, ok := result["program_studies"].([]string)
	if !ok {
		t.Fatalf("expected program_studies []string, got %T", result["program_studies"])
	}
	if len(programs) != 2 || programs[0] != "Teknik Informatika" || programs[1] != "Sistem Informasi" {
		t.Fatalf("unexpected program_studies value: %#v", programs)
	}

	if result["ineligible_penalty_per_failure"].(float64) != 40 {
		t.Fatalf("expected penalty clamp to 40, got %v", result["ineligible_penalty_per_failure"])
	}
	if result["extra_penalty_after_failed_criteria"].(int) != 0 {
		t.Fatalf("expected extra_penalty_after_failed_criteria clamp to 0, got %v", result["extra_penalty_after_failed_criteria"])
	}

	thresholds := result["scoring_thresholds"].(map[string]float64)
	if thresholds["priority"] != 100 || thresholds["consider"] != 0 {
		t.Fatalf("expected thresholds clamp to [0..100], got %#v", thresholds)
	}
	weights := result["scoring_weights"].(map[string]float64)
	if weights["ai_screening"] != 15 {
		t.Fatalf("expected ai_screening weight=15, got %#v", weights["ai_screening"])
	}
}

func TestSanitizeEligibilityCriteria_DropsInvalidGender(t *testing.T) {
	input := map[string]interface{}{
		"gender": "Tidak Valid",
	}

	result := sanitizeEligibilityCriteria(input)
	if _, exists := result["gender"]; exists {
		t.Fatalf("expected invalid gender to be removed, got %v", result["gender"])
	}
}
