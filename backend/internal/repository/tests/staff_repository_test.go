package repository_test

import (
	"errors"
	repository "hris-backend/internal/repository"
	"regexp"
	"strings"
	"testing"
	"time"
)

func TestCountComplaintsByUserID_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("count fail")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM complaints WHERE user_id = ?")).
		WithArgs(int64(7)).
		WillReturnError(queryErr)

	_, err := repository.CountComplaintsByUserID(db, 7)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped count error, got %v", err)
	}
	if !strings.Contains(err.Error(), "count complaints by user id") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestInsertStaffComplaint_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	execErr := errors.New("insert fail")
	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	mock.ExpectExec("(?s)INSERT INTO complaints").
		WillReturnError(execErr)

	err := repository.InsertStaffComplaint(db, repository.StaffComplaintCreateInput{
		ComplaintCode: "CMP-001",
		UserID:        1,
		Category:      "Etika",
		Subject:       "Subjek",
		Description:   "Deskripsi",
		Status:        "Baru",
		Priority:      "Tinggi",
		SubmittedAt:   now,
		CreatedAt:     now,
		UpdatedAt:     now,
	})
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, execErr) {
		t.Fatalf("expected wrapped insert error, got %v", err)
	}
	if !strings.Contains(err.Error(), "insert staff complaint") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}
