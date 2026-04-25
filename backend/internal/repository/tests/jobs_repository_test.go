package repository_test

import (
	"regexp"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	dbrepo "hris-backend/internal/repository"
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

func TestAcquireExpiringLockInsertsWhenMissing(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta("SELECT owner, expiration FROM cache_locks WHERE `key` = ? FOR UPDATE")).
		WithArgs("recruitment_ai_screening_worker").
		WillReturnRows(sqlmock.NewRows([]string{"owner", "expiration"}))
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO cache_locks (`key`, owner, expiration) VALUES (?, ?, ?)")).
		WithArgs("recruitment_ai_screening_worker", "worker-1", sqlmock.AnyArg()).
		WillReturnResult(lastInsertResult(1))
	mock.ExpectCommit()

	acquired, err := dbrepo.AcquireExpiringLock(db, "recruitment_ai_screening_worker", "worker-1", 2*time.Minute)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if !acquired {
		t.Fatalf("expected lock acquired")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestReleaseExpiringLock(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	mock.ExpectExec(regexp.QuoteMeta("DELETE FROM cache_locks WHERE `key` = ? AND owner = ?")).
		WithArgs("recruitment_ai_screening_worker", "worker-1").
		WillReturnResult(lastInsertResult(0))

	if err := dbrepo.ReleaseExpiringLock(db, "recruitment_ai_screening_worker", "worker-1"); err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestFindQueuedApplicationJobIndex(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	rows := sqlmock.NewRows([]string{"id", "queue", "payload", "attempts", "reserved_at", "available_at", "created_at"}).
		AddRow(11, "recruitment_ai_screening", `{"application_id":101,"actor_user_id":9}`, 0, nil, time.Now().Unix(), time.Now().Unix()).
		AddRow(12, "recruitment_ai_screening", `{"application_id":202,"actor_user_id":9}`, 2, time.Now().Unix(), time.Now().Unix(), time.Now().Unix())
	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, queue, payload, attempts, reserved_at, available_at, created_at FROM jobs WHERE queue = ? ORDER BY id ASC")).
		WithArgs("recruitment_ai_screening").
		WillReturnRows(rows)

	index, err := dbrepo.FindQueuedApplicationJobIndex(db, "recruitment_ai_screening", []int64{202, 303})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(index) != 1 {
		t.Fatalf("expected 1 queued job, got %d", len(index))
	}
	if index[202].ID != 12 {
		t.Fatalf("expected job id 12 for application 202, got %+v", index[202])
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
