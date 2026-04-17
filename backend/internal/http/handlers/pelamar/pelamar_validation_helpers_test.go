package pelamar

import "testing"

func TestValidateExperienceRequired_RejectsEmptyList(t *testing.T) {
	t.Parallel()

	errs := validateExperienceRequired([]map[string]any{})
	if errs["experiences"] == "" {
		t.Fatal("expected base experiences error for empty list")
	}
}

func TestValidateCertificationRequired_RejectsEmptyList(t *testing.T) {
	t.Parallel()

	errs := validateCertificationRequired([]map[string]any{})
	if errs["certifications"] == "" {
		t.Fatal("expected base certifications error for empty list")
	}
}
