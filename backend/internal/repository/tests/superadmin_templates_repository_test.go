package repository_test

import (
	"errors"
	repository "hris-backend/internal/repository"
	"regexp"
	"strings"
	"testing"
	"time"
)

func TestListLetterTemplates_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("list templates fail")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT * FROM letter_templates ORDER BY created_at DESC")).
		WillReturnError(queryErr)

	_, err := repository.ListLetterTemplates(db)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "list letter templates") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestCreateAndActivateLetterTemplate_DeactivateFailRollback(t *testing.T) {
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
	deactivateErr := errors.New("deactivate fail")

	mock.ExpectBegin()
	mock.ExpectExec("(?s)INSERT INTO letter_templates").
		WithArgs(input.Name, input.FilePath, input.FileName, input.HeaderText, input.FooterText, input.LogoPath, input.CreatedBy, input.Now, input.Now).
		WillReturnResult(lastInsertResult(1))
	mock.ExpectExec(regexp.QuoteMeta("UPDATE letter_templates SET is_active = 0 WHERE file_path != ?")).
		WithArgs(input.FilePath).
		WillReturnError(deactivateErr)
	mock.ExpectRollback()

	err := repository.CreateAndActivateLetterTemplate(db, input)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, deactivateErr) {
		t.Fatalf("expected wrapped deactivate error, got %v", err)
	}
	if !strings.Contains(err.Error(), "deactivate previous letter templates") {
		t.Fatalf("expected contextual error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestDeactivateAllLetterTemplates_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	execErr := errors.New("update fail")
	mock.ExpectExec(regexp.QuoteMeta("UPDATE letter_templates SET is_active = 0")).
		WillReturnError(execErr)

	err := repository.DeactivateAllLetterTemplates(db)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, execErr) {
		t.Fatalf("expected wrapped exec error, got %v", err)
	}
	if !strings.Contains(err.Error(), "deactivate all letter templates") {
		t.Fatalf("expected contextual error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
