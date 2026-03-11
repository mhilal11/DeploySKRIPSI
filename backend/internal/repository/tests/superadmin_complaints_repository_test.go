package repository_test

import (
	"database/sql"
	"errors"
	repository "hris-backend/internal/repository"
	"regexp"
	"strings"
	"testing"
)

func TestGetComplaintByID_NoRowsReturnsNil(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	mock.ExpectQuery(regexp.QuoteMeta("SELECT * FROM complaints WHERE id = ?")).
		WithArgs(int64(5)).
		WillReturnError(sql.ErrNoRows)

	row, err := repository.GetComplaintByID(db, 5)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if row != nil {
		t.Fatalf("expected nil row, got %+v", row)
	}
}

func TestGetComplaintByID_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("get complaint fail")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT * FROM complaints WHERE id = ?")).
		WithArgs(int64(6)).
		WillReturnError(queryErr)

	_, err := repository.GetComplaintByID(db, 6)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "get complaint by id") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestUpdateComplaint_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	execErr := errors.New("update fail")
	mock.ExpectExec(regexp.QuoteMeta("UPDATE complaints SET status = ?, priority = ?, resolution_notes = ?, handled_by_id = ?, resolved_at = ? WHERE id = ?")).
		WithArgs("Resolved", "High", "done", int64(1), nil, int64(7)).
		WillReturnError(execErr)

	err := repository.UpdateComplaint(db, repository.ComplaintUpdateInput{
		ID:              7,
		Status:          "Resolved",
		Priority:        "High",
		ResolutionNotes: "done",
		HandledByID:     1,
	})
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, execErr) {
		t.Fatalf("expected wrapped update error, got %v", err)
	}
	if !strings.Contains(err.Error(), "update complaint") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}
