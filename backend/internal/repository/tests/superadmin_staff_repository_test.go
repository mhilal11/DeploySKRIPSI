package repository_test

import (
	"errors"
	repository "hris-backend/internal/repository"
	"regexp"
	"strings"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
)

func TestUpdateStaffTerminationAndDeactivateIfCompleted_Selesai(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	checklist := map[string]bool{"a": true}
	userID := int64(123)

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("UPDATE staff_terminations SET status = ?, notes = ?, checklist = ?, progress = ?, updated_at = ? WHERE id = ?")).
		WithArgs("Selesai", "done", sqlmock.AnyArg(), 100, now, int64(9)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta("UPDATE users SET status = 'Inactive', inactive_at = ? WHERE id = ?")).
		WithArgs(now, userID).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repository.UpdateStaffTerminationAndDeactivateIfCompleted(db, 9, "Selesai", "done", checklist, 100, &userID, now)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestUpdateStaffTerminationAndDeactivateIfCompleted_ProsesNoDeactivate(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	checklist := map[string]bool{"a": false}

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("UPDATE staff_terminations SET status = ?, notes = ?, checklist = ?, progress = ?, updated_at = ? WHERE id = ?")).
		WithArgs("Proses", "ongoing", sqlmock.AnyArg(), 50, now, int64(9)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repository.UpdateStaffTerminationAndDeactivateIfCompleted(db, 9, "Proses", "ongoing", checklist, 50, nil, now)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestGetUserByEmployeeCode_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("get user fail")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT * FROM users WHERE employee_code = ?")).
		WithArgs("EMP-001").
		WillReturnError(queryErr)

	_, err := repository.GetUserByEmployeeCode(db, "EMP-001")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "get user by employee code") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}
