package seed

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"hris-backend/internal/models"
	"hris-backend/internal/services"

	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type applicantSeed struct {
	Filename   string `json:"filename"`
	Category   string `json:"category"`
	Level      string `json:"level"`
	Name       string `json:"name"`
	Title      string `json:"title"`
	University string `json:"university"`
	Major      string `json:"major"`
}

const applicantSeedRawJSON = `[
  {"filename":"web_fresh_01_rama_pratama.docx","category":"Web Developer","level":"fresh","name":"Rama Pratama","title":"Fresh Graduate Web Developer","university":"Institut Teknologi Sepuluh Nopember","major":"Informatika"},
  {"filename":"web_fresh_02_farhan_fakhri.docx","category":"Web Developer","level":"fresh","name":"Farhan Fakhri","title":"Backend Developer Intern","university":"Universitas Airlangga","major":"Informatika"},
  {"filename":"web_fresh_03_rizal_hakim.docx","category":"Web Developer","level":"fresh","name":"Rizal Hakim","title":"Fresh Graduate Web Developer","university":"Universitas Indonesia","major":"Sistem Informasi"},
  {"filename":"web_fresh_04_rama_wijaya.docx","category":"Web Developer","level":"fresh","name":"Rama Wijaya","title":"Junior Web Developer","university":"Institut Teknologi Sepuluh Nopember","major":"Teknologi Informasi"},
  {"filename":"web_fresh_05_maya_mahendra.docx","category":"Web Developer","level":"fresh","name":"Maya Mahendra","title":"Fullstack Web Developer Intern","university":"Universitas Indonesia","major":"Informatika"},
  {"filename":"web_mid_06_muhamad_hakim.docx","category":"Web Developer","level":"mid","name":"Muhamad Hakim","title":"Application Developer","university":"Universitas Gadjah Mada","major":"Ilmu Komputer"},
  {"filename":"web_mid_07_rizky_lestari.docx","category":"Web Developer","level":"mid","name":"Rizky Lestari","title":"Frontend Engineer","university":"Universitas Muhammadiyah Yogyakarta","major":"Teknologi Informasi"},
  {"filename":"web_mid_08_wahyu_pratama.docx","category":"Web Developer","level":"mid","name":"Wahyu Pratama","title":"Backend Developer","university":"Telkom University","major":"Ilmu Komputer"},
  {"filename":"web_mid_09_yusuf_kurniawan.docx","category":"Web Developer","level":"mid","name":"Yusuf Kurniawan","title":"Application Developer","university":"Institut Teknologi Sepuluh Nopember","major":"Teknologi Informasi"},
  {"filename":"web_mid_10_arif_anggraini.docx","category":"Web Developer","level":"mid","name":"Arif Anggraini","title":"Fullstack Web Developer","university":"Universitas Brawijaya","major":"Ilmu Komputer"},
  {"filename":"web_senior_11_arif_nugraha.docx","category":"Web Developer","level":"senior","name":"Arif Nugraha","title":"Senior Software Engineer","university":"Universitas Indonesia","major":"Sistem Informasi"},
  {"filename":"web_senior_12_reza_putra.docx","category":"Web Developer","level":"senior","name":"Reza Putra","title":"Technical Lead - Web Platform","university":"Institut Teknologi Bandung","major":"Informatika"},
  {"filename":"web_senior_13_yoga_pratama.docx","category":"Web Developer","level":"senior","name":"Yoga Pratama","title":"Senior Backend Engineer","university":"Universitas Padjadjaran","major":"Ilmu Komputer"},
  {"filename":"web_senior_14_farhan_saputra.docx","category":"Web Developer","level":"senior","name":"Farhan Saputra","title":"Senior Backend Engineer","university":"Institut Teknologi Sepuluh Nopember","major":"Informatika"},
  {"filename":"web_senior_15_rafi_putra.docx","category":"Web Developer","level":"senior","name":"Rafi Putra","title":"Technical Lead - Web Platform","university":"Institut Teknologi Bandung","major":"Ilmu Komputer"},
  {"filename":"it_fresh_01_salsa_ananda.docx","category":"IT Related","level":"fresh","name":"Salsa Ananda","title":"Junior Business Analyst","university":"Universitas Sebelas Maret","major":"Informatika"},
  {"filename":"it_fresh_02_gilang_ananda.docx","category":"IT Related","level":"fresh","name":"Gilang Ananda","title":"IT Support","university":"Institut Teknologi Sepuluh Nopember","major":"Statistika"},
  {"filename":"it_fresh_03_galih_putra.docx","category":"IT Related","level":"fresh","name":"Galih Putra","title":"Junior Business Analyst","university":"Institut Teknologi Bandung","major":"Teknologi Informasi"},
  {"filename":"it_fresh_04_dimas_ramadhan.docx","category":"IT Related","level":"fresh","name":"Dimas Ramadhan","title":"QA Engineer Intern","university":"Telkom University","major":"Statistika"},
  {"filename":"it_fresh_05_intan_nugraha.docx","category":"IT Related","level":"fresh","name":"Intan Nugraha","title":"Junior Business Analyst","university":"Institut Teknologi Bandung","major":"Informatika"},
  {"filename":"it_mid_06_hilmi_salsabila.docx","category":"IT Related","level":"mid","name":"Hilmi Salsabila","title":"IT Support Engineer","university":"Universitas Padjadjaran","major":"Informatika"},
  {"filename":"it_mid_07_adit_utami.docx","category":"IT Related","level":"mid","name":"Adit Utami","title":"System Analyst","university":"Universitas Airlangga","major":"Teknik Industri"},
  {"filename":"it_mid_08_aulia_amelia.docx","category":"IT Related","level":"mid","name":"Aulia Amelia","title":"IT Support Engineer","university":"Universitas Diponegoro","major":"Sistem Informasi"},
  {"filename":"it_mid_09_reza_putra.docx","category":"IT Related","level":"mid","name":"Reza Putra","title":"IT Support Engineer","university":"Universitas Muhammadiyah Yogyakarta","major":"Statistika"},
  {"filename":"it_mid_10_bagas_ananda.docx","category":"IT Related","level":"mid","name":"Bagas Ananda","title":"Data Analyst","university":"Universitas Gadjah Mada","major":"Sistem Informasi"},
  {"filename":"it_senior_11_citra_lestari.docx","category":"IT Related","level":"senior","name":"Citra Lestari","title":"Senior Business Analyst","university":"Universitas Brawijaya","major":"Sistem Informasi"},
  {"filename":"it_senior_12_farhan_fakhri.docx","category":"IT Related","level":"senior","name":"Farhan Fakhri","title":"QA Lead","university":"Universitas Indonesia","major":"Informatika"},
  {"filename":"it_senior_13_naufal_permana.docx","category":"IT Related","level":"senior","name":"Naufal Permana","title":"Senior Business Analyst","university":"Universitas Diponegoro","major":"Teknik Industri"},
  {"filename":"it_senior_14_gilang_hidayat.docx","category":"IT Related","level":"senior","name":"Gilang Hidayat","title":"QA Lead","university":"Universitas Brawijaya","major":"Sistem Informasi"},
  {"filename":"it_senior_15_lukman_lestari.docx","category":"IT Related","level":"senior","name":"Lukman Lestari","title":"Senior Business Analyst","university":"Universitas Brawijaya","major":"Statistika"},
  {"filename":"nonit_fresh_01_hafiz_kusuma.docx","category":"Non-IT","level":"fresh","name":"Hafiz Kusuma","title":"Management Trainee","university":"Universitas Padjadjaran","major":"Manajemen"},
  {"filename":"nonit_fresh_02_yoga_kurniawan.docx","category":"Non-IT","level":"fresh","name":"Yoga Kurniawan","title":"Junior Marketing Staff","university":"Universitas Negeri Yogyakarta","major":"Psikologi"},
  {"filename":"nonit_fresh_03_dinda_nugraha.docx","category":"Non-IT","level":"fresh","name":"Dinda Nugraha","title":"Junior Marketing Staff","university":"Universitas Diponegoro","major":"Psikologi"},
  {"filename":"nonit_fresh_04_citra_salsabila.docx","category":"Non-IT","level":"fresh","name":"Citra Salsabila","title":"HR Administration Staff","university":"Universitas Padjadjaran","major":"Pendidikan Ekonomi"},
  {"filename":"nonit_fresh_05_tiara_ananda.docx","category":"Non-IT","level":"fresh","name":"Tiara Ananda","title":"Junior Marketing Staff","university":"Universitas Sebelas Maret","major":"Psikologi"},
  {"filename":"nonit_mid_06_siti_firmansyah.docx","category":"Non-IT","level":"mid","name":"Siti Firmansyah","title":"Marketing Executive","university":"Universitas Diponegoro","major":"Ilmu Komunikasi"},
  {"filename":"nonit_mid_07_wahyu_salsabila.docx","category":"Non-IT","level":"mid","name":"Wahyu Salsabila","title":"Operations Officer","university":"Universitas Negeri Yogyakarta","major":"Ilmu Komunikasi"},
  {"filename":"nonit_mid_08_lukman_purnama.docx","category":"Non-IT","level":"mid","name":"Lukman Purnama","title":"Education Program Officer","university":"Universitas Pendidikan Indonesia","major":"Pendidikan Ekonomi"},
  {"filename":"nonit_mid_09_vina_mahendra.docx","category":"Non-IT","level":"mid","name":"Vina Mahendra","title":"Procurement Staff","university":"Universitas Muhammadiyah Yogyakarta","major":"Ilmu Komunikasi"},
  {"filename":"nonit_mid_10_wahyu_utami.docx","category":"Non-IT","level":"mid","name":"Wahyu Utami","title":"Operations Officer","university":"Universitas Muhammadiyah Yogyakarta","major":"Ilmu Komunikasi"},
  {"filename":"nonit_senior_11_aditya_utami.docx","category":"Non-IT","level":"senior","name":"Aditya Utami","title":"HR Generalist","university":"Universitas Pendidikan Indonesia","major":"Ilmu Komunikasi"},
  {"filename":"nonit_senior_12_nanda_pratama.docx","category":"Non-IT","level":"senior","name":"Nanda Pratama","title":"Office Manager","university":"Universitas Brawijaya","major":"Administrasi Bisnis"},
  {"filename":"nonit_senior_13_galih_setiawan.docx","category":"Non-IT","level":"senior","name":"Galih Setiawan","title":"Office Manager","university":"Universitas Negeri Yogyakarta","major":"Pendidikan Ekonomi"},
  {"filename":"nonit_senior_14_bagas_pratama.docx","category":"Non-IT","level":"senior","name":"Bagas Pratama","title":"Marketing Supervisor","university":"Universitas Muhammadiyah Yogyakarta","major":"Ilmu Komunikasi"},
  {"filename":"nonit_senior_15_wahyu_firmansyah.docx","category":"Non-IT","level":"senior","name":"Wahyu Firmansyah","title":"Program Coordinator","university":"Universitas Jenderal Soedirman","major":"Administrasi Bisnis"}
]`

func RunApplicantSeeder(database *sqlx.DB) error {
	if database == nil {
		return errors.New("database connection is nil")
	}

	var items []applicantSeed
	if err := json.Unmarshal([]byte(applicantSeedRawJSON), &items); err != nil {
		return fmt.Errorf("parse applicant seed data: %w", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	now := time.Now()
	emailAssignments := buildApplicantSeedEmails(items)
	for _, item := range items {
		email := emailAssignments[strings.TrimSpace(item.Filename)]
		if err := upsertApplicantSeed(database, item, email, string(hash), now); err != nil {
			return err
		}
	}
	return nil
}

func upsertApplicantSeed(database *sqlx.DB, item applicantSeed, email string, passwordHash string, now time.Time) error {
	legacyEmail := applicantSeedLegacyEmail(item)
	name := strings.TrimSpace(item.Name)

	var existing models.User
	err := database.Get(&existing, "SELECT * FROM users WHERE email = ? LIMIT 1", email)
	if errors.Is(err, sql.ErrNoRows) && legacyEmail != "" && !strings.EqualFold(legacyEmail, email) {
		err = database.Get(&existing, "SELECT * FROM users WHERE email = ? LIMIT 1", legacyEmail)
	}
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
			employeeCode, name, email, models.RolePelamar, now.Format("2006-01-02"), now, passwordHash, now, existing.ID); err != nil {
			return err
		}
	}

	if err := upsertApplicantProfile(database, userID, email, item, now); err != nil {
		return err
	}
	if err := resetApplicantSeedApplications(database, userID); err != nil {
		return err
	}
	return nil
}

func upsertApplicantProfile(database *sqlx.DB, userID int64, email string, item applicantSeed, now time.Time) error {
	educationsJSON, err := json.Marshal([]map[string]any{
		{
			"degree":         "S1",
			"institution":    strings.TrimSpace(item.University),
			"field_of_study": strings.TrimSpace(item.Major),
			"start_year":     applicantStartYear(item.Level),
			"end_year":       applicantEndYear(item.Level),
			"gpa":            applicantSeedGPA(item.Filename),
			"is_current":     false,
		},
	})
	if err != nil {
		return err
	}

	experiencesJSON, err := json.Marshal(applicantExperiences(item))
	if err != nil {
		return err
	}

	if _, err = database.Exec(`INSERT INTO applicant_profiles
		(user_id, full_name, email, phone, date_of_birth, gender, religion, address, domicile_address, city, province, educations, experiences, completed_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
			completed_at = VALUES(completed_at),
			updated_at = VALUES(updated_at)`,
		userID,
		strings.TrimSpace(item.Name),
		email,
		applicantSeedPhone(item.Filename),
		applicantDateOfBirth(item.Level),
		applicantGender(item.Filename),
		applicantReligion(item.Filename),
		applicantAddress(item),
		applicantDomicileAddress(item),
		applicantCity(item.Category),
		applicantProvince(item.Category),
		educationsJSON,
		experiencesJSON,
		now,
		now,
		now,
	); err != nil {
		return err
	}
	return nil
}

func resetApplicantSeedApplications(database *sqlx.DB, userID int64) error {
	if database == nil || userID <= 0 {
		return nil
	}
	_, err := database.Exec("DELETE FROM applications WHERE user_id = ?", userID)
	return err
}

func applicantSeedLegacyEmail(item applicantSeed) string {
	base := strings.TrimSpace(strings.TrimSuffix(strings.ToLower(item.Filename), ".docx"))
	base = strings.ReplaceAll(base, " ", "_")
	return base + "@pelamar.local"
}

func buildApplicantSeedEmails(items []applicantSeed) map[string]string {
	out := make(map[string]string, len(items))
	seen := map[string]int{}
	for _, item := range items {
		filename := strings.TrimSpace(item.Filename)
		if filename == "" {
			continue
		}
		localPart := normalizeApplicantEmailLocalPart(item.Name)
		if localPart == "" {
			localPart = "pelamar"
		}
		seen[localPart]++
		emailLocal := localPart
		if seen[localPart] > 1 {
			emailLocal = fmt.Sprintf("%s%d", localPart, seen[localPart])
		}
		out[filename] = emailLocal + "@gmail.com"
	}
	return out
}

func normalizeApplicantEmailLocalPart(name string) string {
	trimmed := strings.TrimSpace(strings.ToLower(name))
	if trimmed == "" {
		return ""
	}
	var builder strings.Builder
	lastDot := false
	for _, r := range trimmed {
		switch {
		case r >= 'a' && r <= 'z':
			builder.WriteRune(r)
			lastDot = false
		case r >= '0' && r <= '9':
			builder.WriteRune(r)
			lastDot = false
		case r == ' ' || r == '.' || r == '_' || r == '-':
			if builder.Len() == 0 || lastDot {
				continue
			}
			builder.WriteRune('.')
			lastDot = true
		}
	}
	result := strings.Trim(builder.String(), ".")
	return result
}

func applicantSeedPhone(filename string) string {
	seed := 10000000 + (applicantSeedNumber(filename) * 137351 % 90000000)
	return fmt.Sprintf("0812%08d", seed)
}

func applicantStartYear(level string) int {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "senior":
		return 2012
	case "mid":
		return 2016
	default:
		return 2019
	}
}

func applicantEndYear(level string) int {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "senior":
		return 2016
	case "mid":
		return 2020
	default:
		return 2023
	}
}

func applicantExperiences(item applicantSeed) []map[string]any {
	level := strings.ToLower(strings.TrimSpace(item.Level))
	title := strings.TrimSpace(item.Title)
	switch level {
	case "senior":
		return []map[string]any{
			{
				"position":        title,
				"company":         "Perusahaan Teknologi Dummy",
				"employment_type": "Full-time",
				"start_date":      "2018-01-01",
				"end_date":        "2024-12-31",
				"is_current":      false,
				"description":     "Memimpin atau mengerjakan fungsi utama sesuai jabatan pada dataset dummy.",
			},
		}
	case "mid":
		return []map[string]any{
			{
				"position":        title,
				"company":         "Perusahaan Operasional Dummy",
				"employment_type": "Full-time",
				"start_date":      "2021-01-01",
				"end_date":        "2024-12-31",
				"is_current":      false,
				"description":     "Pengalaman kerja menengah sesuai jabatan pada dataset dummy.",
			},
		}
	default:
		employmentType := "Internship"
		company := "Perusahaan Internship Dummy"
		description := "Pengalaman magang atau proyek awal sesuai jabatan pada dataset dummy."
		if !strings.Contains(strings.ToLower(title), "intern") {
			employmentType = "Part-time"
			company = "Perusahaan Entry Level Dummy"
			description = "Pengalaman kerja awal, magang, atau proyek profesional sesuai jabatan pada dataset dummy."
		}
		return []map[string]any{
			{
				"position":        title,
				"company":         company,
				"employment_type": employmentType,
				"start_date":      "2023-06-01",
				"end_date":        "2023-12-31",
				"is_current":      false,
				"description":     description,
			},
		}
	}
}

func applicantSeedGPA(filename string) string {
	sum := 0
	for _, r := range filename {
		sum += int(r)
	}
	value := 3.0 + (float64(sum%101) / 100.0)
	if value > 4.0 {
		value = 4.0
	}
	return fmt.Sprintf("%.2f", value)
}

func applicantDateOfBirth(level string) string {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "senior":
		return "1989-08-17"
	case "mid":
		return "1995-08-17"
	default:
		return "2001-08-17"
	}
}

func applicantGender(filename string) string {
	if applicantSeedNumber(filename)%2 == 0 {
		return "Perempuan"
	}
	return "Laki-laki"
}

func applicantReligion(filename string) string {
	options := []string{"Islam", "Kristen", "Katolik", "Hindu", "Buddha"}
	return options[applicantSeedNumber(filename)%len(options)]
}

func applicantAddress(item applicantSeed) string {
	street := applicantStreetName(item.Category, item.Filename, false)
	area := applicantAreaName(item.Category, false)
	return fmt.Sprintf("Jl. %s No. %d, %s, %s", street, 10+applicantSeedNumber(item.Filename)%90, area, applicantCity(item.Category))
}

func applicantDomicileAddress(item applicantSeed) string {
	street := applicantStreetName(item.Category, item.Filename, true)
	area := applicantAreaName(item.Category, true)
	return fmt.Sprintf("Jl. %s No. %d, %s, %s", street, 5+applicantSeedNumber(item.Filename)%50, area, applicantCity(item.Category))
}

func applicantCity(category string) string {
	switch strings.TrimSpace(category) {
	case "Web Developer":
		return "Surabaya"
	case "IT Related":
		return "Bandung"
	default:
		return "Yogyakarta"
	}
}

func applicantProvince(category string) string {
	switch strings.TrimSpace(category) {
	case "Web Developer":
		return "Jawa Timur"
	case "IT Related":
		return "Jawa Barat"
	default:
		return "DI Yogyakarta"
	}
}

func applicantStreetName(category string, filename string, domicile bool) string {
	webPrimary := []string{"Mayjen Sungkono", "Dharmahusada", "Kertajaya", "Ngagel Jaya", "Rungkut Madya"}
	webDomicile := []string{"Manyar Kertoarjo", "Mulyosari", "Semolowaru", "Pucang Anom", "Klampis Jaya"}
	itPrimary := []string{"Ir. H. Juanda", "Pahlawan", "Cihampelas", "Sukajadi", "Setiabudi"}
	itDomicile := []string{"Antapani", "Cicaheum", "Buah Batu", "Batununggal", "Arcamanik"}
	nonITPrimary := []string{"Kaliurang", "Gejayan", "Solo", "Parangtritis", "Magelang"}
	nonITDomicile := []string{"Malioboro", "Timoho", "Demangan", "Prawirotaman", "Sorosutan"}

	index := applicantSeedNumber(filename) % 5
	switch strings.TrimSpace(category) {
	case "Web Developer":
		if domicile {
			return webDomicile[index]
		}
		return webPrimary[index]
	case "IT Related":
		if domicile {
			return itDomicile[index]
		}
		return itPrimary[index]
	default:
		if domicile {
			return nonITDomicile[index]
		}
		return nonITPrimary[index]
	}
}

func applicantAreaName(category string, domicile bool) string {
	switch strings.TrimSpace(category) {
	case "Web Developer":
		if domicile {
			return "Kec. Sukolilo"
		}
		return "Kec. Gubeng"
	case "IT Related":
		if domicile {
			return "Kec. Antapani"
		}
		return "Kec. Coblong"
	default:
		if domicile {
			return "Kec. Umbulharjo"
		}
		return "Kec. Depok"
	}
}

func applicantSeedNumber(filename string) int {
	sum := 0
	for _, r := range filename {
		if r >= '0' && r <= '9' {
			sum += int(r - '0')
		}
	}
	return sum
}

func applicantSkills(category string, level string) string {
	switch strings.TrimSpace(category) {
	case "Web Developer":
		if strings.EqualFold(strings.TrimSpace(level), "senior") {
			return "Go, Node.js, React, REST API, SQL, System Design, Code Review"
		}
		if strings.EqualFold(strings.TrimSpace(level), "mid") {
			return "JavaScript, TypeScript, React, Backend API, SQL, Git"
		}
		return "HTML, CSS, JavaScript, React, dasar backend, Git"
	case "IT Related":
		if strings.EqualFold(strings.TrimSpace(level), "senior") {
			return "Business Analysis, QA Strategy, Documentation, SQL, Stakeholder Management"
		}
		if strings.EqualFold(strings.TrimSpace(level), "mid") {
			return "IT Support, System Analysis, SQL, QA, Reporting"
		}
		return "Analisis kebutuhan, dasar QA, dokumentasi, spreadsheet, komunikasi"
	default:
		if strings.EqualFold(strings.TrimSpace(level), "senior") {
			return "Leadership, komunikasi, operasional, koordinasi tim, reporting"
		}
		if strings.EqualFold(strings.TrimSpace(level), "mid") {
			return "Operasional, administrasi, komunikasi, koordinasi, reporting"
		}
		return "Administrasi, komunikasi, presentasi, Microsoft Office"
	}
}
