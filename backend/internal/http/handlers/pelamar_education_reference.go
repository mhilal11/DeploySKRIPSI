package handlers

import (
	"encoding/json"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type educationReferenceEntry struct {
	Institution string   `json:"institution"`
	Programs    []string `json:"programs"`
}

type educationReferenceFile struct {
	Source       string                    `json:"source"`
	SourceURL    string                    `json:"source_url"`
	LastUpdated  string                    `json:"last_updated"`
	Institutions []educationReferenceEntry `json:"institutions"`
}

var defaultEducationReference = educationReferenceFile{
	Source:      "Snapshot referensi pendidikan tinggi Indonesia",
	SourceURL:   "https://data.go.id/dataset",
	LastUpdated: "2026-02-09",
	Institutions: []educationReferenceEntry{
		{Institution: "Universitas Indonesia", Programs: []string{"Ilmu Hukum", "Manajemen", "Akuntansi", "Teknik Informatika", "Sistem Informasi"}},
		{Institution: "Institut Teknologi Bandung", Programs: []string{"Teknik Informatika", "Sistem dan Teknologi Informasi", "Teknik Industri", "Arsitektur"}},
		{Institution: "Universitas Gadjah Mada", Programs: []string{"Ilmu Hukum", "Kedokteran", "Psikologi", "Teknik Sipil", "Teknik Mesin"}},
		{Institution: "Universitas Airlangga", Programs: []string{"Akuntansi", "Manajemen", "Ilmu Komunikasi", "Kedokteran", "Farmasi"}},
		{Institution: "Institut Pertanian Bogor", Programs: []string{"Agribisnis", "Teknologi Pangan", "Statistika", "Ilmu Komputer"}},
		{Institution: "Universitas Diponegoro", Programs: []string{"Teknik Industri", "Ilmu Hukum", "Administrasi Bisnis", "Kesehatan Masyarakat"}},
		{Institution: "Universitas Padjadjaran", Programs: []string{"Ilmu Hukum", "Ilmu Komunikasi", "Ekonomi Pembangunan", "Sastra Indonesia"}},
		{Institution: "Universitas Brawijaya", Programs: []string{"Teknik Informatika", "Sistem Informasi", "Administrasi Publik", "Manajemen"}},
		{Institution: "Universitas Hasanuddin", Programs: []string{"Teknik Sipil", "Kedokteran", "Ilmu Hukum", "Perikanan"}},
		{Institution: "Universitas Negeri Yogyakarta", Programs: []string{"Pendidikan Teknik Informatika", "Pendidikan Akuntansi", "Pendidikan Bahasa Inggris"}},
		{Institution: "Universitas Negeri Jakarta", Programs: []string{"Pendidikan Ekonomi", "Ilmu Komputer", "Pendidikan Bahasa dan Sastra Indonesia"}},
		{Institution: "UIN Syarif Hidayatullah Jakarta", Programs: []string{"Sistem Informasi", "Perbankan Syariah", "Pendidikan Agama Islam"}},
		{Institution: "Universitas Bina Nusantara", Programs: []string{"Teknik Informatika", "Sistem Informasi", "Manajemen", "Akuntansi"}},
		{Institution: "Universitas Telkom", Programs: []string{"Informatika", "Sistem Informasi", "Manajemen Bisnis Telekomunikasi dan Informatika"}},
		{Institution: "Universitas Trisakti", Programs: []string{"Ilmu Hukum", "Akuntansi", "Manajemen", "Teknik Sipil"}},
		{Institution: "Universitas Tarumanagara", Programs: []string{"Teknik Informatika", "Sistem Informasi", "Akuntansi", "Manajemen"}},
		{Institution: "Universitas Gunadarma", Programs: []string{"Sistem Informasi", "Informatika", "Akuntansi", "Psikologi"}},
		{Institution: "Universitas Mercu Buana", Programs: []string{"Teknik Informatika", "Sistem Informasi", "Ilmu Komunikasi", "Manajemen"}},
		{Institution: "Universitas Atma Jaya Yogyakarta", Programs: []string{"Teknik Informatika", "Sistem Informasi", "Ilmu Hukum", "Akuntansi"}},
		{Institution: "Universitas Katolik Parahyangan", Programs: []string{"Ilmu Hukum", "Manajemen", "Hubungan Internasional", "Arsitektur"}},
		{Institution: "Universitas Kristen Petra", Programs: []string{"Informatika", "Sistem Informasi Bisnis", "Manajemen", "Ilmu Komunikasi"}},
		{Institution: "Universitas Multimedia Nusantara", Programs: []string{"Informatika", "Sistem Informasi", "Ilmu Komunikasi", "Film"}},
	},
}

var educationReferenceCache = struct {
	mu      sync.RWMutex
	path    string
	modTime time.Time
	data    educationReferenceFile
	loaded  bool
}{}

func PelamarEducationReferences(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RolePelamar {
		JSONError(c, 403, "Forbidden")
		return
	}

	respondEducationReferences(c)
}

func SuperAdminEducationReferences(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, 403, "Forbidden")
		return
	}
	respondEducationReferences(c)
}

func respondEducationReferences(c *gin.Context) {
	cfg := middleware.GetConfig(c)
	reference := loadEducationReference(cfg.EducationReferencePath)

	query := strings.ToLower(strings.TrimSpace(c.Query("q")))
	limit := clampLimit(c.Query("limit"))

	institutionsSet := map[string]string{}
	programsSet := map[string]string{}

	for _, entry := range reference.Institutions {
		institution := strings.TrimSpace(entry.Institution)
		if institution == "" {
			continue
		}

		if query == "" || strings.Contains(strings.ToLower(institution), query) {
			institutionKey := normalizeSearchKey(institution)
			institutionsSet[institutionKey] = pickShorterDisplay(institutionsSet[institutionKey], institution)
		}

		for _, program := range entry.Programs {
			program = strings.TrimSpace(program)
			if program == "" {
				continue
			}
			if query == "" || strings.Contains(strings.ToLower(program), query) {
				programKey := normalizeSearchKey(program)
				programsSet[programKey] = pickShorterDisplay(programsSet[programKey], program)
			}
		}
	}

	institutions := mapValues(institutionsSet)
	programs := mapValues(programsSet)
	sort.Strings(institutions)
	sort.Strings(programs)

	institutions = trimSlice(institutions, limit)
	programs = trimSlice(programs, limit)

	c.JSON(200, gin.H{
		"institutions": institutions,
		"programs":     programs,
		"meta": gin.H{
			"source":       reference.Source,
			"source_url":   reference.SourceURL,
			"last_updated": reference.LastUpdated,
			"limit":        limit,
		},
	})
}

func loadEducationReference(path string) educationReferenceFile {
	if path == "" {
		return defaultEducationReference
	}

	info, err := os.Stat(path)
	if err != nil {
		return defaultEducationReference
	}

	cacheData, cacheOK := getCachedEducationReference(path, info.ModTime())
	if cacheOK {
		return cacheData
	}

	loaded := readEducationReferenceFromFile(path)
	setCachedEducationReference(path, info.ModTime(), loaded)
	return loaded
}

func readEducationReferenceFromFile(path string) educationReferenceFile {
	raw, err := os.ReadFile(path)
	if err != nil {
		return defaultEducationReference
	}

	var parsed educationReferenceFile
	if json.Unmarshal(raw, &parsed) != nil {
		return defaultEducationReference
	}

	normalizeEducationReference(&parsed)
	if len(parsed.Institutions) == 0 {
		return defaultEducationReference
	}
	if strings.TrimSpace(parsed.Source) == "" {
		parsed.Source = defaultEducationReference.Source
	}
	if strings.TrimSpace(parsed.SourceURL) == "" {
		parsed.SourceURL = defaultEducationReference.SourceURL
	}
	if strings.TrimSpace(parsed.LastUpdated) == "" {
		parsed.LastUpdated = defaultEducationReference.LastUpdated
	}

	return parsed
}

func getCachedEducationReference(path string, modTime time.Time) (educationReferenceFile, bool) {
	educationReferenceCache.mu.RLock()
	defer educationReferenceCache.mu.RUnlock()

	if !educationReferenceCache.loaded {
		return educationReferenceFile{}, false
	}
	if educationReferenceCache.path != path {
		return educationReferenceFile{}, false
	}
	if !educationReferenceCache.modTime.Equal(modTime) {
		return educationReferenceFile{}, false
	}

	return educationReferenceCache.data, true
}

func setCachedEducationReference(path string, modTime time.Time, data educationReferenceFile) {
	educationReferenceCache.mu.Lock()
	defer educationReferenceCache.mu.Unlock()

	educationReferenceCache.path = path
	educationReferenceCache.modTime = modTime
	educationReferenceCache.data = data
	educationReferenceCache.loaded = true
}

func normalizeEducationReference(ref *educationReferenceFile) {
	normalized := make([]educationReferenceEntry, 0, len(ref.Institutions))
	for _, entry := range ref.Institutions {
		institution := strings.TrimSpace(entry.Institution)
		if institution == "" {
			continue
		}
		seen := map[string]struct{}{}
		programs := make([]string, 0, len(entry.Programs))
		for _, program := range entry.Programs {
			program = strings.TrimSpace(program)
			if program == "" {
				continue
			}
			lower := strings.ToLower(program)
			if _, exists := seen[lower]; exists {
				continue
			}
			seen[lower] = struct{}{}
			programs = append(programs, program)
		}
		normalized = append(normalized, educationReferenceEntry{
			Institution: institution,
			Programs:    programs,
		})
	}
	ref.Institutions = normalized
}

func clampLimit(raw string) int {
	limit := 300
	if raw != "" {
		if v, err := strconv.Atoi(raw); err == nil {
			limit = v
		}
	}
	if limit < 1 {
		return 1
	}
	if limit > 20000 {
		return 20000
	}
	return limit
}

func mapValues(values map[string]string) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		out = append(out, value)
	}
	return out
}

func trimSlice(values []string, limit int) []string {
	if len(values) <= limit {
		return values
	}
	return values[:limit]
}

func normalizeSearchKey(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	replacer := strings.NewReplacer(
		"(", " ",
		")", " ",
		",", " ",
		".", " ",
		";", " ",
		":", " ",
		"-", " ",
		"_", " ",
		"/", " ",
		"\\", " ",
		"`", "",
		"'", "",
	)
	value = replacer.Replace(value)
	return strings.Join(strings.Fields(value), " ")
}

func pickShorterDisplay(current, candidate string) string {
	current = strings.TrimSpace(current)
	candidate = strings.TrimSpace(candidate)
	if current == "" {
		return candidate
	}
	if candidate == "" {
		return current
	}
	if len(candidate) < len(current) {
		return candidate
	}
	return current
}
