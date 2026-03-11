package repository_test

import (
	"database/sql"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/jmoiron/sqlx"
)

func newSQLXMock(t *testing.T) (*sqlx.DB, sqlmock.Sqlmock, func()) {
	t.Helper()
	rawDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	db := sqlx.NewDb(rawDB, "sqlmock")
	cleanup := func() {
		_ = db.Close()
	}
	return db, mock, cleanup
}

func lastInsertResult(id int64) sql.Result {
	return sqlmock.NewResult(id, 1)
}
