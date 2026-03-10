package db

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type RecruitmentScoringAuditRecord struct {
	ID            int64          `db:"id"`
	ActorUserID   sql.NullInt64  `db:"actor_user_id"`
	ActorName     sql.NullString `db:"actor_name"`
	Action        string         `db:"action"`
	DivisionName  sql.NullString `db:"division_name"`
	PositionTitle sql.NullString `db:"position_title"`
	DetailsJSON   models.JSON    `db:"details_json"`
	CreatedAt     *time.Time     `db:"created_at"`
}

func ListApplicationsForScoring(db *sqlx.DB, statuses []string) ([]models.Application, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}

	rows := []models.Application{}
	if len(statuses) == 0 {
		err := db.Select(&rows, "SELECT * FROM applications ORDER BY submitted_at DESC, id ASC")
		return rows, err
	}

	query, args, err := sqlx.In(
		"SELECT * FROM applications WHERE status IN (?) ORDER BY submitted_at DESC, id ASC",
		statuses,
	)
	if err != nil {
		return nil, err
	}
	query = db.Rebind(query)
	if err := db.Select(&rows, query, args...); err != nil {
		return nil, err
	}
	return rows, nil
}

func ListApplicantProfilesByUserIDs(db *sqlx.DB, userIDs []int64) (map[int64]*models.ApplicantProfile, error) {
	out := map[int64]*models.ApplicantProfile{}
	if db == nil {
		return out, errors.New("database tidak tersedia")
	}
	if len(userIDs) == 0 {
		return out, nil
	}

	query, args, err := sqlx.In("SELECT * FROM applicant_profiles WHERE user_id IN (?)", userIDs)
	if err != nil {
		return out, err
	}
	query = db.Rebind(query)

	rows := []models.ApplicantProfile{}
	if err := db.Select(&rows, query, args...); err != nil {
		return out, err
	}
	for i := range rows {
		row := rows[i]
		cloned := row
		out[row.UserID] = &cloned
	}
	return out, nil
}

func PromoteApplicationToScreening(db *sqlx.DB, applicationID int64, at time.Time) (int64, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	if applicationID <= 0 {
		return 0, errors.New("id lamaran tidak valid")
	}
	if at.IsZero() {
		at = time.Now()
	}

	result, err := db.Exec(
		"UPDATE applications SET status = 'Screening', screening_at = IFNULL(screening_at, ?), updated_at = ? WHERE id = ? AND status = 'Applied'",
		at,
		at,
		applicationID,
	)
	if err != nil {
		return 0, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	return rows, nil
}

func InsertRecruitmentScoringAudit(
	db *sqlx.DB,
	actorUserID *int64,
	action string,
	divisionName string,
	positionTitle string,
	detailsJSON models.JSON,
	createdAt time.Time,
) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if strings.TrimSpace(action) == "" {
		return errors.New("aksi audit tidak valid")
	}
	if createdAt.IsZero() {
		createdAt = time.Now()
	}

	_, err := db.Exec(
		`INSERT INTO recruitment_scoring_audits (actor_user_id, action, division_name, position_title, details_json, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		scoringNullableInt64Ptr(actorUserID),
		action,
		scoringNullableTrimmedString(divisionName),
		scoringNullableTrimmedString(positionTitle),
		detailsJSON,
		createdAt,
	)
	return err
}

func ListRecruitmentScoringAudits(db *sqlx.DB, limit int) ([]RecruitmentScoringAuditRecord, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	rows := []RecruitmentScoringAuditRecord{}
	err := db.Select(&rows, `
		SELECT a.id, a.actor_user_id, a.action, a.division_name, a.position_title, a.details_json, a.created_at,
		       u.name AS actor_name
		FROM recruitment_scoring_audits a
		LEFT JOIN users u ON u.id = a.actor_user_id
		ORDER BY a.created_at DESC, a.id DESC
		LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func scoringNullableTrimmedString(value string) any {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return trimmed
}

func scoringNullableInt64Ptr(value *int64) any {
	if value == nil || *value <= 0 {
		return nil
	}
	return *value
}
