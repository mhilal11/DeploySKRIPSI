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

func TestSavePasswordResetToken_Success(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("DELETE FROM password_reset_tokens WHERE email = ?")).
		WithArgs("foo@example.com").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO password_reset_tokens (email, token, created_at) VALUES (?, ?, ?)")).
		WithArgs("foo@example.com", "token-123", now).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repository.SavePasswordResetToken(db, "foo@example.com", "token-123", now)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestSavePasswordResetToken_InsertFailRollback(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	insertErr := errors.New("insert fail")

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("DELETE FROM password_reset_tokens WHERE email = ?")).
		WithArgs("foo@example.com").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO password_reset_tokens (email, token, created_at) VALUES (?, ?, ?)")).
		WithArgs("foo@example.com", "token-123", now).
		WillReturnError(insertErr)
	mock.ExpectRollback()

	err := repository.SavePasswordResetToken(db, "foo@example.com", "token-123", now)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, insertErr) {
		t.Fatalf("expected wrapped insert error, got %v", err)
	}
	if !strings.Contains(err.Error(), "insert password reset token") {
		t.Fatalf("expected contextual error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestCreatePelamarUserWithProfile_Success(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)

	mock.ExpectBegin()
	mock.ExpectExec("(?s)INSERT INTO users").
		WithArgs("EMP-001", "Foo", "foo@example.com", "Pelamar", now.Format("2006-01-02"), nil, "hash", now, now).
		WillReturnResult(lastInsertResult(42))
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO applicant_profiles (user_id, full_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")).
		WithArgs(int64(42), "Foo", "foo@example.com", now, now).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	userID, err := repository.CreatePelamarUserWithProfile(db, "EMP-001", "Foo", "foo@example.com", "hash", now, nil, now)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if userID != 42 {
		t.Fatalf("expected user id 42, got %d", userID)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestCreatePelamarUserWithProfile_ProfileInsertFailRollback(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	profileErr := errors.New("profile insert fail")

	mock.ExpectBegin()
	mock.ExpectExec("(?s)INSERT INTO users").
		WithArgs("EMP-001", "Foo", "foo@example.com", "Pelamar", now.Format("2006-01-02"), nil, "hash", now, now).
		WillReturnResult(lastInsertResult(42))
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO applicant_profiles (user_id, full_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")).
		WithArgs(int64(42), "Foo", "foo@example.com", now, now).
		WillReturnError(profileErr)
	mock.ExpectRollback()

	_, err := repository.CreatePelamarUserWithProfile(db, "EMP-001", "Foo", "foo@example.com", "hash", now, nil, now)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, profileErr) {
		t.Fatalf("expected wrapped profile error, got %v", err)
	}
	if !strings.Contains(err.Error(), "insert pelamar profile") {
		t.Fatalf("expected contextual error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestSaveEmailVerificationToken_Success(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	expiresAt := now.Add(60 * time.Minute)

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("DELETE FROM email_verification_tokens WHERE user_id = ?")).
		WithArgs(int64(99)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO email_verification_tokens (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)")).
		WithArgs(int64(99), "abc123", expiresAt, now).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repository.SaveEmailVerificationToken(db, 99, "abc123", expiresAt, now)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestGetEmailVerificationTokenByHash_Success(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	expiresAt := now.Add(60 * time.Minute)
	rows := sqlmock.NewRows([]string{"user_id", "token_hash", "expires_at", "created_at"}).
		AddRow(int64(7), "hash123", expiresAt, now)
	mock.ExpectQuery(regexp.QuoteMeta("SELECT user_id, token_hash, expires_at, created_at FROM email_verification_tokens WHERE token_hash = ? LIMIT 1")).
		WithArgs("hash123").
		WillReturnRows(rows)

	record, err := repository.GetEmailVerificationTokenByHash(db, "hash123")
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if record == nil {
		t.Fatalf("expected record, got nil")
	}
	if record.UserID != 7 {
		t.Fatalf("expected user_id 7, got %d", record.UserID)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestGetEmailVerificationTokenByUserID_Success(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	expiresAt := now.Add(60 * time.Minute)
	rows := sqlmock.NewRows([]string{"user_id", "token_hash", "expires_at", "created_at"}).
		AddRow(int64(9), "hash999", expiresAt, now)
	mock.ExpectQuery(regexp.QuoteMeta("SELECT user_id, token_hash, expires_at, created_at FROM email_verification_tokens WHERE user_id = ? LIMIT 1")).
		WithArgs(int64(9)).
		WillReturnRows(rows)

	record, err := repository.GetEmailVerificationTokenByUserID(db, 9)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if record == nil {
		t.Fatalf("expected record, got nil")
	}
	if record.TokenHash != "hash999" {
		t.Fatalf("expected token hash hash999, got %s", record.TokenHash)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
