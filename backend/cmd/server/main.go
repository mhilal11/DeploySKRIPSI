package main

import (
	"log"

	"hris-backend/internal/config"
	"hris-backend/internal/db"
	httpserver "hris-backend/internal/http"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()
	if err := cfg.ValidateForServer(); err != nil {
		log.Fatalf("config validation failed: %v", err)
	}

	database, err := db.Connect(cfg)
	if err != nil {
		log.Fatalf("db connect failed: %v", err)
	}

	router := httpserver.NewRouter(cfg, database)

	log.Printf("HRIS backend listening on %s", cfg.Address)
	if err := router.Run(cfg.Address); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
