package db

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
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

func AcquireExpiringLock(db *sqlx.DB, key, owner string, ttl time.Duration) (bool, error) {
	if db == nil {
		return false, errors.New("database tidak tersedia")
	}
	key = strings.TrimSpace(key)
	owner = strings.TrimSpace(owner)
	if key == "" || owner == "" {
		return false, errors.New("parameter lock tidak valid")
	}
	if ttl <= 0 {
		ttl = 60 * time.Second
	}

	now := time.Now().Unix()
	expiresAt := time.Now().Add(ttl).Unix()

	tx, err := db.Beginx()
	if err != nil {
		return false, wrapRepoErr("acquire expiring lock begin tx", err)
	}
	defer tx.Rollback()

	var row struct {
		Owner      string `db:"owner"`
		Expiration int64  `db:"expiration"`
	}
	err = tx.Get(&row, "SELECT owner, expiration FROM cache_locks WHERE `key` = ? FOR UPDATE", key)
	switch {
	case err == nil:
		if row.Owner != owner && row.Expiration > now {
			return false, nil
		}
		if _, err := tx.Exec("UPDATE cache_locks SET owner = ?, expiration = ? WHERE `key` = ?", owner, expiresAt, key); err != nil {
			return false, wrapRepoErr("acquire expiring lock update", err)
		}
	case errors.Is(err, sql.ErrNoRows):
		if _, err := tx.Exec("INSERT INTO cache_locks (`key`, owner, expiration) VALUES (?, ?, ?)", key, owner, expiresAt); err != nil {
			return false, wrapRepoErr("acquire expiring lock insert", err)
		}
	default:
		return false, wrapRepoErr("acquire expiring lock select", err)
	}

	if err := tx.Commit(); err != nil {
		return false, wrapRepoErr("acquire expiring lock commit", err)
	}
	return true, nil
}

func ReleaseExpiringLock(db *sqlx.DB, key, owner string) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	key = strings.TrimSpace(key)
	owner = strings.TrimSpace(owner)
	if key == "" || owner == "" {
		return errors.New("parameter lock tidak valid")
	}
	_, err := db.Exec("DELETE FROM cache_locks WHERE `key` = ? AND owner = ?", key, owner)
	return wrapRepoErr("release expiring lock", err)
}

func ListJobsByQueue(db *sqlx.DB, queue string) ([]JobRecord, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []JobRecord{}
	if err := db.Select(&rows, "SELECT id, queue, payload, attempts, reserved_at, available_at, created_at FROM jobs WHERE queue = ? ORDER BY id ASC", queue); err != nil {
		return nil, wrapRepoErr("list jobs by queue", err)
	}
	return rows, nil
}

func FindQueuedApplicationJobIndex(db *sqlx.DB, queue string, applicationIDs []int64) (map[int64]JobRecord, error) {
	out := make(map[int64]JobRecord, len(applicationIDs))
	if db == nil || len(applicationIDs) == 0 {
		return out, nil
	}

	targets := make(map[int64]struct{}, len(applicationIDs))
	for _, applicationID := range applicationIDs {
		if applicationID > 0 {
			targets[applicationID] = struct{}{}
		}
	}
	if len(targets) == 0 {
		return out, nil
	}

	rows, err := ListJobsByQueue(db, queue)
	if err != nil {
		return out, err
	}

	for _, row := range rows {
		var payload struct {
			ApplicationID int64 `json:"application_id"`
		}
		if err := json.Unmarshal([]byte(row.Payload), &payload); err != nil {
			continue
		}
		if _, ok := targets[payload.ApplicationID]; !ok || payload.ApplicationID <= 0 {
			continue
		}
		if _, exists := out[payload.ApplicationID]; exists {
			continue
		}
		out[payload.ApplicationID] = row
	}

	return out, nil
}
