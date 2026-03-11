package repository_test

import (
	"errors"
	repository "hris-backend/internal/repository"
	"regexp"
	"strings"
	"testing"
	"time"
)

func TestListApplicationsForScoring_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("select applications fail")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT * FROM applications WHERE status IN (?) ORDER BY submitted_at DESC, id ASC")).
		WithArgs("Applied").
		WillReturnError(queryErr)

	_, err := repository.ListApplicationsForScoring(db, []string{"Applied"})
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "list applications for scoring") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestPromoteApplicationToScreening_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	execErr := errors.New("update fail")
	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	mock.ExpectExec(regexp.QuoteMeta("UPDATE applications SET status = 'Screening', screening_at = IFNULL(screening_at, ?), updated_at = ? WHERE id = ? AND status = 'Applied'")).
		WithArgs(now, now, int64(99)).
		WillReturnError(execErr)

	_, err := repository.PromoteApplicationToScreening(db, 99, now)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, execErr) {
		t.Fatalf("expected wrapped update error, got %v", err)
	}
	if !strings.Contains(err.Error(), "promote application to screening") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestInsertRecruitmentScoringAudit_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	execErr := errors.New("insert audit fail")
	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	mock.ExpectExec("(?s)INSERT INTO recruitment_scoring_audits").
		WillReturnError(execErr)

	err := repository.InsertRecruitmentScoringAudit(db, nil, "promote", "IT", "Programmer", nil, now)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, execErr) {
		t.Fatalf("expected wrapped insert error, got %v", err)
	}
	if !strings.Contains(err.Error(), "insert recruitment scoring audit") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}
