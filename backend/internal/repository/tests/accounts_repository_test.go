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

func TestUpdateUser_WithoutEmployeeCode_DoesNotTouchEmployeeCode(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 4, 30, 8, 0, 0, 0, time.UTC)
	input := repository.UpdateUserInput{
		ID:           7,
		Name:         "Bar",
		Email:        "bar@example.com",
		Role:         "Admin",
		Division:     "HR",
		Status:       "Active",
		RegisteredAt: "2026-04-30",
		Now:          now,
	}

	mock.ExpectExec(regexp.QuoteMeta("UPDATE users SET name = ?, email = ?, role = ?, division = ?, status = ?, registered_at = ?, inactive_at = ?, updated_at = ? WHERE id = ?")).
		WithArgs(
			input.Name,
			input.Email,
			input.Role,
			input.Division,
			input.Status,
			input.RegisteredAt,
			nil,
			now,
			input.ID,
		).
		WillReturnResult(sqlmock.NewResult(0, 1))

	if err := repository.UpdateUser(db, input); err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestUpdateUser_WithEmployeeCode_UpdatesEmployeeCode(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 4, 30, 9, 0, 0, 0, time.UTC)
	employeeCode := "ADM002"
	inactiveAt := "2026-05-01"
	input := repository.UpdateUserInput{
		ID:           9,
		EmployeeCode: &employeeCode,
		Name:         "Baz",
		Email:        "baz@example.com",
		Role:         "Admin",
		Division:     "Finance",
		Status:       "Inactive",
		RegisteredAt: "2026-04-30",
		InactiveAt:   &inactiveAt,
		Now:          now,
	}

	mock.ExpectExec(regexp.QuoteMeta("UPDATE users SET name = ?, email = ?, role = ?, division = ?, status = ?, registered_at = ?, inactive_at = ?, updated_at = ?, employee_code = ? WHERE id = ?")).
		WithArgs(
			input.Name,
			input.Email,
			input.Role,
			input.Division,
			input.Status,
			input.RegisteredAt,
			*input.InactiveAt,
			now,
			employeeCode,
			input.ID,
		).
		WillReturnResult(sqlmock.NewResult(0, 1))

	if err := repository.UpdateUser(db, input); err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
