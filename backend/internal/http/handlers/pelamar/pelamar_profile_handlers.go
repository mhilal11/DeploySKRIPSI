package pelamar

import (
	"hris-backend/internal/http/handlers"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"
	"net/http"
	"strconv"
	"strings"
	"time"

	"encoding/json"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func PelamarProfileShow(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RolePelamar {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	profile := getOrCreateApplicantProfile(db, user)
	completion := computeProfileCompletion(profile)

	activeCount, _ := dbrepo.CountActiveApplicationsByUserID(db, user.ID)
	completedCount, _ := dbrepo.CountCompletedApplicationsByUserID(db, user.ID)

	payload := applicantProfilePayload(c, profile, completion)

	c.JSON(http.StatusOK, gin.H{
		"profile":                 payload,
		"profileReminderMessage":  "",
		"hasActiveApplication":    activeCount > 0,
		"hasCompletedApplication": completedCount > 0,
	})
}

func PelamarProfileUpdate(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RolePelamar {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	activeCount, _ := dbrepo.CountActiveApplicationsByUserID(db, user.ID)
	if activeCount > 0 {
		handlers.ValidationErrors(c, handlers.FieldErrors{"message": "Profil tidak dapat diubah karena lamaran Anda sedang dalam proses."})
		return
	}

	profile := getOrCreateApplicantProfile(db, user)
	shouldSyncUserAccount := false

	section := c.PostForm("section")
	if section == "" {
		section = "all"
	}
	section = strings.ToLower(strings.TrimSpace(section))
	if !handlers.IsAllowedValue(section, []string{"all", "personal", "photo", "education", "experience", "certification"}) {
		handlers.ValidationErrors(c, handlers.FieldErrors{"section": "Section tidak valid."})
		return
	}

	if section == "personal" || section == "all" {
		personalJSON := c.PostForm("personal")
		if personalJSON != "" {
			var personal map[string]string
			_ = json.Unmarshal([]byte(personalJSON), &personal)
			if v, ok := personal["full_name"]; ok {
				trimmed := strings.TrimSpace(v)
				profile.FullName = &trimmed
				shouldSyncUserAccount = true
			}
			if v, ok := personal["email"]; ok {
				trimmed := handlers.NormalizeEmail(v)
				profile.Email = &trimmed
				shouldSyncUserAccount = true
			}
			if v, ok := personal["phone"]; ok {
				normalizedPhone := normalizePhoneNumber(v)
				profile.Phone = &normalizedPhone
			}
			if v, ok := personal["date_of_birth"]; ok {
				trimmed := strings.TrimSpace(v)
				if trimmed == "" {
					profile.DateOfBirth = nil
				} else {
					t, err := time.Parse("2006-01-02", trimmed)
					if err != nil {
						handlers.ValidationErrors(c, handlers.FieldErrors{
							"personal.date_of_birth": "Format tanggal lahir tidak valid.",
						})
						return
					}
					profile.DateOfBirth = &t
				}
			}
			if v, ok := personal["gender"]; ok {
				trimmed := strings.TrimSpace(v)
				profile.Gender = &trimmed
			}
			if v, ok := personal["religion"]; ok {
				trimmed := normalizeApplicantReligion(v)
				profile.Religion = &trimmed
			}
			if v, ok := personal["address"]; ok {
				trimmed := strings.TrimSpace(v)
				profile.Address = &trimmed
			}
			if v, ok := personal["domicile_address"]; ok {
				trimmed := strings.TrimSpace(v)
				profile.DomicileAddress = &trimmed
			}
			if v, ok := personal["city"]; ok {
				trimmed := strings.TrimSpace(v)
				profile.City = &trimmed
			}
			if v, ok := personal["province"]; ok {
				trimmed := strings.TrimSpace(v)
				profile.Province = &trimmed
			}
		}

		if errs := validatePersonalRequired(profile); len(errs) > 0 {
			handlers.ValidationErrors(c, errs)
			return
		}
	}

	if section == "photo" || section == "personal" {
		if _, err := c.FormFile("profile_photo"); err == nil {
			path, _, saveErr := handlers.SaveValidatedUploadedFile(c, "profile_photo", "applicant-profiles", handlers.ImageUploadRules())
			if saveErr != nil {
				handlers.ValidationErrors(c, handlers.FieldErrors{"profile_photo": "Foto profil harus berupa PNG atau JPG/JPEG dengan ukuran maksimal 5MB."})
				return
			}
			profile.ProfilePhotoPath = &path
		}
	}

	if section == "education" || section == "all" {
		educationsJSON := c.PostForm("educations")
		if strings.TrimSpace(educationsJSON) == "" {
			handlers.ValidationErrors(c, handlers.FieldErrors{"educations": "Minimal 1 riwayat pendidikan wajib diisi."})
			return
		}
		var educations []map[string]any
		if err := json.Unmarshal([]byte(educationsJSON), &educations); err != nil {
			handlers.ValidationErrors(c, handlers.FieldErrors{"educations": "Format data pendidikan tidak valid."})
			return
		}

		if errs := validateEducationRequired(educations); len(errs) > 0 {
			handlers.ValidationErrors(c, errs)
			return
		}
		if errs := validateEducationYears(educations); len(errs) > 0 {
			handlers.ValidationErrors(c, errs)
			return
		}

		_ = persistCustomEducationReferences(db, user.ID, educations)

		normalized, _ := json.Marshal(educations)
		profile.Educations = models.JSON(normalized)
	}

	if section == "experience" || section == "all" {
		experiencesJSON := c.PostForm("experiences")
		if experiencesJSON != "" {
			var experiences []map[string]any
			if err := json.Unmarshal([]byte(experiencesJSON), &experiences); err != nil {
				handlers.ValidationErrors(c, handlers.FieldErrors{"experiences": "Format data pengalaman tidak valid."})
				return
			}

			if errs := validateExperienceRequired(experiences); len(errs) > 0 {
				handlers.ValidationErrors(c, errs)
				return
			}
			if errs := validateExperiencePeriods(experiences); len(errs) > 0 {
				handlers.ValidationErrors(c, errs)
				return
			}

			normalized, _ := json.Marshal(experiences)
			profile.Experiences = models.JSON(normalized)
		}
	}

	if section == "certification" {
		certificationsJSON := c.PostForm("certifications")
		var certs []map[string]any
		if certificationsJSON != "" {
			_ = json.Unmarshal([]byte(certificationsJSON), &certs)
		}
		if certs == nil {
			certs = []map[string]any{}
		}
		for i := range certs {
			key := "certification_files." + strconv.Itoa(i)
			if _, err := c.FormFile(key); err == nil {
				path, _, saveErr := handlers.SaveValidatedUploadedFile(c, key, "applicant-certifications", handlers.ImageOrPDFUploadRules())
				if saveErr != nil {
					handlers.ValidationErrors(c, handlers.FieldErrors{key: "File sertifikasi harus berupa PNG, JPG/JPEG, atau PDF dengan ukuran maksimal 5MB."})
					return
				}
				certs[i]["file_path"] = path
			} else {
				key2 := "certification_files_" + strconv.Itoa(i)
				if _, err2 := c.FormFile(key2); err2 == nil {
					path, _, saveErr := handlers.SaveValidatedUploadedFile(c, key2, "applicant-certifications", handlers.ImageOrPDFUploadRules())
					if saveErr != nil {
						handlers.ValidationErrors(c, handlers.FieldErrors{key2: "File sertifikasi harus berupa PNG, JPG/JPEG, atau PDF dengan ukuran maksimal 5MB."})
						return
					}
					certs[i]["file_path"] = path
				}
			}
		}
		if errs := validateCertificationRequired(certs); len(errs) > 0 {
			handlers.ValidationErrors(c, errs)
			return
		}
		bytes, _ := json.Marshal(certs)
		profile.Certifications = models.JSON(bytes)
	}

	if shouldSyncUserAccount {
		_ = dbrepo.UpdateUserNameEmailByID(db, user.ID, profile.FullName, profile.Email)
	}

	syncCompletion(profile)
	if err := dbrepo.UpdateApplicantProfileByUserID(db, profile, time.Now()); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui profil")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "Profil berhasil diperbarui."})
}

func getApplicantProfile(db *sqlx.DB, userID int64) *models.ApplicantProfile {
	profile, err := dbrepo.GetApplicantProfileByUserID(db, userID)
	if err != nil {
		return nil
	}
	return profile
}

func getOrCreateApplicantProfile(db *sqlx.DB, user *models.User) *models.ApplicantProfile {
	profile := getApplicantProfile(db, user.ID)
	if profile != nil {
		return profile
	}
	_ = dbrepo.InsertApplicantProfile(db, user.ID, user.Name, user.Email, time.Now())
	return &models.ApplicantProfile{UserID: user.ID, FullName: &user.Name, Email: &user.Email}
}
