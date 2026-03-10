package pelamar

import (
	"fmt"
	"hris-backend/internal/http/handlers"
	"hris-backend/internal/models"
	"strconv"
	"strings"
	"time"
)

func validatePersonalRequired(profile *models.ApplicantProfile) handlers.FieldErrors {
	errs := handlers.FieldErrors{}

	fullName := strings.TrimSpace(handlers.FirstString(profile.FullName, ""))
	email := strings.TrimSpace(handlers.FirstString(profile.Email, ""))
	phone := normalizePhoneNumber(handlers.FirstString(profile.Phone, ""))
	gender := strings.TrimSpace(handlers.FirstString(profile.Gender, ""))
	religion := strings.TrimSpace(handlers.FirstString(profile.Religion, ""))
	address := strings.TrimSpace(handlers.FirstString(profile.Address, ""))
	domicileAddress := strings.TrimSpace(handlers.FirstString(profile.DomicileAddress, ""))
	city := strings.TrimSpace(handlers.FirstString(profile.City, ""))
	province := strings.TrimSpace(handlers.FirstString(profile.Province, ""))

	if fullName == "" {
		errs["personal.full_name"] = "Nama lengkap wajib diisi."
	}
	if email == "" {
		errs["personal.email"] = "Email wajib diisi."
	} else if !strings.Contains(email, "@") {
		errs["personal.email"] = "Format email tidak valid."
	}
	if phone == "" {
		errs["personal.phone"] = "Nomor telepon wajib diisi."
	} else if !isValidPhoneNumber(phone) {
		errs["personal.phone"] = "Nomor telepon harus 8-13 digit angka."
	}
	if profile.DateOfBirth == nil {
		errs["personal.date_of_birth"] = "Tanggal lahir wajib diisi."
	}
	if gender == "" {
		errs["personal.gender"] = "Jenis kelamin wajib diisi."
	}
	if religion == "" {
		errs["personal.religion"] = "Agama wajib diisi."
	}
	if address == "" {
		errs["personal.address"] = "Alamat lengkap wajib diisi."
	}
	if domicileAddress == "" {
		errs["personal.domicile_address"] = "Alamat domisili wajib diisi."
	}
	if province == "" {
		errs["personal.province"] = "Provinsi wajib diisi."
	}
	if city == "" {
		errs["personal.city"] = "Kota/Kabupaten wajib diisi."
	}

	return errs
}

func validateEducationRequired(educations []map[string]any) handlers.FieldErrors {
	errs := handlers.FieldErrors{}
	if len(educations) == 0 {
		errs["educations"] = "Minimal 1 riwayat pendidikan wajib diisi."
		return errs
	}

	for i, education := range educations {
		institution := strings.TrimSpace(anyToTrimmedString(education["institution"]))
		degree := strings.TrimSpace(anyToTrimmedString(education["degree"]))
		fieldOfStudy := strings.TrimSpace(anyToTrimmedString(education["field_of_study"]))
		startYear := strings.TrimSpace(anyToTrimmedString(education["start_year"]))
		endYear := strings.TrimSpace(anyToTrimmedString(education["end_year"]))
		gpa := strings.TrimSpace(anyToTrimmedString(education["gpa"]))

		prefix := "educations." + strconv.Itoa(i) + "."
		if institution == "" {
			errs[prefix+"institution"] = "Nama institusi wajib diisi."
		}
		if degree == "" {
			errs[prefix+"degree"] = "Jenjang wajib diisi."
		}
		if fieldOfStudy == "" {
			errs[prefix+"field_of_study"] = "Program studi wajib diisi."
		}
		if startYear == "" {
			errs[prefix+"start_year"] = "Tahun mulai wajib diisi."
		} else if _, ok := toInt(education["start_year"]); !ok {
			errs[prefix+"start_year"] = "Tahun mulai harus berupa angka."
		}
		if endYear == "" {
			errs[prefix+"end_year"] = "Tahun selesai wajib diisi."
		} else if _, ok := toInt(education["end_year"]); !ok {
			errs[prefix+"end_year"] = "Tahun selesai harus berupa angka."
		}
		if requiresEducationGPA(degree) && gpa == "" {
			errs[prefix+"gpa"] = "IPK wajib diisi untuk jenjang ini."
		} else if gpa != "" {
			value, err := strconv.ParseFloat(gpa, 64)
			if err != nil {
				errs[prefix+"gpa"] = "Format IPK tidak valid."
			} else if value < 0 || value > 4 {
				errs[prefix+"gpa"] = "IPK harus antara 0.00 sampai 4.00."
			}
		}
	}

	return errs
}

func validateExperienceRequired(experiences []map[string]any) handlers.FieldErrors {
	errs := handlers.FieldErrors{}

	for i, experience := range experiences {
		company := strings.TrimSpace(anyToTrimmedString(experience["company"]))
		position := strings.TrimSpace(anyToTrimmedString(experience["position"]))
		start := strings.TrimSpace(anyToTrimmedString(experience["start_date"]))
		end := strings.TrimSpace(anyToTrimmedString(experience["end_date"]))
		description := strings.TrimSpace(anyToTrimmedString(experience["description"]))
		isCurrent, _ := experience["is_current"].(bool)

		prefix := "experiences." + strconv.Itoa(i) + "."
		if company == "" {
			errs[prefix+"company"] = "Nama perusahaan wajib diisi."
		}
		if position == "" {
			errs[prefix+"position"] = "Posisi wajib diisi."
		}
		if start == "" {
			errs[prefix+"start_date"] = "Tanggal mulai wajib diisi."
		}
		if !isCurrent && end == "" {
			errs[prefix+"end_date"] = "Tanggal selesai wajib diisi."
		}
		if description == "" {
			errs[prefix+"description"] = "Deskripsi tugas wajib diisi."
		}
	}

	return errs
}

func validateCertificationRequired(certs []map[string]any) handlers.FieldErrors {
	errs := handlers.FieldErrors{}

	for i, cert := range certs {
		name := strings.TrimSpace(anyToTrimmedString(cert["name"]))
		organization := strings.TrimSpace(anyToTrimmedString(cert["issuing_organization"]))
		issueDate := strings.TrimSpace(anyToTrimmedString(cert["issue_date"]))
		expiryDate := strings.TrimSpace(anyToTrimmedString(cert["expiry_date"]))

		prefix := "certifications." + strconv.Itoa(i) + "."
		if name == "" {
			errs[prefix+"name"] = "Nama sertifikasi wajib diisi."
		}
		if organization == "" {
			errs[prefix+"issuing_organization"] = "Organisasi penerbit wajib diisi."
		}
		if issueDate == "" {
			errs[prefix+"issue_date"] = "Tanggal terbit wajib diisi."
		}
		if issueDate != "" && !isValidYearMonth(issueDate) {
			errs[prefix+"issue_date"] = "Format tanggal terbit tidak valid (YYYY-MM)."
		}
		if expiryDate != "" && !isValidYearMonth(expiryDate) {
			errs[prefix+"expiry_date"] = "Format tanggal kadaluarsa tidak valid (YYYY-MM)."
		}
		if issueDate != "" && expiryDate != "" && isValidYearMonth(issueDate) && isValidYearMonth(expiryDate) && expiryDate < issueDate {
			errs[prefix+"expiry_date"] = "Tanggal kadaluarsa tidak boleh sebelum tanggal terbit."
		}
	}

	return errs
}

func requiresEducationGPA(degree string) bool {
	normalized := strings.ToUpper(strings.TrimSpace(degree))
	switch normalized {
	case "D3", "D4", "S1", "S2", "S3":
		return true
	default:
		return false
	}
}

func validateEducationYears(educations []map[string]any) handlers.FieldErrors {
	errs := handlers.FieldErrors{}
	currentYear := time.Now().Year()
	minYear := 1900

	for i, education := range educations {
		startYear, hasStartYear := toInt(education["start_year"])
		endYear, hasEndYear := toInt(education["end_year"])
		startYearField := "educations." + strconv.Itoa(i) + ".start_year"
		endYearField := "educations." + strconv.Itoa(i) + ".end_year"

		if hasStartYear && (startYear < minYear || startYear > currentYear) {
			errs[startYearField] = "Tahun mulai harus antara 1900 dan tahun sekarang."
		}
		if hasEndYear && endYear < minYear {
			errs[endYearField] = "Tahun selesai minimal 1900."
		}
		if hasStartYear && hasEndYear && endYear < startYear {
			errs[endYearField] = "Tahun selesai tidak boleh lebih kecil dari tahun mulai."
		}
		if hasStartYear && hasEndYear && endYear > startYear+7 {
			errs[endYearField] = "Tahun selesai maksimal 7 tahun dari tahun mulai."
		}
	}

	return errs
}

func validateExperiencePeriods(experiences []map[string]any) handlers.FieldErrors {
	errs := handlers.FieldErrors{}

	for i, experience := range experiences {
		start := strings.TrimSpace(anyToTrimmedString(experience["start_date"]))
		end := strings.TrimSpace(anyToTrimmedString(experience["end_date"]))
		isCurrent, _ := experience["is_current"].(bool)

		startField := "experiences." + strconv.Itoa(i) + ".start_date"
		endField := "experiences." + strconv.Itoa(i) + ".end_date"

		if start != "" && !isValidYearMonth(start) {
			errs[startField] = "Format tanggal mulai tidak valid (YYYY-MM)."
		}
		if end != "" && !isValidYearMonth(end) {
			errs[endField] = "Format tanggal selesai tidak valid (YYYY-MM)."
		}

		if isCurrent {
			experience["end_date"] = ""
			continue
		}

		if start != "" && end != "" && isValidYearMonth(start) && isValidYearMonth(end) && end < start {
			errs[endField] = "Tanggal selesai tidak boleh sebelum tanggal mulai."
		}
	}

	return errs
}

func isValidYearMonth(value string) bool {
	if len(value) != len("2006-01") {
		return false
	}
	_, err := time.Parse("2006-01", value)
	return err == nil
}

func anyToTrimmedString(value any) string {
	switch v := value.(type) {
	case string:
		return strings.TrimSpace(v)
	case float64:
		return strings.TrimSpace(strconv.FormatFloat(v, 'f', -1, 64))
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	default:
		return ""
	}
}

func toInt(value any) (int, bool) {
	switch v := value.(type) {
	case float64:
		return int(v), true
	case int:
		return v, true
	case string:
		if v == "" {
			return 0, false
		}
		i, err := strconv.Atoi(v)
		return i, err == nil
	default:
		return 0, false
	}
}

func calculateAge(dob *time.Time) *int {
	if dob == nil || dob.IsZero() {
		return nil
	}
	age := int(time.Since(*dob).Hours() / 24 / 365)
	return &age
}

func highestEducationLevel(raw models.JSON) string {
	educations := decodeJSONArray(raw)
	highestRank := -1
	highest := ""
	for _, edu := range educations {
		degree, _ := edu["degree"].(string)
		if degree == "" {
			continue
		}
		rank := educationRank(degree)
		if rank > highestRank {
			highestRank = rank
			highest = degree
		}
	}
	return highest
}

func educationRank(level string) int {
	ranks := map[string]int{
		"SMA": 1,
		"SMK": 1,
		"D1":  2,
		"D2":  3,
		"D3":  4,
		"D4":  5,
		"S1":  5,
		"S2":  6,
		"S3":  7,
	}
	return ranks[strings.ToUpper(level)]
}

func totalExperienceYears(raw models.JSON) float64 {
	experiences := decodeJSONArray(raw)
	totalMonths := 0
	now := time.Now()

	for _, exp := range experiences {
		startValue := strings.TrimSpace(anyToTrimmedString(exp["start_date"]))
		if startValue == "" {
			if startYear, ok := toInt(exp["start_year"]); ok && startYear > 0 {
				startValue = fmt.Sprintf("%04d-01", startYear)
			}
		}
		if !isValidYearMonth(startValue) {
			continue
		}

		startDate, err := time.Parse("2006-01", startValue)
		if err != nil {
			continue
		}

		endDate := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		if curr, ok := exp["is_current"].(bool); !ok || !curr {
			endValue := strings.TrimSpace(anyToTrimmedString(exp["end_date"]))
			if endValue == "" {
				if endYear, ok := toInt(exp["end_year"]); ok && endYear > 0 {
					endValue = fmt.Sprintf("%04d-12", endYear)
				}
			}
			if isValidYearMonth(endValue) {
				if parsedEndDate, parseErr := time.Parse("2006-01", endValue); parseErr == nil {
					endDate = parsedEndDate
				}
			}
		}

		months := (endDate.Year()-startDate.Year())*12 + int(endDate.Month()-startDate.Month()) + 1
		if months > 0 {
			totalMonths += months
		}
	}

	return float64(totalMonths) / 12.0
}

func expectedAgeText(minAge, maxAge int) string {
	if minAge > 0 && maxAge > 0 {
		return fmt.Sprintf("%d - %d tahun", minAge, maxAge)
	}
	if minAge > 0 {
		return fmt.Sprintf("Minimal %d tahun", minAge)
	}
	if maxAge > 0 {
		return fmt.Sprintf("Maksimal %d tahun", maxAge)
	}
	return "Tidak ada batas usia"
}
