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

func TestListRecruitmentApplications_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("select applications fail")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT * FROM applications ORDER BY submitted_at DESC")).
		WillReturnError(queryErr)

	_, err := repository.ListRecruitmentApplications(db)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "list recruitment applications") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestGetRecruitmentApplicationStatusState_NoRowsReturnsNil(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, status, rejection_reason, position, division FROM applications WHERE id = ?")).
		WithArgs(int64(10)).
		WillReturnError(sql.ErrNoRows)

	row, err := repository.GetRecruitmentApplicationStatusState(db, 10)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if row != nil {
		t.Fatalf("expected nil row, got %+v", row)
	}
}

func TestUpdateRecruitmentApplicationStatus_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	execErr := errors.New("update fail")
	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)

	mock.ExpectExec("UPDATE applications SET").
		WillReturnError(execErr)

	err := repository.UpdateRecruitmentApplicationStatus(db, 99, "Interview", "", now)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, execErr) {
		t.Fatalf("expected wrapped update error, got %v", err)
	}
	if !strings.Contains(err.Error(), "update recruitment application status") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestListRecruitmentSLASettings_MissingTableReturnsEmpty(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	mock.ExpectQuery(regexp.QuoteMeta("SELECT stage, target_days FROM recruitment_sla_settings")).
		WillReturnError(errors.New("Error 1146: Table 'hris.recruitment_sla_settings' doesn't exist"))

	rows, err := repository.ListRecruitmentSLASettings(db)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if len(rows) != 0 {
		t.Fatalf("expected empty rows, got %d", len(rows))
	}
}
