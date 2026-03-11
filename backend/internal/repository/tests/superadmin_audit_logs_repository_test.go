package repository_test

import (
	"errors"
	repository "hris-backend/internal/repository"
	"regexp"
	"strings"
	"testing"
)

func TestCountAuditLogs_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("count fail")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM audit_logs al")).
		WillReturnError(queryErr)

	_, err := repository.CountAuditLogs(db, repository.AuditLogFilters{})
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped count error, got %v", err)
	}
	if !strings.Contains(err.Error(), "count audit logs") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestListExistingAuditLogIDs_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("select ids fail")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT id FROM audit_logs WHERE id IN (?, ?)")).
		WithArgs(int64(1), int64(2)).
		WillReturnError(queryErr)

	_, err := repository.ListExistingAuditLogIDs(db, []int64{1, 2})
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped select error, got %v", err)
	}
	if !strings.Contains(err.Error(), "list existing audit log ids") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestUpsertAuditLogView_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	execErr := errors.New("upsert fail")
	mock.ExpectExec("(?s)INSERT INTO audit_log_views").
		WithArgs(int64(7), int64(3)).
		WillReturnError(execErr)

	err := repository.UpsertAuditLogView(db, 7, 3)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, execErr) {
		t.Fatalf("expected wrapped upsert error, got %v", err)
	}
	if !strings.Contains(err.Error(), "upsert audit log view") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}
