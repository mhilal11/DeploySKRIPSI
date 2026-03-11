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

func TestCreateUser_Success(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	input := repository.CreateUserInput{
		EmployeeCode: "EMP-001",
		Name:         "Foo",
		Email:        "foo@example.com",
		Role:         "Staff",
		Division:     "IT",
		Status:       "Active",
		RegisteredAt: "2026-03-11",
		PasswordHash: "hash",
		Now:          now,
	}

	mock.ExpectExec("(?s)INSERT INTO users").
		WithArgs(
			input.EmployeeCode,
			input.Name,
			input.Email,
			input.Role,
			input.Division,
			input.Status,
			input.RegisteredAt,
			nil,
			input.PasswordHash,
			now,
			now,
		).
		WillReturnResult(lastInsertResult(99))

	userID, err := repository.CreateUser(db, input)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if userID != 99 {
		t.Fatalf("expected user id 99, got %d", userID)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestCreateUser_InsertErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	insertErr := errors.New("insert fail")
	input := repository.CreateUserInput{
		EmployeeCode: "EMP-001",
		Name:         "Foo",
		Email:        "foo@example.com",
		Role:         "Staff",
		Division:     "IT",
		Status:       "Active",
		RegisteredAt: "2026-03-11",
		PasswordHash: "hash",
		Now:          now,
	}

	mock.ExpectExec("(?s)INSERT INTO users").
		WillReturnError(insertErr)

	_, err := repository.CreateUser(db, input)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, insertErr) {
		t.Fatalf("expected wrapped insert error, got %v", err)
	}
	if !strings.Contains(err.Error(), "create user insert") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestCreateUser_LastInsertIDErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	lastInsertErr := errors.New("last insert id fail")
	input := repository.CreateUserInput{
		EmployeeCode: "EMP-001",
		Name:         "Foo",
		Email:        "foo@example.com",
		Role:         "Staff",
		Division:     "IT",
		Status:       "Active",
		RegisteredAt: "2026-03-11",
		PasswordHash: "hash",
		Now:          now,
	}

	mock.ExpectExec("(?s)INSERT INTO users").
		WillReturnResult(sqlmock.NewErrorResult(lastInsertErr))

	_, err := repository.CreateUser(db, input)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, lastInsertErr) {
		t.Fatalf("expected wrapped last insert id error, got %v", err)
	}
	if !strings.Contains(err.Error(), "create user last insert id") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestDeleteUserByID_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	execErr := errors.New("delete fail")
	mock.ExpectExec(regexp.QuoteMeta("DELETE FROM users WHERE id = ?")).
		WithArgs(int64(7)).
		WillReturnError(execErr)

	err := repository.DeleteUserByID(db, 7)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, execErr) {
		t.Fatalf("expected wrapped delete error, got %v", err)
	}
	if !strings.Contains(err.Error(), "delete user by id") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}
