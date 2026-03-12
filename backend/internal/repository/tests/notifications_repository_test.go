package repository_test

import (
	"errors"
	repository "hris-backend/internal/repository"
	"strings"
	"testing"
)

func TestCountPendingHRLetters_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("count pending hr letters fail")
	mock.ExpectQuery("(?s)SELECT COUNT\\(\\*\\) FROM surat").
		WillReturnError(queryErr)

	_, err := repository.CountPendingHRLetters(db)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "count pending hr letters") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestListUnreadAuditLogs_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("list unread logs fail")
	mock.ExpectQuery("(?s)SELECT id, module, action, entity_type, entity_id, description, created_at\\s+FROM audit_logs").
		WithArgs(int64(9)).
		WillReturnError(queryErr)

	_, err := repository.ListUnreadAuditLogs(db, 9)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "list unread audit logs") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestListUnifiedNotificationsPaged_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("unified notification query fail")
	mock.ExpectQuery("(?s)SELECT id, type, title, description, url, created_at\\s+FROM \\(").
		WithArgs(int64(17), 5, 10).
		WillReturnError(queryErr)

	_, err := repository.ListUnifiedNotificationsPaged(db, 17, 5, 10)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "list unified notifications paged") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}
