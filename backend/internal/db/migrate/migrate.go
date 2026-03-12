package migrate

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"hris-backend/internal/config"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

type MigrationFile struct {
	Name string
	Path string
	SQL  string
}

type StatusRow struct {
	Name   string
	Status string
}

func EnsureDatabase(cfg config.Config) error {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/?charset=utf8mb4&parseTime=true&loc=UTC",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
	)
	db, err := sqlx.Connect("mysql", dsn)
	if err != nil {
		return err
	}
	defer db.Close()

	query := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", quoteIdentifier(cfg.DBName))
	_, err = db.Exec(query)
	return err
}

func OpenMigrationDB(cfg config.Config) (*sqlx.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true&charset=utf8mb4&loc=UTC&multiStatements=true",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
	)
	return sqlx.Connect("mysql", dsn)
}

func EnsureMigrationsTable(db *sqlx.DB) error {
	_, err := db.Exec(`
CREATE TABLE IF NOT EXISTS migrations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  migration VARCHAR(255) NOT NULL,
  batch INT NOT NULL,
  UNIQUE KEY migrations_migration_unique (migration),
  INDEX migrations_batch_idx (batch)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
	return err
}

func LoadMigrationFiles(dir string) ([]MigrationFile, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	files := make([]MigrationFile, 0)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasSuffix(strings.ToLower(name), ".sql") {
			continue
		}
		path := filepath.Join(dir, name)
		content, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}
		files = append(files, MigrationFile{
			Name: name,
			Path: path,
			SQL:  string(content),
		})
	}

	sort.Slice(files, func(i, j int) bool {
		return files[i].Name < files[j].Name
	})
	return files, nil
}

func AppliedMigrations(db *sqlx.DB) (map[string]bool, error) {
	rows := []struct {
		Migration string `db:"migration"`
	}{}
	if err := db.Select(&rows, "SELECT migration FROM migrations ORDER BY id ASC"); err != nil {
		return nil, err
	}
	out := make(map[string]bool, len(rows))
	for _, row := range rows {
		out[row.Migration] = true
	}
	return out, nil
}

func RunUp(db *sqlx.DB, files []MigrationFile) ([]string, []string, error) {
	appliedSet, err := AppliedMigrations(db)
	if err != nil {
		return nil, nil, err
	}

	var batch sql.NullInt64
	if err := db.Get(&batch, "SELECT MAX(batch) FROM migrations"); err != nil {
		return nil, nil, err
	}
	nextBatch := int64(1)
	if batch.Valid {
		nextBatch = batch.Int64 + 1
	}

	applied := make([]string, 0)
	skipped := make([]string, 0)
	for _, file := range files {
		if appliedSet[file.Name] {
			skipped = append(skipped, file.Name)
			continue
		}

		tx, err := db.Beginx()
		if err != nil {
			return applied, skipped, err
		}
		if _, err := tx.Exec(file.SQL); err != nil {
			_ = tx.Rollback()
			return applied, skipped, fmt.Errorf("migration %s failed: %w", file.Name, err)
		}
		if _, err := tx.Exec("INSERT INTO migrations (migration, batch) VALUES (?, ?)", file.Name, nextBatch); err != nil {
			_ = tx.Rollback()
			return applied, skipped, fmt.Errorf("migration %s failed to record: %w", file.Name, err)
		}
		if err := tx.Commit(); err != nil {
			return applied, skipped, fmt.Errorf("migration %s commit failed: %w", file.Name, err)
		}
		applied = append(applied, file.Name)
	}

	return applied, skipped, nil
}

func Status(db *sqlx.DB, files []MigrationFile) ([]StatusRow, error) {
	appliedSet, err := AppliedMigrations(db)
	if err != nil {
		return nil, err
	}

	out := make([]StatusRow, 0, len(files))
	for _, file := range files {
		status := "pending"
		if appliedSet[file.Name] {
			status = "applied"
		}
		out = append(out, StatusRow{
			Name:   file.Name,
			Status: status,
		})
	}
	return out, nil
}

func quoteIdentifier(name string) string {
	return "`" + strings.ReplaceAll(name, "`", "``") + "`"
}
