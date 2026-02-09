package educationreference

import (
	"testing"
	"time"
)

func TestBuildFromBANPTRowsNormalizesAndDeduplicates(t *testing.T) {
	rows := [][]string{
		{"001020 - 001020 - Universitas Jambi", "Teknik Informatika (Kampus Kota Bogor)"},
		{"Universitas Jambi", "Teknik Informatika Kampus Kota Bogor"},
		{"Universitas Jambi", " Sistem Informasi "},
		{"AKADEMI ANALIS FARMASI &amp; PUTERA INDONESIA, MALANG", "Farmasi"},
		{"", "Farmasi"},
		{"Universitas Jambi", ""},
	}

	snapshot := BuildFromBANPTRows(rows, time.Date(2026, 2, 9, 8, 0, 0, 0, time.UTC))
	if len(snapshot.Institutions) != 2 {
		t.Fatalf("expected 2 institutions, got %d", len(snapshot.Institutions))
	}

	first := snapshot.Institutions[0]
	if first.Institution != "AKADEMI ANALIS FARMASI & PUTERA INDONESIA" {
		t.Fatalf("unexpected first institution: %s", first.Institution)
	}

	second := snapshot.Institutions[1]
	if second.Institution != "Universitas Jambi" {
		t.Fatalf("unexpected second institution: %s", second.Institution)
	}
	if len(second.Programs) != 2 {
		t.Fatalf("expected 2 unique programs for Universitas Jambi, got %d", len(second.Programs))
	}
	if second.Programs[0] != "Sistem Informasi" || second.Programs[1] != "Teknik Informatika" {
		t.Fatalf("unexpected programs for Universitas Jambi: %#v", second.Programs)
	}
}

func TestBuildFromBANPTRowsMergesInstitutionLocationVariants(t *testing.T) {
	rows := [][]string{
		{"UNIVERSITAS GALUH, CIAMIS", "Teknologi Informasi (Kampus Kota Surabaya)"},
		{"Universitas Galuh", "Teknologi Informasi"},
		{"Universitas Galuh Ciamis", "Teknologi Informasi Kampus Kota Bogor"},
		{"Universitas Galuh", "Teknologi Informasi Universitas Galuh"},
		{"Universitas Galuh", "Teknologi Informasi K. Kab. Ciamis"},
	}

	snapshot := BuildFromBANPTRows(rows, time.Date(2026, 2, 9, 8, 0, 0, 0, time.UTC))
	if len(snapshot.Institutions) != 1 {
		t.Fatalf("expected 1 institution, got %d", len(snapshot.Institutions))
	}

	inst := snapshot.Institutions[0]
	if inst.Institution != "Universitas Galuh" {
		t.Fatalf("unexpected institution: %s", inst.Institution)
	}
	if len(inst.Programs) != 1 {
		t.Fatalf("expected 1 program, got %d", len(inst.Programs))
	}
	if inst.Programs[0] != "Teknologi Informasi" {
		t.Fatalf("unexpected program: %s", inst.Programs[0])
	}
}

func TestBuildFromBANPTRowsRemovesInstitutionAndRegionNoiseInProgram(t *testing.T) {
	rows := [][]string{
		{"Universitas Test", "Pendidikan Profesi Guru (IAIN Sultan Amai Gorontalo)"},
		{"Universitas Test", "Teknik Informatika K, Kab Kapuas Hulu"},
		{"Universitas Test", "Kota Surabaya"},
	}

	snapshot := BuildFromBANPTRows(rows, time.Date(2026, 2, 9, 8, 0, 0, 0, time.UTC))
	if len(snapshot.Institutions) != 1 {
		t.Fatalf("expected 1 institution, got %d", len(snapshot.Institutions))
	}
	inst := snapshot.Institutions[0]

	expected := map[string]bool{
		"Pendidikan Profesi Guru": true,
		"Teknik Informatika":      true,
	}

	if len(inst.Programs) != len(expected) {
		t.Fatalf("unexpected program count: %#v", inst.Programs)
	}

	for _, program := range inst.Programs {
		if !expected[program] {
			t.Fatalf("unexpected program: %s", program)
		}
	}
}
