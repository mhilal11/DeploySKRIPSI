package main

import (
	"log"
	"os"

	"hris-backend/internal/config"
	"hris-backend/internal/db"
	"hris-backend/internal/db/seed"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	if len(os.Args) < 2 {
		log.Printf("usage: go run ./cmd/seed [users|staff|pelamar|pelamar-web]")
		os.Exit(1)
	}

	cfg := config.Load()
	database, err := db.Connect(cfg)
	if err != nil {
		log.Printf("db connect failed: %v", err)
		os.Exit(1)
	}

	switch os.Args[1] {
	case "users":
		if err := seed.RunUserSeeder(database); err != nil {
			log.Printf("seed users failed: %v", err)
			os.Exit(1)
		}
		log.Printf("seed users completed")
	case "staff":
		if err := seed.RunStaffSeeder(database); err != nil {
			log.Printf("seed staff failed: %v", err)
			os.Exit(1)
		}
		log.Printf("seed staff completed")
	case "pelamar":
		if err := seed.RunApplicantSeeder(database); err != nil {
			log.Printf("seed pelamar failed: %v", err)
			os.Exit(1)
		}
		log.Printf("seed pelamar completed")
	case "pelamar-web":
		if err := seed.RunWebApplicantProfileSeeder(database); err != nil {
			log.Printf("seed pelamar-web failed: %v", err)
			os.Exit(1)
		}
		log.Printf("seed pelamar-web completed")
	default:
		log.Printf("unknown seeder: %s", os.Args[1])
		log.Printf("available seeders: users, staff, pelamar, pelamar-web")
		os.Exit(1)
	}
}
