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

func TestReplySuratToHRWithHistory_Success(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	nextTarget := "Finance"

	mock.ExpectBegin()
	mock.ExpectExec("(?s)UPDATE surat SET reply_note").
		WithArgs("ok", int64(7), now, &nextTarget, "IT", now, int64(99)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("(?s)INSERT INTO surat_reply_histories").
		WithArgs(int64(99), int64(7), "IT", &nextTarget, "ok", now, now, now).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repository.ReplySuratToHRWithHistory(db, 99, "ok", 7, now, &nextTarget, "IT")
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestReplySuratToHRWithHistory_HistoryFailRollback(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	nextTarget := "Finance"
	historyErr := errors.New("history insert fail")

	mock.ExpectBegin()
	mock.ExpectExec("(?s)UPDATE surat SET reply_note").
		WithArgs("ok", int64(7), now, &nextTarget, "IT", now, int64(99)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("(?s)INSERT INTO surat_reply_histories").
		WithArgs(int64(99), int64(7), "IT", &nextTarget, "ok", now, now, now).
		WillReturnError(historyErr)
	mock.ExpectRollback()

	err := repository.ReplySuratToHRWithHistory(db, 99, "ok", 7, now, &nextTarget, "IT")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, historyErr) {
		t.Fatalf("expected wrapped history error, got %v", err)
	}
	if !strings.Contains(err.Error(), "insert surat reply history") {
		t.Fatalf("expected contextual error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestCreateAndActivateLetterTemplate_Success(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	input := repository.LetterTemplateCreateInput{
		Name:       "Template A",
		FilePath:   "letter-templates/a.docx",
		FileName:   "a.docx",
		HeaderText: "H",
		FooterText: "F",
		CreatedBy:  1,
		Now:        now,
	}

	mock.ExpectBegin()
	mock.ExpectExec("(?s)INSERT INTO letter_templates").
		WithArgs(input.Name, input.FilePath, input.FileName, input.HeaderText, input.FooterText, input.LogoPath, input.CreatedBy, input.Now, input.Now).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec(regexp.QuoteMeta("UPDATE letter_templates SET is_active = 0 WHERE file_path != ?")).
		WithArgs(input.FilePath).
		WillReturnResult(sqlmock.NewResult(0, 3))
	mock.ExpectCommit()

	err := repository.CreateAndActivateLetterTemplate(db, input)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
