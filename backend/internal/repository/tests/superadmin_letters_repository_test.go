package repository_test

import (
	"errors"
	repository "hris-backend/internal/repository"
	"regexp"
	"strings"
	"testing"
	"time"
)

func TestListSuratByFilters_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("list fail")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT * FROM surat WHERE (nomor_surat LIKE ? OR perihal LIKE ? OR penerima LIKE ?) AND kategori = ? ORDER BY COALESCE(updated_at, reply_at, disposed_at, tanggal_surat, created_at) DESC, surat_id DESC LIMIT ? OFFSET ?")).
		WithArgs("%memo%", "%memo%", "%memo%", "Internal", 200, 0).
		WillReturnError(queryErr)

	_, err := repository.ListSuratByFilters(db, repository.SuratListFilters{
		Search:   "memo",
		Category: "Internal",
	})
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "list surat by filters") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestUpdateSuratDispositionToDivision_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	execErr := errors.New("update fail")
	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)

	mock.ExpectExec(regexp.QuoteMeta("UPDATE surat SET current_recipient='division', penerima=?, status_persetujuan='Didisposisi', disposition_note=?, disposed_by=?, disposed_at=?, updated_at=? WHERE surat_id=?")).
		WithArgs("IT", "ok", int64(2), now, now, int64(11)).
		WillReturnError(execErr)

	err := repository.UpdateSuratDispositionToDivision(db, 11, "IT", "ok", 2, now)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, execErr) {
		t.Fatalf("expected wrapped update error, got %v", err)
	}
	if !strings.Contains(err.Error(), "update surat disposition to division") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestBulkDispositionLetters_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	execErr := errors.New("bulk update fail")
	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)

	mock.ExpectExec(regexp.QuoteMeta("UPDATE surat SET current_recipient='division', penerima=COALESCE(target_division,penerima), status_persetujuan='Didisposisi', disposition_note=?, disposed_by=?, disposed_at=?, updated_at=? WHERE surat_id=?")).
		WithArgs("note", int64(3), now, now, int64(101)).
		WillReturnError(execErr)

	err := repository.BulkDispositionLetters(db, []int64{101, 102}, "note", 3, now)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, execErr) {
		t.Fatalf("expected wrapped bulk error, got %v", err)
	}
	if !strings.Contains(err.Error(), "bulk disposition letters update") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}
