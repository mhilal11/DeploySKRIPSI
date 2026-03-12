package repository_test

import (
	"regexp"
	"testing"
	"time"

	dbrepo "hris-backend/internal/repository"
	sqlmock "github.com/DATA-DOG/go-sqlmock"
)

func TestEnqueueJob(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO jobs (queue, payload, attempts, reserved_at, available_at, created_at) VALUES (?, ?, 0, NULL, ?, ?)")).
		WithArgs("recruitment_ai_screening", `{"application_id":1}`, sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnResult(lastInsertResult(7))

	id, err := dbrepo.EnqueueJob(db, "recruitment_ai_screening", `{"application_id":1}`, time.Now())
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if id != 7 {
		t.Fatalf("expected id 7, got %d", id)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
