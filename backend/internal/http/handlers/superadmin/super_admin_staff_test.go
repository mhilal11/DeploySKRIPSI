package superadmin

import (
	"testing"
	"time"

	"hris-backend/internal/models"
)

func TestTransformTerminations_DecodesChecklist(t *testing.T) {
	rows := []models.StaffTermination{
		{
			ID:            1,
			Reference:     "OFF-001",
			EmployeeName:  "Andi",
			Type:          "PHK",
			Status:        "Proses",
			Progress:      28,
			Checklist:     []byte(`{"Surat resign diterima":true,"Serah terima pekerjaan":false}`),
			RequestDate:   timePtrUTC("2026-02-01T00:00:00Z"),
			EffectiveDate: timePtrUTC("2026-02-20T00:00:00Z"),
		},
	}

	result := transformTerminations(rows)
	if len(result) != 1 {
		t.Fatalf("expected 1 row, got %d", len(result))
	}
	if result[0].Checklist == nil {
		t.Fatal("expected checklist to be decoded")
	}
	if result[0].Checklist["Surat resign diterima"] != true {
		t.Fatalf("expected checklist item to be true, got %#v", result[0].Checklist)
	}
	if result[0].Checklist["Serah terima pekerjaan"] != false {
		t.Fatalf("expected checklist item to be false, got %#v", result[0].Checklist)
	}
}

func timePtrUTC(raw string) *time.Time {
	value, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		panic(err)
	}
	return &value
}
