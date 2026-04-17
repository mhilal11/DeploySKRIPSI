package profile

import (
	"encoding/json"
	"hris-backend/internal/http/handlers"
	dbrepo "hris-backend/internal/repository"

	"net/http"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func RegisterProfileRoutes(rg *gin.RouterGroup) {
	rg.GET("/profile", GetProfile)
	rg.PATCH("/profile", UpdateProfile)
	rg.PUT("/profile/password", UpdatePassword)
	rg.DELETE("/profile", DeleteProfile)
}

type profileUpdateRequest struct {
	Section            string                `form:"section" json:"section"`
	RemoveProfilePhoto bool                  `form:"remove_profile_photo" json:"remove_profile_photo"`
	Name               string                `form:"name" json:"name"`
	Email              string                `form:"email" json:"email"`
	Phone              string                `form:"phone" json:"phone"`
	DateOfBirth        string                `form:"date_of_birth" json:"date_of_birth"`
	Gender             string                `form:"gender" json:"gender"`
	Religion           string                `form:"religion" json:"religion"`
	Address            string                `form:"address" json:"address"`
	DomicileAddress    string                `form:"domicile_address" json:"domicile_address"`
	City               string                `form:"city" json:"city"`
	Province           string                `form:"province" json:"province"`
	EducationLevel     string                `form:"education_level" json:"education_level"`
	Educations         []staffEducationInput `form:"educations" json:"educations"`
}

type staffEducationInput struct {
	Institution  string `form:"institution" json:"institution"`
	Degree       string `form:"degree" json:"degree"`
	FieldOfStudy string `form:"field_of_study" json:"field_of_study"`
	StartYear    string `form:"start_year" json:"start_year"`
	EndYear      string `form:"end_year" json:"end_year"`
	GPA          string `form:"gpa" json:"gpa"`
}

type passwordUpdateRequest struct {
	CurrentPassword      string `form:"current_password" json:"current_password"`
	Password             string `form:"password" json:"password"`
	PasswordConfirmation string `form:"password_confirmation" json:"password_confirmation"`
}

type deleteProfileRequest struct {
	Password string `form:"password" json:"password"`
}

func GetProfile(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil {
		handlers.JSONError(c, http.StatusUnauthorized, "Unauthenticated")
		return
	}
	status := c.Query("status")
	payload := gin.H{
		"mustVerifyEmail": true,
		"status":          status,
	}

	if user.Role == models.RoleStaff {
		db := middleware.GetDB(c)
		profile, err := dbrepo.GetStaffProfileByUserID(db, user.ID)
		if err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat profil staff")
			return
		}

		staffProfile := gin.H{
			"phone":             "",
			"date_of_birth":     "",
			"gender":            "",
			"religion":          "",
			"address":           "",
			"domicile_address":  "",
			"city":              "",
			"province":          "",
			"education_level":   "",
			"educations":        []map[string]any{},
			"profile_photo_url": nil,
		}
		if profile != nil {
			staffProfile["phone"] = handlers.FirstString(profile.Phone, "")
			staffProfile["date_of_birth"] = handlers.FormatDateISO(profile.DateOfBirth)
			staffProfile["gender"] = handlers.FirstString(profile.Gender, "")
			staffProfile["religion"] = handlers.FirstString(profile.Religion, "")
			staffProfile["address"] = handlers.FirstString(profile.Address, "")
			staffProfile["domicile_address"] = handlers.FirstString(profile.DomicileAddress, "")
			staffProfile["city"] = handlers.FirstString(profile.City, "")
			staffProfile["province"] = handlers.FirstString(profile.Province, "")
			staffProfile["education_level"] = handlers.FirstString(profile.EducationLevel, "")
			staffProfile["educations"] = handlers.DecodeJSONArray(profile.Educations)
			staffProfile["profile_photo_url"] = handlers.AttachmentURL(c, profile.ProfilePhotoPath)
		}

		payload["staffProfile"] = staffProfile
		payload["religionOptions"] = models.StaffReligions
		payload["genderOptions"] = models.StaffGenders
		payload["educationLevelOptions"] = models.StaffEducationLevels
	}

	c.JSON(http.StatusOK, payload)
}

func UpdateProfile(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil {
		handlers.JSONError(c, http.StatusUnauthorized, "Unauthenticated")
		return
	}

	var req profileUpdateRequest
	if err := c.ShouldBind(&req); err != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"name": "Nama wajib diisi.", "email": "Email wajib diisi."})
		return
	}
	req.Name = handlers.NormalizePersonName(req.Name)
	req.Email = handlers.NormalizeEmail(req.Email)
	req.Phone = strings.TrimSpace(req.Phone)
	req.DateOfBirth = strings.TrimSpace(req.DateOfBirth)
	req.Gender = strings.TrimSpace(req.Gender)
	req.Religion = strings.TrimSpace(req.Religion)
	req.Address = strings.TrimSpace(req.Address)
	req.DomicileAddress = strings.TrimSpace(req.DomicileAddress)
	req.City = strings.TrimSpace(req.City)
	req.Province = strings.TrimSpace(req.Province)
	req.EducationLevel = strings.TrimSpace(req.EducationLevel)
	req.Section = strings.ToLower(strings.TrimSpace(req.Section))
	if req.Section == "" {
		req.Section = "all"
	}
	if user.Role == models.RoleStaff {
		req.Phone = normalizePhoneNumber(req.Phone)
	}
	removePhotoRequested := req.RemoveProfilePhoto
	if !removePhotoRequested {
		removePhotoRequested = parseTruthyBoolean(c.PostForm("remove_profile_photo"))
	}

	updatePersonal := req.Section == "all" || req.Section == "personal"
	updateEducation := req.Section == "all" || req.Section == "education"
	updatePhoto := req.Section == "photo"

	fieldErrors := handlers.FieldErrors{}
	if !updatePersonal && !updateEducation && !updatePhoto {
		fieldErrors["section"] = "Section tidak valid."
		handlers.ValidationErrors(c, fieldErrors)
		return
	}

	if updatePersonal {
		if req.Name == "" {
			fieldErrors["name"] = "Nama wajib diisi."
		}
		if req.Email == "" {
			fieldErrors["email"] = "Email wajib diisi."
		}
		handlers.ValidateFieldLength(fieldErrors, "name", "Nama", req.Name, 255)
		handlers.ValidatePersonName(fieldErrors, "name", "Nama", req.Name)
		handlers.ValidateFieldLength(fieldErrors, "email", "Email", req.Email, 255)
		handlers.ValidateFieldLength(fieldErrors, "phone", "Nomor telepon", req.Phone, 50)
		handlers.ValidateFieldLength(fieldErrors, "address", "Alamat", req.Address, 1000)
		handlers.ValidateFieldLength(fieldErrors, "domicile_address", "Alamat domisili", req.DomicileAddress, 1000)
		handlers.ValidateFieldLength(fieldErrors, "city", "Kota", req.City, 120)
		handlers.ValidateFieldLength(fieldErrors, "province", "Provinsi", req.Province, 120)
		handlers.ValidateEmail(fieldErrors, "email", req.Email)
	}
	if updateEducation {
		handlers.ValidateFieldLength(fieldErrors, "education_level", "Tingkat pendidikan", req.EducationLevel, 80)
		handlers.ValidateAllowedValue(fieldErrors, "education_level", "Tingkat pendidikan", req.EducationLevel, models.StaffEducationLevels)
	}

	var staffDateOfBirth *time.Time
	normalizedEducations := []map[string]any{}
	if user.Role == models.RoleStaff {
		if updatePersonal {
			if req.Phone == "" {
				fieldErrors["phone"] = "Nomor telepon wajib diisi."
			} else if !isValidStaffPhone(req.Phone) {
				fieldErrors["phone"] = "Nomor telepon harus 8-13 digit angka."
			}
			if req.DateOfBirth == "" {
				fieldErrors["date_of_birth"] = "Tanggal lahir wajib diisi."
			}
			if req.Gender == "" {
				fieldErrors["gender"] = "Jenis kelamin wajib diisi."
			}
			if req.Religion == "" {
				fieldErrors["religion"] = "Agama wajib diisi."
			}
			if req.Address == "" {
				fieldErrors["address"] = "Alamat lengkap wajib diisi."
			}
			if req.DomicileAddress == "" {
				fieldErrors["domicile_address"] = "Alamat domisili wajib diisi."
			}
			if req.City == "" {
				fieldErrors["city"] = "Kota/Kabupaten wajib diisi."
			}
			if req.Province == "" {
				fieldErrors["province"] = "Provinsi wajib diisi."
			}
			handlers.ValidateAllowedValue(fieldErrors, "gender", "Jenis kelamin", req.Gender, models.StaffGenders)
			handlers.ValidateAllowedValue(fieldErrors, "religion", "Agama", req.Religion, models.StaffReligions)

			dateOfBirth, dateOfBirthErr := parseStaffDate(req.DateOfBirth)
			if dateOfBirthErr != "" {
				fieldErrors["date_of_birth"] = dateOfBirthErr
			}
			staffDateOfBirth = dateOfBirth
		}

		if updateEducation {
			if req.EducationLevel == "" {
				fieldErrors["education_level"] = "Pendidikan tertinggi wajib diisi."
			}

			normalizedEducations = normalizeStaffEducations(req.Educations, fieldErrors)
			if len(normalizedEducations) == 0 {
				fieldErrors["educations"] = "Minimal 1 riwayat pendidikan wajib diisi."
			}
		}
	}

	if len(fieldErrors) > 0 {
		handlers.ValidationErrors(c, fieldErrors)
		return
	}

	db := middleware.GetDB(c)
	if updatePersonal {
		excludeID := user.ID
		exists, _ := dbrepo.UserEmailExists(db, req.Email, &excludeID)
		if exists {
			handlers.ValidationErrors(c, handlers.FieldErrors{"email": "Email sudah digunakan."})
			return
		}

		emailVerifiedAt := user.EmailVerifiedAt
		if req.Email != user.Email {
			emailVerifiedAt = nil
		}

		if err := dbrepo.UpdateUserBasicProfile(db, user.ID, req.Name, req.Email, emailVerifiedAt, time.Now()); err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui profil")
			return
		}
	}

	if user.Role == models.RoleStaff {
		existingProfile, err := dbrepo.GetStaffProfileByUserID(db, user.ID)
		if err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat profil staff saat memperbarui data")
			return
		}

		phone := req.Phone
		dateOfBirth := staffDateOfBirth
		religion := req.Religion
		gender := req.Gender
		address := req.Address
		domicileAddress := req.DomicileAddress
		city := req.City
		province := req.Province
		educationLevel := req.EducationLevel
		profilePhotoPath := (*string)(nil)
		var educations models.JSON
		if updateEducation {
			educationsJSON, _ := json.Marshal(normalizedEducations)
			educations = models.JSON(educationsJSON)
		}

		if !updatePersonal && existingProfile != nil {
			phone = handlers.FirstString(existingProfile.Phone, "")
			dateOfBirth = existingProfile.DateOfBirth
			religion = handlers.FirstString(existingProfile.Religion, "")
			gender = handlers.FirstString(existingProfile.Gender, "")
			address = handlers.FirstString(existingProfile.Address, "")
			domicileAddress = handlers.FirstString(existingProfile.DomicileAddress, "")
			city = handlers.FirstString(existingProfile.City, "")
			province = handlers.FirstString(existingProfile.Province, "")
			profilePhotoPath = existingProfile.ProfilePhotoPath
		}
		if !updateEducation && existingProfile != nil {
			educationLevel = handlers.FirstString(existingProfile.EducationLevel, "")
			educations = existingProfile.Educations
		}
		if updatePhoto || updatePersonal {
			if _, fileErr := c.FormFile("profile_photo"); fileErr == nil {
				path, _, saveErr := handlers.SaveValidatedUploadedFile(c, "profile_photo", "staff-profiles", handlers.ImageUploadRules())
				if saveErr != nil {
					fieldErrors["profile_photo"] = "Foto profil harus berupa PNG atau JPG/JPEG dengan ukuran maksimal 5MB."
				} else {
					profilePhotoPath = &path
				}
			}
		}
		if updatePhoto && removePhotoRequested {
			profilePhotoPath = nil
		}
		if updatePhoto {
			if profilePhotoPath == nil && !removePhotoRequested {
				fieldErrors["profile_photo"] = "Silakan pilih foto atau hapus foto saat ini."
			}
		}
		if len(fieldErrors) > 0 {
			handlers.ValidationErrors(c, fieldErrors)
			return
		}

		if err := dbrepo.UpsertStaffProfileDetails(db, dbrepo.UpsertStaffProfileDetailsInput{
			UserID:           user.ID,
			Phone:            phone,
			DateOfBirth:      dateOfBirth,
			Religion:         religion,
			Gender:           gender,
			Address:          address,
			DomicileAddress:  domicileAddress,
			City:             city,
			Province:         province,
			EducationLevel:   educationLevel,
			Educations:       educations,
			ProfilePhotoPath: profilePhotoPath,
		}); err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui profil staff")
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":            "saved",
			"profile_photo_url": handlers.AttachmentURL(c, profilePhotoPath),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "saved"})
}

func parseStaffDate(value string) (*time.Time, string) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, ""
	}
	parsed, err := time.Parse("2006-01-02", trimmed)
	if err != nil {
		return nil, "Format tanggal lahir tidak valid."
	}
	now := time.Now()
	if parsed.After(now) {
		return nil, "Tanggal lahir tidak boleh di masa depan."
	}
	return &parsed, ""
}

func normalizeStaffEducations(items []staffEducationInput, errs handlers.FieldErrors) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for index, item := range items {
		institution := strings.TrimSpace(item.Institution)
		degree := strings.TrimSpace(item.Degree)
		fieldOfStudy := strings.TrimSpace(item.FieldOfStudy)
		startYear := strings.TrimSpace(item.StartYear)
		endYear := strings.TrimSpace(item.EndYear)
		gpa := strings.TrimSpace(item.GPA)

		prefix := "educations." + strconv.Itoa(index)
		if institution == "" {
			errs[prefix+".institution"] = "Institusi pendidikan wajib diisi."
		}
		if degree == "" {
			errs[prefix+".degree"] = "Jenjang pendidikan wajib diisi."
		}
		if fieldOfStudy == "" {
			errs[prefix+".field_of_study"] = "Program studi wajib diisi."
		}
		if startYear == "" {
			errs[prefix+".start_year"] = "Tahun mulai wajib diisi."
		}
		if endYear == "" {
			errs[prefix+".end_year"] = "Tahun selesai wajib diisi."
		}
		if requiresEducationGPA(degree) && gpa == "" {
			errs[prefix+".gpa"] = "IPK wajib diisi untuk jenjang ini."
		}

		currentYear := time.Now().Year()
		startYearInt, hasStartYear := parseYearNumber(startYear)
		endYearInt, hasEndYear := parseYearNumber(endYear)
		if startYear != "" && !hasStartYear {
			errs[prefix+".start_year"] = "Tahun mulai harus berupa angka."
		}
		if endYear != "" && !hasEndYear {
			errs[prefix+".end_year"] = "Tahun selesai harus berupa angka."
		}
		if hasStartYear && (startYearInt < 1900 || startYearInt > currentYear) {
			errs[prefix+".start_year"] = "Tahun mulai harus antara 1900 dan tahun sekarang."
		}
		if hasEndYear && endYearInt < 1900 {
			errs[prefix+".end_year"] = "Tahun selesai minimal 1900."
		}
		if hasStartYear && hasEndYear && endYearInt < startYearInt {
			errs[prefix+".end_year"] = "Tahun selesai tidak boleh lebih kecil dari tahun mulai."
		}
		if hasStartYear && hasEndYear && endYearInt > startYearInt+7 {
			errs[prefix+".end_year"] = "Tahun selesai maksimal 7 tahun dari tahun mulai."
		}
		if gpa != "" && !isValidGPA(gpa) {
			errs[prefix+".gpa"] = "Format IPK tidak valid."
		}
		if gpa != "" {
			normalized := strings.TrimSpace(strings.ReplaceAll(gpa, ",", "."))
			if gpaValue, err := strconv.ParseFloat(normalized, 64); err == nil {
				if gpaValue < 0 || gpaValue > 4 {
					errs[prefix+".gpa"] = "IPK harus antara 0.00 sampai 4.00."
				}
			}
		}

		handlers.ValidateFieldLength(errs, prefix+".institution", "Institusi pendidikan", institution, 255)
		handlers.ValidateFieldLength(errs, prefix+".degree", "Jenjang pendidikan", degree, 120)
		handlers.ValidateFieldLength(errs, prefix+".field_of_study", "Program studi", fieldOfStudy, 255)
		handlers.ValidateFieldLength(errs, prefix+".gpa", "IPK", gpa, 16)

		out = append(out, map[string]any{
			"institution":    institution,
			"degree":         degree,
			"field_of_study": fieldOfStudy,
			"start_year":     startYear,
			"end_year":       endYear,
			"gpa":            gpa,
		})
	}

	if len(out) > 20 {
		errs["educations"] = "Maksimal 20 riwayat pendidikan."
	}

	return out
}

func isValidGPA(value string) bool {
	normalized := strings.TrimSpace(strings.ReplaceAll(value, ",", "."))
	_, err := strconv.ParseFloat(normalized, 64)
	return err == nil
}

func isValidEmail(value string) bool {
	return handlers.IsValidEmail(value)
}

func isValidStaffPhone(value string) bool {
	normalized := normalizePhoneNumber(value)
	return len(normalized) >= 8 && len(normalized) <= 13
}

func normalizePhoneNumber(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}

	var builder strings.Builder
	builder.Grow(len(value))
	for _, r := range value {
		if r >= '0' && r <= '9' {
			builder.WriteRune(r)
		}
	}
	return builder.String()
}

func requiresEducationGPA(degree string) bool {
	switch strings.ToUpper(strings.TrimSpace(degree)) {
	case "D3", "D4", "S1", "S2", "S3":
		return true
	default:
		return false
	}
}

func parseYearNumber(value string) (int, bool) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return 0, false
	}

	if len(trimmed) >= 4 {
		candidate := trimmed[:4]
		if year, err := strconv.Atoi(candidate); err == nil {
			if len(trimmed) == 4 || (len(trimmed) >= 7 && trimmed[4] == '-') {
				return year, true
			}
		}
	}

	parsed, err := strconv.Atoi(trimmed)
	if err != nil {
		return 0, false
	}
	return parsed, true
}

func parseTruthyBoolean(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "ya", "on":
		return true
	default:
		return false
	}
}

func UpdatePassword(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil {
		handlers.JSONError(c, http.StatusUnauthorized, "Unauthenticated")
		return
	}

	var req passwordUpdateRequest
	if err := c.ShouldBind(&req); err != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"password": "Password wajib diisi."})
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)) != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"current_password": "Password saat ini salah."})
		return
	}

	if req.Password == "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"password": "Password wajib diisi."})
		return
	}

	if !handlers.PasswordMeetsPolicy(req.Password) {
		handlers.ValidationErrors(c, handlers.FieldErrors{"password": handlers.PasswordPolicyMessage})
		return
	}

	if req.Password != req.PasswordConfirmation {
		handlers.ValidationErrors(c, handlers.FieldErrors{"password_confirmation": "Konfirmasi password tidak sama."})
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	db := middleware.GetDB(c)
	if err := dbrepo.UpdateUserPassword(db, user.ID, string(hash)); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui password")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "saved"})
}

func DeleteProfile(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil {
		handlers.JSONError(c, http.StatusUnauthorized, "Unauthenticated")
		return
	}

	var req deleteProfileRequest
	if err := c.ShouldBind(&req); err != nil || req.Password == "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"password": "Password wajib diisi."})
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"password": "Password salah."})
		return
	}

	db := middleware.GetDB(c)
	if err := dbrepo.DeleteUserByID(db, user.ID); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menghapus akun")
		return
	}

	session := sessions.Default(c)
	session.Clear()
	if err := session.Save(); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menghapus sesi.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"redirect_to": "/"})
}
