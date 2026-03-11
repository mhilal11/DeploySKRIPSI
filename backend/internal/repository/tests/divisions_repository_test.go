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

func TestCreateDivisionProfile_InsertErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	insertErr := errors.New("insert division profile fail")
	input := repository.CreateDivisionProfileInput{
		Name:     "IT",
		Capacity: 10,
		Now:      now,
	}

	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO division_profiles (name, description, manager_name, capacity, is_hiring, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)")).
		WithArgs(input.Name, input.Description, input.ManagerName, input.Capacity, now, now).
		WillReturnError(insertErr)

	_, err := repository.CreateDivisionProfile(db, input)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, insertErr) {
		t.Fatalf("expected wrapped insert error, got %v", err)
	}
	if !strings.Contains(err.Error(), "create division profile insert") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestCreateDivisionProfile_LastInsertIDErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	lastInsertErr := errors.New("last insert id fail")
	input := repository.CreateDivisionProfileInput{
		Name:     "IT",
		Capacity: 10,
		Now:      now,
	}

	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO division_profiles (name, description, manager_name, capacity, is_hiring, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)")).
		WithArgs(input.Name, input.Description, input.ManagerName, input.Capacity, now, now).
		WillReturnResult(sqlmock.NewErrorResult(lastInsertErr))

	_, err := repository.CreateDivisionProfile(db, input)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, lastInsertErr) {
		t.Fatalf("expected wrapped last insert id error, got %v", err)
	}
	if !strings.Contains(err.Error(), "create division profile last insert id") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestCountActiveDivisionUsers_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("count active users fail")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM users WHERE division = ? AND role IN (?, ?)")).
		WithArgs("IT", "Admin", "Staff").
		WillReturnError(queryErr)

	_, err := repository.CountActiveDivisionUsers(db, "IT")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "count active division users") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestListActiveDivisionJobs_MissingTableReturnsEmpty(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	mock.ExpectQuery(regexp.QuoteMeta("SELECT * FROM division_jobs WHERE is_active = 1 ORDER BY opened_at DESC, id DESC")).
		WillReturnError(errors.New("Table 'hris.division_jobs' doesn't exist"))

	rows, err := repository.ListActiveDivisionJobs(db)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if len(rows) != 0 {
		t.Fatalf("expected empty rows, got %d", len(rows))
	}
}

func TestListActiveDivisionJobs_QueryErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("select fail")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT * FROM division_jobs WHERE is_active = 1 ORDER BY opened_at DESC, id DESC")).
		WillReturnError(queryErr)

	_, err := repository.ListActiveDivisionJobs(db)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "list active division jobs") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}
