package db

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
)

type JobRecord struct {
	ID          int64         `db:"id"`
	Queue       string        `db:"queue"`
	Payload     string        `db:"payload"`
	Attempts    int           `db:"attempts"`
	ReservedAt  sql.NullInt64 `db:"reserved_at"`
	AvailableAt int64         `db:"available_at"`
	CreatedAt   int64         `db:"created_at"`
}

func EnqueueJob(db *sqlx.DB, queue, payload string, availableAt time.Time) (int64, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	if availableAt.IsZero() {
		availableAt = time.Now()
	}
	now := time.Now().Unix()
	res, err := db.Exec(
		"INSERT INTO jobs (queue, payload, attempts, reserved_at, available_at, created_at) VALUES (?, ?, 0, NULL, ?, ?)",
		queue,
		payload,
		availableAt.Unix(),
		now,
	)
	if err != nil {
		return 0, wrapRepoErr("enqueue job", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, wrapRepoErr("enqueue job read id", err)
	}
	return id, nil
}

func ReserveNextJob(db *sqlx.DB, queue string, lease time.Duration) (*JobRecord, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if lease <= 0 {
		lease = 60 * time.Second
	}
	now := time.Now().Unix()
	expiredLeaseAt := now - int64(lease.Seconds())

	tx, err := db.Beginx()
	if err != nil {
		return nil, wrapRepoErr("reserve job begin tx", err)
	}
	defer tx.Rollback()

	var row JobRecord
	query := "SELECT id, queue, payload, attempts, reserved_at, available_at, created_at FROM jobs " +
		"WHERE queue = ? AND available_at <= ? AND (reserved_at IS NULL OR reserved_at <= ?) ORDER BY id ASC LIMIT 1 FOR UPDATE"
	if err := tx.Get(&row, query, queue, now, expiredLeaseAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("reserve job select", err)
	}

	nextAttempts := row.Attempts + 1
	if _, err := tx.Exec("UPDATE jobs SET reserved_at = ?, attempts = ? WHERE id = ?", now, nextAttempts, row.ID); err != nil {
		return nil, wrapRepoErr("reserve job update", err)
	}
	if err := tx.Commit(); err != nil {
		return nil, wrapRepoErr("reserve job commit", err)
	}

	row.Attempts = nextAttempts
	row.ReservedAt = sql.NullInt64{Int64: now, Valid: true}
	return &row, nil
}

func DeleteJobByID(db *sqlx.DB, jobID int64) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("DELETE FROM jobs WHERE id = ?", jobID)
	return wrapRepoErr("delete job by id", err)
}

func ReleaseJob(db *sqlx.DB, jobID int64, delay time.Duration) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if delay < 0 {
		delay = 0
	}
	availableAt := time.Now().Add(delay).Unix()
	_, err := db.Exec("UPDATE jobs SET reserved_at = NULL, available_at = ? WHERE id = ?", availableAt, jobID)
	return wrapRepoErr("release job", err)
}

func MoveJobToFailed(db *sqlx.DB, job JobRecord, exception string) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	now := time.Now()
	uuid := fmt.Sprintf("job-%d-%d", job.ID, now.UnixNano())
	_, err := db.Exec(
		"INSERT INTO failed_jobs (uuid, connection, queue, payload, exception, failed_at) VALUES (?, ?, ?, ?, ?, ?)",
		uuid,
		"mysql",
		job.Queue,
		job.Payload,
		exception,
		now,
	)
	return wrapRepoErr("move job to failed", err)
}
