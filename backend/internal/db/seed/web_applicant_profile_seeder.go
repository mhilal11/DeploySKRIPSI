package seed

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/models"
	"hris-backend/internal/services"

	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type webApplicantSeed struct {
	Name       string                   `json:"name"`
	Contact    webApplicantContactSeed  `json:"contact"`
	Profile    string                   `json:"profile"`
	Education  []webApplicantEducation  `json:"education"`
	Experience []webApplicantExperience `json:"experience"`
}

type webApplicantContactSeed struct {
	Phone    string `json:"phone"`
	Email    string `json:"email"`
	LinkedIn string `json:"linkedin"`
	Location string `json:"location"`
}

type webApplicantEducation struct {
	Institution string `json:"institution"`
	Degree      string `json:"degree"`
	GPA         string `json:"gpa"`
	Year        string `json:"year"`
}

type webApplicantExperience struct {
	Company          string   `json:"company"`
	Role             string   `json:"role"`
	Duration         string   `json:"duration"`
	Responsibilities []string `json:"responsibilities"`
}

const webApplicantSeedRawJSON = `[
  {
    "name": "Rahman Aditya Pratama",
    "contact": {
      "phone": "+62812-3456-7890",
      "email": "rahman.aditya@gmail.com",
      "linkedin": "linkedin.com/in/rahman-aditya",
      "location": "Bandung, Jawa Barat"
    },
    "profile": "Senior Fullstack Web Developer dengan pengalaman lebih dari 6 tahun dalam membangun aplikasi web berskala besar, scalable, dan efisien.",
    "education": [
      {
        "institution": "Universitas Telkom",
        "degree": "S1 Teknik Informatika",
        "gpa": "3.70",
        "year": "2017-2021"
      }
    ],
    "experience": [
      {
        "company": "PT Teknologi Digital Nusantara",
        "role": "Senior Fullstack Developer",
        "duration": "Jan 2022 - Sekarang",
        "responsibilities": [
          "Mengembangkan aplikasi menggunakan Next.js dan Laravel",
          "Implementasi UI dari Figma dengan Tailwind CSS",
          "Optimasi query PostgreSQL",
          "Kolaborasi menggunakan GitLab",
          "Meningkatkan performa aplikasi hingga 40%"
        ]
      }
    ]
  },
  {
    "name": "Dimas Fajar Nugroho",
    "contact": {
      "phone": "+62812-2222-3333",
      "email": "dimas.fajar@gmail.com",
      "linkedin": "linkedin.com/in/dimas-fajar",
      "location": "Jakarta"
    },
    "profile": "Senior Software Engineer dengan pengalaman dalam pengembangan sistem web berbasis enterprise dan optimasi performa.",
    "education": [
      {
        "institution": "Universitas Indonesia",
        "degree": "S1 Ilmu Komputer",
        "gpa": "3.60",
        "year": "2016-2020"
      }
    ],
    "experience": [
      {
        "company": "PT Kreasi Teknologi Mandiri",
        "role": "Fullstack Engineer",
        "duration": "2021 - Sekarang",
        "responsibilities": [
          "Pengembangan sistem internal menggunakan React dan Laravel",
          "Optimasi performa backend",
          "Manajemen database MySQL",
          "Version control GitHub"
        ]
      }
    ]
  },
  {
    "name": "Rizky Maulana Putra",
    "contact": {
      "phone": "+62813-9999-8888",
      "email": "rizky.maulana@gmail.com",
      "linkedin": "linkedin.com/in/rizky-maulana",
      "location": "Surabaya"
    },
    "profile": "Fullstack Engineer dengan pengalaman dalam pengembangan sistem berbasis microservices dan optimasi performa.",
    "education": [
      {
        "institution": "ITS",
        "degree": "S1 Informatika",
        "gpa": "3.55",
        "year": "2016-2020"
      }
    ],
    "experience": [
      {
        "company": "PT Inovasi Digital",
        "role": "Software Engineer",
        "duration": "2020 - Sekarang",
        "responsibilities": [
          "Pengembangan microservices",
          "REST API development",
          "Optimasi PostgreSQL",
          "Git workflow"
        ]
      }
    ]
  },
  {
    "name": "Andika Saputra Wijaya",
    "contact": {
      "phone": "+62811-7777-6666",
      "email": "andika.saputra@gmail.com",
      "linkedin": "linkedin.com/in/andika-saputra",
      "location": "Yogyakarta"
    },
    "profile": "Senior Web Developer dengan pengalaman dalam pengembangan fullstack modern dan integrasi sistem.",
    "education": [
      {
        "institution": "Universitas Gadjah Mada",
        "degree": "S1 Informatika",
        "gpa": "3.68",
        "year": "2015-2019"
      }
    ],
    "experience": [
      {
        "company": "PT Digital Kreasi",
        "role": "Fullstack Developer",
        "duration": "2019 - Sekarang",
        "responsibilities": [
          "React + Laravel development",
          "Figma implementation",
          "Database MySQL",
          "GitLab collaboration"
        ]
      }
    ]
  },
  {
    "name": "Fauzan Akbar Hidayat",
    "contact": {
      "phone": "+62812-1111-2222",
      "email": "fauzan.akbar@gmail.com",
      "linkedin": "linkedin.com/in/fauzan-akbar",
      "location": "Semarang"
    },
    "profile": "Software Engineer berpengalaman dalam membangun aplikasi web dengan fokus pada efisiensi dan performa.",
    "education": [
      {
        "institution": "Universitas Diponegoro",
        "degree": "S1 Informatika",
        "gpa": "3.62",
        "year": "2016-2020"
      }
    ],
    "experience": [
      {
        "company": "PT Solusi Teknologi",
        "role": "Backend Developer",
        "duration": "2020 - Sekarang",
        "responsibilities": [
          "Laravel backend",
          "PostgreSQL database",
          "API integration",
          "Git workflow"
        ]
      }
    ]
  }
]`

func RunWebApplicantProfileSeeder(database *sqlx.DB) error {
	if database == nil {
		return errors.New("database connection is nil")
	}

	var items []webApplicantSeed
	if err := json.Unmarshal([]byte(webApplicantSeedRawJSON), &items); err != nil {
		return fmt.Errorf("parse web applicant seed data: %w", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("generate password hash: %w", err)
	}

	now := time.Now()
	for idx, item := range items {
		if err := upsertWebApplicantSeed(database, item, string(hash), webApplicantBirthDate(idx), now); err != nil {
			return err
		}
	}
	return nil
}

func upsertWebApplicantSeed(database *sqlx.DB, item webApplicantSeed, passwordHash string, birthDate time.Time, now time.Time) error {
	name := strings.TrimSpace(item.Name)
	email := strings.TrimSpace(strings.ToLower(item.Contact.Email))
	if name == "" || email == "" {
		return fmt.Errorf("invalid applicant seed data for %q", item.Name)
	}

	var existing models.User
	err := database.Get(&existing, "SELECT * FROM users WHERE email = ? LIMIT 1", email)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	var userID int64
	if errors.Is(err, sql.ErrNoRows) {
		employeeCode, genErr := services.GenerateEmployeeCode(database, models.RolePelamar)
		if genErr != nil {
			return genErr
		}

		res, execErr := database.Exec(`INSERT INTO users (employee_code, name, email, role, status, registered_at, email_verified_at, password, created_at, updated_at)
			VALUES (?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?)`,
			employeeCode, name, email, models.RolePelamar, now.Format("2006-01-02"), now, passwordHash, now, now)
		if execErr != nil {
			return execErr
		}
		userID, execErr = res.LastInsertId()
		if execErr != nil {
			return execErr
		}
	} else {
		userID = existing.ID
		employeeCode := ""
		if existing.EmployeeCode != nil {
			employeeCode = strings.TrimSpace(*existing.EmployeeCode)
		}
		if employeeCode == "" {
			var genErr error
			employeeCode, genErr = services.GenerateEmployeeCode(database, models.RolePelamar)
			if genErr != nil {
				return genErr
			}
		}

		if _, err = database.Exec(`UPDATE users
			SET employee_code = ?, name = ?, email = ?, role = ?, division = NULL, status = 'Active', registered_at = ?, inactive_at = NULL, email_verified_at = ?, password = ?, updated_at = ?
			WHERE id = ?`,
			employeeCode, name, email, models.RolePelamar, now.Format("2006-01-02"), now, passwordHash, now, userID); err != nil {
			return err
		}
	}

	if err := upsertWebApplicantProfile(database, userID, item, birthDate, now); err != nil {
		return err
	}

	_, err = database.Exec("DELETE FROM applications WHERE user_id = ?", userID)
	return err
}

func upsertWebApplicantProfile(database *sqlx.DB, userID int64, item webApplicantSeed, birthDate time.Time, now time.Time) error {
	educationsJSON, err := marshalWebApplicantEducations(item.Education)
	if err != nil {
		return err
	}
	experiencesJSON, err := marshalWebApplicantExperiences(item.Experience, item.Profile)
	if err != nil {
		return err
	}

	city, province := parseWebApplicantLocation(item.Contact.Location)
	address := webApplicantAddress(city, province)
	domicileAddress := webApplicantDomicileAddress(city, province)
	phone := normalizeWebApplicantPhone(item.Contact.Phone)
	gender := "Laki-laki"
	religion := "Islam"
	email := strings.TrimSpace(strings.ToLower(item.Contact.Email))
	name := strings.TrimSpace(item.Name)

	_, err = database.Exec(`INSERT INTO applicant_profiles
		(user_id, full_name, email, phone, date_of_birth, gender, religion, address, domicile_address, city, province, educations, experiences, certifications, completed_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			full_name = VALUES(full_name),
			email = VALUES(email),
			phone = VALUES(phone),
			date_of_birth = VALUES(date_of_birth),
			gender = VALUES(gender),
			religion = VALUES(religion),
			address = VALUES(address),
			domicile_address = VALUES(domicile_address),
			city = VALUES(city),
			province = VALUES(province),
			educations = VALUES(educations),
			experiences = VALUES(experiences),
			certifications = VALUES(certifications),
			completed_at = VALUES(completed_at),
			updated_at = VALUES(updated_at)`,
		userID,
		name,
		email,
		phone,
		birthDate.Format("2006-01-02"),
		gender,
		religion,
		address,
		domicileAddress,
		city,
		province,
		educationsJSON,
		experiencesJSON,
		[]byte("[]"),
		now,
		now,
		now,
	)
	return err
}

func marshalWebApplicantEducations(items []webApplicantEducation) ([]byte, error) {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		degree, fieldOfStudy := splitWebApplicantDegree(item.Degree)
		startYear, endYear := splitWebApplicantYearRange(item.Year)
		out = append(out, map[string]any{
			"degree":         degree,
			"institution":    strings.TrimSpace(item.Institution),
			"field_of_study": fieldOfStudy,
			"start_year":     startYear,
			"end_year":       endYear,
			"gpa":            strings.TrimSpace(item.GPA),
			"is_current":     false,
		})
	}
	return json.Marshal(out)
}

func marshalWebApplicantExperiences(items []webApplicantExperience, profile string) ([]byte, error) {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		startDate, endDate, isCurrent := parseWebApplicantDuration(item.Duration)
		descriptionParts := make([]string, 0, len(item.Responsibilities)+1)
		if strings.TrimSpace(profile) != "" {
			descriptionParts = append(descriptionParts, strings.TrimSpace(profile))
		}
		for _, responsibility := range item.Responsibilities {
			trimmed := strings.TrimSpace(responsibility)
			if trimmed != "" {
				descriptionParts = append(descriptionParts, trimmed)
			}
		}
		out = append(out, map[string]any{
			"position":        strings.TrimSpace(item.Role),
			"company":         strings.TrimSpace(item.Company),
			"employment_type": "Full-time",
			"start_date":      startDate,
			"end_date":        endDate,
			"is_current":      isCurrent,
			"description":     strings.Join(descriptionParts, ". "),
		})
	}
	return json.Marshal(out)
}

func splitWebApplicantDegree(value string) (string, string) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", ""
	}
	parts := strings.Fields(trimmed)
	if len(parts) == 0 {
		return "", ""
	}
	level := parts[0]
	field := strings.TrimSpace(strings.TrimPrefix(trimmed, level))
	if field == "" {
		field = trimmed
	}
	return level, field
}

func splitWebApplicantYearRange(value string) (int, int) {
	parts := strings.Split(strings.TrimSpace(value), "-")
	if len(parts) != 2 {
		return 0, 0
	}
	startYear, _ := strconv.Atoi(strings.TrimSpace(parts[0]))
	endYear, _ := strconv.Atoi(strings.TrimSpace(parts[1]))
	return startYear, endYear
}

func parseWebApplicantDuration(value string) (string, string, bool) {
	normalized := strings.TrimSpace(value)
	parts := strings.Split(normalized, "-")
	if len(parts) != 2 {
		return "", "", false
	}

	startDate := parseWebApplicantDatePart(parts[0], false)
	endPart := strings.TrimSpace(parts[1])
	if strings.EqualFold(endPart, "Sekarang") {
		return startDate, "", true
	}
	return startDate, parseWebApplicantDatePart(endPart, true), false
}

func parseWebApplicantDatePart(value string, endOfPeriod bool) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}

	months := map[string]time.Month{
		"jan": 1, "januari": 1,
		"feb": 2, "februari": 2,
		"mar": 3, "maret": 3,
		"apr": 4, "april": 4,
		"mei": 5,
		"jun": 6, "juni": 6,
		"jul": 7, "juli": 7,
		"agu": 8, "agustus": 8,
		"sep": 9, "september": 9,
		"okt": 10, "oktober": 10,
		"nov": 11, "november": 11,
		"des": 12, "desember": 12,
	}

	parts := strings.Fields(strings.ToLower(trimmed))
	if len(parts) == 1 {
		year, err := strconv.Atoi(parts[0])
		if err != nil {
			return ""
		}
		if endOfPeriod {
			return fmt.Sprintf("%04d-12-31", year)
		}
		return fmt.Sprintf("%04d-01-01", year)
	}

	year, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		return ""
	}
	month, ok := months[parts[0]]
	if !ok {
		if endOfPeriod {
			return fmt.Sprintf("%04d-12-31", year)
		}
		return fmt.Sprintf("%04d-01-01", year)
	}
	day := 1
	if endOfPeriod {
		day = daysInWebApplicantMonth(year, month)
	}
	return fmt.Sprintf("%04d-%02d-%02d", year, int(month), day)
}

func daysInWebApplicantMonth(year int, month time.Month) int {
	return time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

func parseWebApplicantLocation(value string) (string, string) {
	parts := strings.Split(value, ",")
	if len(parts) >= 2 {
		return strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1])
	}

	city := strings.TrimSpace(value)
	switch strings.ToLower(city) {
	case "jakarta":
		return "Jakarta", "DKI Jakarta"
	case "yogyakarta":
		return "Yogyakarta", "DI Yogyakarta"
	case "semarang":
		return "Semarang", "Jawa Tengah"
	case "surabaya":
		return "Surabaya", "Jawa Timur"
	case "bandung":
		return "Bandung", "Jawa Barat"
	default:
		return city, ""
	}
}

func normalizeWebApplicantPhone(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	trimmed = strings.ReplaceAll(trimmed, "-", "")
	trimmed = strings.ReplaceAll(trimmed, " ", "")
	if strings.HasPrefix(trimmed, "+62") {
		return "0" + strings.TrimPrefix(trimmed, "+62")
	}
	return trimmed
}

func webApplicantAddress(city, province string) string {
	switch strings.ToLower(city) {
	case "bandung":
		return "Jl. Sukajadi No. 88, Kec. Sukajadi, Bandung, Jawa Barat"
	case "jakarta":
		return "Jl. Tebet Raya No. 21, Kec. Tebet, Jakarta Selatan, DKI Jakarta"
	case "surabaya":
		return "Jl. Manyar Kertoarjo No. 15, Kec. Gubeng, Surabaya, Jawa Timur"
	case "yogyakarta":
		return "Jl. Kaliurang KM 5 No. 12, Kec. Depok, Yogyakarta, DI Yogyakarta"
	case "semarang":
		return "Jl. Setiabudi No. 19, Kec. Banyumanik, Semarang, Jawa Tengah"
	default:
		return fmt.Sprintf("Jl. Utama No. 1, %s, %s", city, province)
	}
}

func webApplicantDomicileAddress(city, province string) string {
	switch strings.ToLower(city) {
	case "bandung":
		return "Jl. Ciumbuleuit No. 54, Kec. Cidadap, Bandung, Jawa Barat"
	case "jakarta":
		return "Jl. Pancoran Timur No. 10, Kec. Pancoran, Jakarta Selatan, DKI Jakarta"
	case "surabaya":
		return "Jl. Mulyosari No. 33, Kec. Sukolilo, Surabaya, Jawa Timur"
	case "yogyakarta":
		return "Jl. Gejayan No. 27, Kec. Depok, Sleman, DI Yogyakarta"
	case "semarang":
		return "Jl. Ngesrep Timur No. 7, Kec. Banyumanik, Semarang, Jawa Tengah"
	default:
		return fmt.Sprintf("Jl. Domisili No. 1, %s, %s", city, province)
	}
}

func webApplicantBirthDate(index int) time.Time {
	birthDates := []time.Time{
		time.Date(1999, 4, 12, 0, 0, 0, 0, time.UTC),
		time.Date(1998, 9, 25, 0, 0, 0, 0, time.UTC),
		time.Date(1998, 1, 19, 0, 0, 0, 0, time.UTC),
		time.Date(1997, 11, 8, 0, 0, 0, 0, time.UTC),
		time.Date(1998, 6, 14, 0, 0, 0, 0, time.UTC),
	}
	if index < 0 || index >= len(birthDates) {
		return time.Date(1998, 1, 1, 0, 0, 0, 0, time.UTC)
	}
	return birthDates[index]
}
