package repository_test

import (
	"errors"
	repository "hris-backend/internal/repository"
	"regexp"
	"strings"
	"testing"
	"time"
)

func TestGetApplicationByID_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("get application fail")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT * FROM applications WHERE id = ?")).
		WithArgs(int64(7)).
		WillReturnError(queryErr)

	_, err := repository.GetApplicationByID(db, 7)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "get application by id") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestGetJobDescriptionByApplication_DivisionQueryErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	queryErr := errors.New("division lookup fail")
	division := "IT"
	mock.ExpectQuery("(?s)SELECT job_description\\s+FROM division_profiles\\s+WHERE LOWER\\(TRIM\\(name\\)\\) = LOWER\\(TRIM\\(\\?\\)\\)").
		WithArgs("IT", "Programmer").
		WillReturnError(queryErr)

	_, err := repository.GetJobDescriptionByApplication(db, &division, "Programmer")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, queryErr) {
		t.Fatalf("expected wrapped query error, got %v", err)
	}
	if !strings.Contains(err.Error(), "get job description by application with division") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestInsertRecruitmentAIScreeningFailure_ErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	execErr := errors.New("insert fail")
	now := time.Date(2026, 3, 11, 10, 0, 0, 0, time.UTC)
	input := repository.RecruitmentAIScreeningFailureInput{
		ApplicationID: 10,
		ActorUserID:   2,
		PromptVersion: "v1",
		CVFilePath:    "/tmp/cv.pdf",
		ModelChain:    []string{"a", "b"},
		ErrorMessage:  "timeout",
		Attempts:      []string{"a"},
		Now:           now,
	}

	mock.ExpectExec("(?s)INSERT INTO recruitment_ai_screenings").
		WillReturnError(execErr)

	err := repository.InsertRecruitmentAIScreeningFailure(db, input)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, execErr) {
		t.Fatalf("expected wrapped insert error, got %v", err)
	}
	if !strings.Contains(err.Error(), "insert recruitment ai screening failure") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestGetLatestSuccessfulAIScoresByApplicationIDs_SelectErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	selectErr := errors.New("select fail")
	mock.ExpectQuery("(?s)SELECT s\\.application_id, s\\.match_score\\s+FROM recruitment_ai_screenings s").
		WithArgs(int64(10), int64(20)).
		WillReturnError(selectErr)

	_, err := repository.GetLatestSuccessfulAIScoresByApplicationIDs(db, []int64{10, 20})
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, selectErr) {
		t.Fatalf("expected wrapped select error, got %v", err)
	}
	if !strings.Contains(err.Error(), "get latest successful ai scores by application ids") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestGetSuccessfulAIScreeningHistoryByApplicationID_SelectErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	selectErr := errors.New("history select fail")
	mock.ExpectQuery("(?s)SELECT\\s+s\\.application_id,\\s+a\\.position,\\s+a\\.division,\\s+a\\.status AS application_status").
		WithArgs(int64(15), 2).
		WillReturnError(selectErr)

	_, err := repository.GetSuccessfulAIScreeningHistoryByApplicationID(db, 15, 2)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, selectErr) {
		t.Fatalf("expected wrapped select error, got %v", err)
	}
	if !strings.Contains(err.Error(), "get successful ai screening history by application id") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}

func TestGetSimilarSuccessfulAIScreeningMemories_SelectErrorWrapped(t *testing.T) {
	db, mock, cleanup := newSQLXMock(t)
	defer cleanup()

	selectErr := errors.New("similar memories select fail")
	division := "IT"
	mock.ExpectQuery("(?s)SELECT\\s+s\\.application_id,\\s+a\\.position,\\s+a\\.division,\\s+a\\.status AS application_status").
		WithArgs(int64(33), "Backend Engineer", "IT", 4).
		WillReturnError(selectErr)

	_, err := repository.GetSimilarSuccessfulAIScreeningMemories(db, "Backend Engineer", &division, 33, 4)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, selectErr) {
		t.Fatalf("expected wrapped select error, got %v", err)
	}
	if !strings.Contains(err.Error(), "get similar successful ai screening memories") {
		t.Fatalf("expected contextual error, got %v", err)
	}
}
