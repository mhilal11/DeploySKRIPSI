package repository_test

import (
	"database/sql"
	"errors"
	repository "hris-backend/internal/repository"
	"regexp"
	"strings"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
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

func TestUpsertOnboardingChecklist_UpdateExisting(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	mock.ExpectExec("UPDATE onboarding_checklists").
		WithArgs(1, 1, 1, int64(42)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err := repository.UpsertOnboardingChecklist(db, 42, 1, 1, 1)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
}

func TestUpsertOnboardingChecklist_InsertWhenMissing(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	mock.ExpectExec("UPDATE onboarding_checklists").
		WithArgs(1, 0, 1, int64(42)).
		WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectExec("INSERT INTO onboarding_checklists").
		WithArgs(int64(42), 1, 0, 1).
		WillReturnResult(sqlmock.NewResult(11, 1))

	err := repository.UpsertOnboardingChecklist(db, 42, 1, 0, 1)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
}

func TestGetOnboardingChecklistByApplicationID_UsesLatestRowOrder(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	rows := sqlmock.NewRows([]string{
		"id",
		"application_id",
		"contract_signed",
		"inventory_handover",
		"training_orientation",
		"created_at",
		"updated_at",
	}).AddRow(99, 42, 1, 1, 0, time.Now(), time.Now())

	mock.ExpectQuery(`(?s)SELECT \* FROM onboarding_checklists\s+WHERE application_id = \?\s+ORDER BY updated_at DESC, id DESC\s+LIMIT 1`).
		WithArgs(int64(42)).
		WillReturnRows(rows)

	checklist, err := repository.GetOnboardingChecklistByApplicationID(db, 42)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if checklist == nil {
		t.Fatalf("expected checklist, got nil")
	}
	if checklist.ID != 99 {
		t.Fatalf("expected ID 99, got %d", checklist.ID)
	}
}

func TestSetStaffAssignmentSelection_Success(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	mock.ExpectExec(regexp.QuoteMeta("UPDATE applications SET staff_assignment_selected = 0, updated_at = NOW() WHERE user_id = ? AND status = 'Hired'")).
		WithArgs(int64(7)).
		WillReturnResult(sqlmock.NewResult(0, 2))
	mock.ExpectExec(regexp.QuoteMeta("UPDATE applications SET staff_assignment_selected = 1, updated_at = NOW() WHERE id = ? AND user_id = ?")).
		WithArgs(int64(42), int64(7)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err := repository.SetStaffAssignmentSelection(db, 7, 42)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
}

func TestSetStaffAssignmentSelection_UnknownColumnIgnored(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	mock.ExpectExec(regexp.QuoteMeta("UPDATE applications SET staff_assignment_selected = 0, updated_at = NOW() WHERE user_id = ? AND status = 'Hired'")).
		WithArgs(int64(7)).
		WillReturnError(errors.New("Error 1054: Unknown column 'staff_assignment_selected' in 'field list'"))

	err := repository.SetStaffAssignmentSelection(db, 7, 42)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
}
