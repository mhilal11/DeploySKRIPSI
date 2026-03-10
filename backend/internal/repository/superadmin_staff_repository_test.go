package db

import (
	"regexp"
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

	err := UpdateStaffTerminationAndDeactivateIfCompleted(db, 9, "Selesai", "done", checklist, 100, &userID, now)
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

	err := UpdateStaffTerminationAndDeactivateIfCompleted(db, 9, "Proses", "ongoing", checklist, 50, nil, now)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
