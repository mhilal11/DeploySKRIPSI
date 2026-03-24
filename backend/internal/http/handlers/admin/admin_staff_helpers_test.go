package admin

import (
	"testing"
	"time"

	"hris-backend/internal/models"
)

func TestBuildMailFlowSeries(t *testing.T) {
	division := "Finance"
	userID := int64(9)
	now := time.Date(2026, time.March, 24, 10, 0, 0, 0, time.UTC)

	incomingDate := time.Date(2026, time.March, 4, 8, 0, 0, 0, time.UTC)
	outgoingDate := time.Date(2026, time.February, 11, 9, 0, 0, 0, time.UTC)
	archivedDate := time.Date(2026, time.January, 18, 11, 0, 0, 0, time.UTC)
	targetDivision := division
	previousDivision := division

	series := buildMailFlowSeries([]models.Surat{
		{
			SuratID:           1,
			UserID:            3,
			TargetDivision:    &targetDivision,
			StatusPersetujuan: "Didisposisi",
			DisposedAt:        &incomingDate,
			CreatedAt:         &incomingDate,
		},
		{
			SuratID:           2,
			UserID:            userID,
			Penerima:          "Admin HR",
			StatusPersetujuan: "Menunggu HR",
			CreatedAt:         &outgoingDate,
		},
		{
			SuratID:           3,
			UserID:            5,
			PreviousDivision:  &previousDivision,
			StatusPersetujuan: "Diarsipkan",
			UpdatedAt:         &archivedDate,
			CreatedAt:         &archivedDate,
		},
	}, &division, userID, now)

	if len(series) != 6 {
		t.Fatalf("expected 6 series rows, got %d", len(series))
	}

	indexByMonth := make(map[string]map[string]any, len(series))
	for _, item := range series {
		month, _ := item["month"].(string)
		indexByMonth[month] = item
	}

	march := indexByMonth["2026-03"]
	if march == nil || march["incoming"] != 1 {
		t.Fatalf("expected March incoming to be 1, got %#v", march)
	}

	february := indexByMonth["2026-02"]
	if february == nil || february["outgoing"] != 1 {
		t.Fatalf("expected February outgoing to be 1, got %#v", february)
	}

	january := indexByMonth["2026-01"]
	if january == nil || january["archived"] != 1 {
		t.Fatalf("expected January archived to be 1, got %#v", january)
	}
}
