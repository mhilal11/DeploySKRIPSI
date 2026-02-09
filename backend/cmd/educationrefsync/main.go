package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"hris-backend/internal/educationreference"
)

type banPTResponse struct {
	Data [][]string `json:"data"`
}

func main() {
	outputPath := flag.String("out", "./data/education_reference_id.json", "output snapshot path")
	sourceURL := flag.String("source", educationreference.BANPTProdiURL, "source endpoint URL")
	timeout := flag.Duration("timeout", 90*time.Second, "HTTP timeout")
	flag.Parse()

	client := &http.Client{Timeout: *timeout}
	req, err := http.NewRequest(http.MethodGet, *sourceURL, nil)
	if err != nil {
		log.Fatalf("build request failed: %v", err)
	}
	req.Header.Set("User-Agent", "HRIS-LDP/educationrefsync")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Referer", "https://www.banpt.or.id/direktori/prodi/pencarian_prodi.php")

	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("fetch source failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Fatalf("source returned status %d", resp.StatusCode)
	}

	var parsed banPTResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		log.Fatalf("decode source payload failed: %v", err)
	}

	snapshot := educationreference.BuildFromBANPTRows(parsed.Data, time.Now())
	var buffer bytes.Buffer
	encoder := json.NewEncoder(&buffer)
	encoder.SetEscapeHTML(false)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(snapshot); err != nil {
		log.Fatalf("marshal snapshot failed: %v", err)
	}
	payload := buffer.Bytes()

	if err := os.MkdirAll(filepath.Dir(*outputPath), 0o755); err != nil {
		log.Fatalf("create output dir failed: %v", err)
	}

	if err := os.WriteFile(*outputPath, payload, 0o644); err != nil {
		log.Fatalf("write snapshot failed: %v", err)
	}

	fmt.Printf("snapshot saved: %s\n", *outputPath)
	fmt.Printf("institutions: %d\n", len(snapshot.Institutions))
	totalPrograms := 0
	for _, institution := range snapshot.Institutions {
		totalPrograms += len(institution.Programs)
	}
	fmt.Printf("institution-program pairs: %d\n", totalPrograms)
}
