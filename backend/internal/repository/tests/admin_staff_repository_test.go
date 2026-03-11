package repository_test

import (
	"database/sql"
	"errors"
	repository "hris-backend/internal/repository"
	"regexp"
	"strings"
	"testing"
	"time"
)

func TestCountDivisionInboxLetters_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	division := "IT"
	queryErr := errors.New("count query fail")

	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM surat WHERE current_recipient = 'division' AND (target_division = ? OR penerima = ?)")).
		WithArgs(&division, &division).
		WillReturnError(queryErr)

	_, err := repository.CountDivisionInboxLetters(db, &division)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "count division inbox letters") {
		t.Fatalf("expected contextual error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestGetSuratByID_NoRowsReturnsNil(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	mock.ExpectQuery(regexp.QuoteMeta("SELECT * FROM surat WHERE surat_id = ?")).
		WithArgs(int64(10)).
		WillReturnError(sql.ErrNoRows)

	row, err := repository.GetSuratByID(db, 10)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if row != nil {
		t.Fatalf("expected nil row, got %+v", row)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestGetSuratByID_QueryErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	getErr := errors.New("get surat fail")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT * FROM surat WHERE surat_id = ?")).
		WithArgs(int64(11)).
		WillReturnError(getErr)

	_, err := repository.GetSuratByID(db, 11)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, getErr) {
		t.Fatalf("expected wrapped get error, got %v", err)
	}
	if !strings.Contains(err.Error(), "get surat by id") {
		t.Fatalf("expected contextual error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestInsertAdminStaffLetter_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	execErr := errors.New("insert surat fail")
	input := repository.AdminStaffLetterCreateInput{
		UserID:       1,
		NomorSurat:   "001/IT/2026",
		JenisSurat:   "Internal",
		TanggalSurat: now,
		Perihal:      "Pengajuan",
		IsiSurat:     "Isi pengajuan",
		Kategori:     "Internal",
		Prioritas:    "Normal",
		Penerima:     "Admin HR",
		Now:          now,
	}

	mock.ExpectExec("(?s)INSERT INTO surat").
		WillReturnError(execErr)

	err := repository.InsertAdminStaffLetter(db, input)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, execErr) {
		t.Fatalf("expected wrapped insert error, got %v", err)
	}
	if !strings.Contains(err.Error(), "insert admin staff letter") {
		t.Fatalf("expected contextual error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestReplySuratToHRWithHistory_BeginErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	beginErr := errors.New("begin fail")
	nextTarget := "Finance"
	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)

	mock.ExpectBegin().WillReturnError(beginErr)

	err := repository.ReplySuratToHRWithHistory(db, 99, "ok", 7, now, &nextTarget, "IT")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, beginErr) {
		t.Fatalf("expected wrapped begin error, got %v", err)
	}
	if !strings.Contains(err.Error(), "begin reply surat tx") {
		t.Fatalf("expected contextual error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
