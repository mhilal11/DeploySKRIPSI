package handlers

import "testing"

func TestIsValidPersonName(t *testing.T) {
	t.Parallel()

	validNames := []string{
		"Ahmad Rizki",
		"Anne-Marie",
		"O'Connor",
		"Ni Made Lestari",
	}
	for _, name := range validNames {
		if !IsValidPersonName(name) {
			t.Fatalf("expected valid person name %q", name)
		}
	}

	invalidNames := []string{
		"Rizki123",
		"Ahmad_Rizki",
		"Jean--Paul",
		"'Rizki",
	}
	for _, name := range invalidNames {
		if IsValidPersonName(name) {
			t.Fatalf("expected invalid person name %q", name)
		}
	}
}

func TestNormalizePersonName(t *testing.T) {
	t.Parallel()

	got := NormalizePersonName("  Ahmad   Rizki  ")
	if got != "Ahmad Rizki" {
		t.Fatalf("expected normalized name %q, got %q", "Ahmad Rizki", got)
	}
}
