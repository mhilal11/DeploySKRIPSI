package repository_test

import (
	"errors"
	repository "hris-backend/internal/repository"
	"regexp"
	"strings"
	"testing"
	"time"
)

func TestCountUsersByStatus_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("count users fail")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM users WHERE status = ?")).
		WithArgs("Active").
		WillReturnError(queryErr)

	_, err := repository.CountUsersByStatus(db, "Active")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "count users by status") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestCountApplicationsByDivisionBetween_NilDivisionErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("count applications fail")
	start := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 3, 31, 23, 59, 59, 0, time.UTC)

	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM applications WHERE division IS NULL AND submitted_at BETWEEN ? AND ?")).
		WithArgs(start, end).
		WillReturnError(queryErr)

	_, err := repository.CountApplicationsByDivisionBetween(db, nil, start, end)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "count applications by nil division between") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestListRecentLetters_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("list letters fail")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT * FROM surat ORDER BY tanggal_surat DESC LIMIT ?")).
		WithArgs(5).
		WillReturnError(queryErr)

	_, err := repository.ListRecentLetters(db, 5)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "list recent letters") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}
