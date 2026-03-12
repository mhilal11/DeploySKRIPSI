package handlers

import (
	"testing"
	"time"
)

func TestFormatDateTime_ConvertsToConfiguredTimezone(t *testing.T) {
	original := currentDisplayLocation().String()
	t.Cleanup(func() {
		_ = SetDisplayLocation(original)
	})

	if err := SetDisplayLocation("Asia/Jakarta"); err != nil {
		t.Fatalf("set display location failed: %v", err)
	}

	utc := time.Date(2026, time.March, 12, 15, 4, 0, 0, time.UTC)
	got := FormatDateTime(&utc)
	want := "12 Mar 2026 22:04"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestFormatDateISO_ConvertsToConfiguredTimezone(t *testing.T) {
	original := currentDisplayLocation().String()
	t.Cleanup(func() {
		_ = SetDisplayLocation(original)
	})

	if err := SetDisplayLocation("Asia/Jakarta"); err != nil {
		t.Fatalf("set display location failed: %v", err)
	}

	utc := time.Date(2026, time.March, 12, 20, 30, 0, 0, time.UTC)
	got := FormatDateISO(&utc)
	want := "2026-03-13"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}
