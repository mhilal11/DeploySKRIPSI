package main

import (
	"log"
	"os"
	"path/filepath"

	"hris-backend/internal/config"
	"hris-backend/internal/db/migrate"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	if len(os.Args) < 2 {
		log.Printf("usage: go run ./cmd/migrate [up|status]")
		os.Exit(1)
	}

	cfg := config.Load()
	if err := migrate.EnsureDatabase(cfg); err != nil {
		log.Printf("ensure database failed: %v", err)
		os.Exit(1)
	}

	db, err := migrate.OpenMigrationDB(cfg)
	if err != nil {
		log.Printf("open migration db failed: %v", err)
		os.Exit(1)
	}
	defer db.Close()

	if err := migrate.EnsureMigrationsTable(db); err != nil {
		log.Printf("ensure migrations table failed: %v", err)
		os.Exit(1)
	}

	migrationsDir, err := resolveMigrationsDir()
	if err != nil {
		log.Printf("resolve migrations dir failed: %v", err)
		os.Exit(1)
	}

	files, err := migrate.LoadMigrationFiles(migrationsDir)
	if err != nil {
		log.Printf("load migration files failed: %v", err)
		os.Exit(1)
	}

	switch os.Args[1] {
	case "up":
		applied, skipped, err := migrate.RunUp(db, files)
		if err != nil {
			log.Printf("migrate up failed: %v", err)
			os.Exit(1)
		}
		for _, name := range applied {
			log.Printf("applied: %s", name)
		}
		for _, name := range skipped {
			log.Printf("skipped: %s", name)
		}
		log.Printf("migrate up completed (applied=%d skipped=%d)", len(applied), len(skipped))
	case "status":
		rows, err := migrate.Status(db, files)
		if err != nil {
			log.Printf("migrate status failed: %v", err)
			os.Exit(1)
		}
		if len(rows) == 0 {
			log.Printf("no migration files found")
			return
		}
		for _, row := range rows {
			log.Printf("%-10s %s", row.Status, row.Name)
		}
	default:
		log.Printf("unknown command: %s", os.Args[1])
		log.Printf("usage: go run ./cmd/migrate [up|status]")
		os.Exit(1)
	}
}

func resolveMigrationsDir() (string, error) {
	candidates := []string{
		"migrations",
		filepath.Join("backend", "migrations"),
	}
	for _, candidate := range candidates {
		info, err := os.Stat(candidate)
		if err != nil {
			continue
		}
		if info.IsDir() {
			return candidate, nil
		}
	}
	return "", os.ErrNotExist
}
