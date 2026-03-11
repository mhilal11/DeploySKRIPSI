package repository_test

import (
	"errors"
	repository "hris-backend/internal/repository"
	"strings"
	"testing"
	"time"
)

func TestUpsertEducationReferenceCustomEntries_Success(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	entries := []repository.EducationReferenceCustomUpsertEntry{
		{
			Institution:           "Institut Teknologi Bandung",
			Program:               "Teknik Informatika",
			InstitutionNormalized: "institut teknologi bandung",
			ProgramNormalized:     "teknik informatika",
		},
	}

	mock.ExpectBegin()
	mock.ExpectExec("(?s)INSERT INTO education_reference_custom").
		WithArgs(
			entries[0].Institution,
			entries[0].Program,
			entries[0].InstitutionNormalized,
			entries[0].ProgramNormalized,
			int64(7),
			now,
			now,
		).
		WillReturnResult(lastInsertResult(1))
	mock.ExpectCommit()

	err := repository.UpsertEducationReferenceCustomEntries(db, 7, entries, now)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestUpsertEducationReferenceCustomEntries_InsertFailRollback(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	insertErr := errors.New("insert fail")
	entries := []repository.EducationReferenceCustomUpsertEntry{
		{
			Institution:           "Institut Teknologi Bandung",
			Program:               "Teknik Informatika",
			InstitutionNormalized: "institut teknologi bandung",
			ProgramNormalized:     "teknik informatika",
		},
	}

	mock.ExpectBegin()
	mock.ExpectExec("(?s)INSERT INTO education_reference_custom").
		WithArgs(
			entries[0].Institution,
			entries[0].Program,
			entries[0].InstitutionNormalized,
			entries[0].ProgramNormalized,
			int64(7),
			now,
			now,
		).
		WillReturnError(insertErr)
	mock.ExpectRollback()

	err := repository.UpsertEducationReferenceCustomEntries(db, 7, entries, now)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, insertErr) {
		t.Fatalf("expected wrapped insert error, got %v", err)
	}
	if !strings.Contains(err.Error(), "upsert education reference custom entry") {
		t.Fatalf("expected contextual error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestUpsertEducationReferenceCustomEntries_MissingTableIgnored(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	entries := []repository.EducationReferenceCustomUpsertEntry{
		{
			Institution:           "Institut Teknologi Bandung",
			Program:               "Teknik Informatika",
			InstitutionNormalized: "institut teknologi bandung",
			ProgramNormalized:     "teknik informatika",
		},
	}

	mock.ExpectBegin()
	mock.ExpectExec("(?s)INSERT INTO education_reference_custom").
		WithArgs(
			entries[0].Institution,
			entries[0].Program,
			entries[0].InstitutionNormalized,
			entries[0].ProgramNormalized,
			int64(7),
			now,
			now,
		).
		WillReturnError(errors.New("Error 1146: Table 'hris.education_reference_custom' doesn't exist"))
	mock.ExpectRollback()

	err := repository.UpsertEducationReferenceCustomEntries(db, 7, entries, now)
	if err != nil {
		t.Fatalf("expected nil error for missing table, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
