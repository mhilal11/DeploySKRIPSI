package superadmin

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
	"hris-backend/internal/http/handlers"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"
	"hris-backend/internal/services"
)

func SuperAdminAccountsStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	name := handlers.NormalizePersonName(c.PostForm("name"))
	email := strings.TrimSpace(strings.ToLower(c.PostForm("email")))
	role := strings.TrimSpace(c.PostForm("role"))
	division := services.NormalizeDivisionName(c.PostForm("division"))
	status := strings.TrimSpace(c.PostForm("status"))
	registeredAt := strings.TrimSpace(c.PostForm("registered_at"))
	inactiveAt := strings.TrimSpace(c.PostForm("inactive_at"))
	password := strings.TrimSpace(c.PostForm("password"))
	passwordConfirmation := strings.TrimSpace(c.PostForm("password_confirmation"))

	db := middleware.GetDB(c)
	fieldErrors, err := validateAccountInput(c, db, role, division, name, email, status, registeredAt, inactiveAt, password, passwordConfirmation)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memvalidasi data akun")
		return
	}
	if len(fieldErrors) > 0 {
		handlers.ValidationErrors(c, fieldErrors)
		return
	}

	emailUsed, err := dbrepo.UserEmailExists(db, email, nil)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memvalidasi email")
		return
	}
	if emailUsed {
		handlers.ValidationErrors(c, handlers.FieldErrors{"email": "Email sudah digunakan."})
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	now := time.Now()

	if registeredAt == "" {
		registeredAt = now.Format("2006-01-02")
	}
	if status == "Inactive" && inactiveAt == "" {
		inactiveAt = now.Format("2006-01-02")
	}

	var createdID int64
	employeeCode, err := services.WithGeneratedEmployeeCodeRetry(db, role, func(code string) error {
		var createErr error
		createdID, createErr = dbrepo.CreateUser(db, dbrepo.CreateUserInput{
			EmployeeCode: code,
			Name:         name,
			Email:        email,
			Role:         role,
			Division:     division,
			Status:       status,
			RegisteredAt: registeredAt,
			InactiveAt:   stringPtrOrNil(inactiveAt),
			PasswordHash: string(hash),
			Now:          now,
		})
		return createErr
	})
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal membuat akun")
		return
	}

	if role == models.RoleStaff {
		religion := strings.TrimSpace(c.PostForm("religion"))
		gender := strings.TrimSpace(c.PostForm("gender"))
		education := strings.TrimSpace(c.PostForm("education_level"))
		if err := dbrepo.InsertStaffProfile(db, createdID, religion, gender, education, now); err != nil {
			_ = dbrepo.DeleteUserByID(db, createdID)
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal menyimpan profil staff")
			return
		}
	}

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Accounts",
		Action:      "CREATE_ACCOUNT",
		EntityType:  "user",
		EntityID:    strconv.FormatInt(createdID, 10),
		Description: "Membuat akun baru.",
		NewValues: map[string]any{
			"id":            createdID,
			"employee_code": employeeCode,
			"name":          name,
			"email":         email,
			"role":          role,
			"division":      nullIfBlank(division),
			"status":        status,
			"registered_at": registeredAt,
			"inactive_at":   nullIfBlank(inactiveAt),
		},
	})

	c.JSON(http.StatusOK, gin.H{"status": "Akun baru berhasil dibuat."})
}

func SuperAdminAccountsUpdate(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id, ok := parsePositiveInt64(c.Param("id"))
	if !ok {
		handlers.JSONError(c, http.StatusBadRequest, "ID user tidak valid")
		return
	}

	name := handlers.NormalizePersonName(c.PostForm("name"))
	email := strings.TrimSpace(strings.ToLower(c.PostForm("email")))
	role := strings.TrimSpace(c.PostForm("role"))
	division := services.NormalizeDivisionName(c.PostForm("division"))
	status := strings.TrimSpace(c.PostForm("status"))
	registeredAt := strings.TrimSpace(c.PostForm("registered_at"))
	inactiveAt := strings.TrimSpace(c.PostForm("inactive_at"))
	password := strings.TrimSpace(c.PostForm("password"))

	db := middleware.GetDB(c)
	fieldErrors, err := validateAccountInput(c, db, role, division, name, email, status, registeredAt, inactiveAt, "_skip_password_", "_skip_password_")
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memvalidasi data akun")
		return
	}
	if len(fieldErrors) > 0 {
		handlers.ValidationErrors(c, fieldErrors)
		return
	}

	emailUsed, err := dbrepo.UserEmailExists(db, email, &id)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memvalidasi email")
		return
	}
	if emailUsed {
		handlers.ValidationErrors(c, handlers.FieldErrors{"email": "Email sudah digunakan."})
		return
	}

	existingUser, err := dbrepo.GetUserByID(db, id)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat data user")
		return
	}
	if existingUser == nil {
		handlers.JSONError(c, http.StatusNotFound, "User tidak ditemukan")
		return
	}

	if status == "Inactive" && inactiveAt == "" {
		inactiveAt = time.Now().Format("2006-01-02")
	}

	var employeeCode *string
	roleChanged := existingUser.Role != role
	missingEmployeeCode := existingUser.EmployeeCode == nil || strings.TrimSpace(ptrToString(existingUser.EmployeeCode)) == ""

	var passwordHash *string
	if password != "" {
		hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		hashed := string(hash)
		passwordHash = &hashed
	}

	now := time.Now()
	if roleChanged || missingEmployeeCode {
		generatedCode, genErr := services.WithGeneratedEmployeeCodeRetry(db, role, func(code string) error {
			employeeCode = &code
			return dbrepo.UpdateUser(db, dbrepo.UpdateUserInput{
				ID:           id,
				EmployeeCode: employeeCode,
				Name:         name,
				Email:        email,
				Role:         role,
				Division:     division,
				Status:       status,
				RegisteredAt: registeredAt,
				InactiveAt:   stringPtrOrNil(inactiveAt),
				PasswordHash: passwordHash,
				Now:          now,
			})
		})
		if genErr != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui akun")
			return
		}
		employeeCode = &generatedCode
	} else {
		err = dbrepo.UpdateUser(db, dbrepo.UpdateUserInput{
			ID:           id,
			EmployeeCode: employeeCode,
			Name:         name,
			Email:        email,
			Role:         role,
			Division:     division,
			Status:       status,
			RegisteredAt: registeredAt,
			InactiveAt:   stringPtrOrNil(inactiveAt),
			PasswordHash: passwordHash,
			Now:          now,
		})
	}
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui akun")
		return
	}

	if role == models.RoleStaff {
		religion := strings.TrimSpace(c.PostForm("religion"))
		gender := strings.TrimSpace(c.PostForm("gender"))
		education := strings.TrimSpace(c.PostForm("education_level"))
		if err := dbrepo.UpsertStaffProfile(db, id, religion, gender, education); err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui profil staff")
			return
		}
	} else {
		if err := dbrepo.DeleteStaffProfileByUserID(db, id); err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal membersihkan profil staff")
			return
		}
	}

	finalEmployeeCode := ptrToString(existingUser.EmployeeCode)
	if employeeCode != nil {
		finalEmployeeCode = ptrToString(employeeCode)
	}

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Accounts",
		Action:      "UPDATE_ACCOUNT",
		EntityType:  "user",
		EntityID:    strconv.FormatInt(id, 10),
		Description: "Memperbarui data akun.",
		OldValues: map[string]any{
			"name":          existingUser.Name,
			"email":         existingUser.Email,
			"employee_code": nullIfBlank(ptrToString(existingUser.EmployeeCode)),
			"role":          existingUser.Role,
			"division":      existingUser.Division,
			"status":        existingUser.Status,
			"registered_at": handlers.FormatDateISO(existingUser.RegisteredAt),
			"inactive_at":   handlers.FormatDateISO(existingUser.InactiveAt),
		},
		NewValues: map[string]any{
			"name":           name,
			"email":          email,
			"employee_code":  nullIfBlank(finalEmployeeCode),
			"role":           role,
			"division":       nullIfBlank(division),
			"status":         status,
			"registered_at":  nullIfBlank(registeredAt),
			"inactive_at":    nullIfBlank(inactiveAt),
			"password_reset": password != "",
		},
	})

	c.JSON(http.StatusOK, gin.H{"status": "Akun berhasil diperbarui."})
}

func SuperAdminAccountsDelete(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id, ok := parsePositiveInt64(c.Param("id"))
	if !ok {
		handlers.JSONError(c, http.StatusBadRequest, "ID user tidak valid")
		return
	}

	db := middleware.GetDB(c)
	existingUser, err := dbrepo.GetUserByID(db, id)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat data user")
		return
	}
	if existingUser == nil {
		handlers.JSONError(c, http.StatusNotFound, "User tidak ditemukan")
		return
	}

	if err := dbrepo.DeleteUserByID(db, id); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menghapus akun")
		return
	}

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Accounts",
		Action:      "DELETE_ACCOUNT",
		EntityType:  "user",
		EntityID:    strconv.FormatInt(id, 10),
		Description: "Menghapus akun.",
		OldValues: map[string]any{
			"name":     existingUser.Name,
			"email":    existingUser.Email,
			"role":     existingUser.Role,
			"division": existingUser.Division,
			"status":   existingUser.Status,
		},
	})

	c.JSON(http.StatusOK, gin.H{"status": "Akun berhasil dihapus."})
}

func SuperAdminAccountsToggleStatus(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id, ok := parsePositiveInt64(c.Param("id"))
	if !ok {
		handlers.JSONError(c, http.StatusBadRequest, "ID user tidak valid")
		return
	}

	db := middleware.GetDB(c)
	existingUser, err := dbrepo.GetUserByID(db, id)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat data user")
		return
	}
	if existingUser == nil {
		handlers.JSONError(c, http.StatusNotFound, "User tidak ditemukan")
		return
	}

	status := existingUser.Status
	newStatus := "Active"
	var inactiveAt *string
	if status == "Active" {
		newStatus = "Inactive"
		now := time.Now().Format("2006-01-02")
		inactiveAt = &now
	}

	if err := dbrepo.UpdateUserStatus(db, id, newStatus, inactiveAt); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui status akun")
		return
	}

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Accounts",
		Action:      "TOGGLE_ACCOUNT_STATUS",
		EntityType:  "user",
		EntityID:    strconv.FormatInt(id, 10),
		Description: "Mengubah status aktif/inaktif akun.",
		OldValues: map[string]any{
			"status":      status,
			"inactive_at": handlers.FormatDateISO(existingUser.InactiveAt),
		},
		NewValues: map[string]any{
			"status":      newStatus,
			"inactive_at": nullIfBlank(ptrToString(inactiveAt)),
		},
	})

	c.JSON(http.StatusOK, gin.H{"status": "Status akun telah diperbarui."})
}

func SuperAdminAccountsResetPassword(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id, ok := parsePositiveInt64(c.Param("id"))
	if !ok {
		handlers.JSONError(c, http.StatusBadRequest, "ID user tidak valid")
		return
	}

	plain, err := handlers.GeneratePolicyCompliantPassword(12)
	if err != nil || plain == "" {
		plain = "TempPass1!"
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)

	db := middleware.GetDB(c)
	existingUser, err := dbrepo.GetUserByID(db, id)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat data user")
		return
	}
	if existingUser == nil {
		handlers.JSONError(c, http.StatusNotFound, "User tidak ditemukan")
		return
	}

	if err := dbrepo.UpdateUserPassword(db, id, string(hash)); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal mereset password")
		return
	}

	appendAuditLog(c, db, auditLogPayload{
		Module:      "Accounts",
		Action:      "RESET_ACCOUNT_PASSWORD",
		EntityType:  "user",
		EntityID:    strconv.FormatInt(id, 10),
		Description: "Mereset password akun pengguna.",
		OldValues: map[string]any{
			"email": existingUser.Email,
			"role":  existingUser.Role,
		},
		NewValues: map[string]any{
			"password_reset": true,
		},
	})

	c.JSON(http.StatusOK, gin.H{"status": "Password baru berhasil dibuat.", "generated_password": plain})
}

func validateAccountInput(
	c *gin.Context,
	db *sqlx.DB,
	role string,
	division string,
	name string,
	email string,
	status string,
	registeredAt string,
	inactiveAt string,
	password string,
	passwordConfirmation string,
) (handlers.FieldErrors, error) {
	fieldErrors := handlers.FieldErrors{}
	if name == "" {
		fieldErrors["name"] = "Nama wajib diisi."
	}
	if email == "" {
		fieldErrors["email"] = "Email wajib diisi."
	}
	if role == "" {
		fieldErrors["role"] = "Role wajib dipilih."
	}
	if status == "" {
		fieldErrors["status"] = "Status wajib dipilih."
	}
	handlers.ValidateFieldLength(fieldErrors, "name", "Nama", name, 120)
	handlers.ValidatePersonName(fieldErrors, "name", "Nama", name)
	handlers.ValidateFieldLength(fieldErrors, "email", "Email", email, 254)
	handlers.ValidateFieldLength(fieldErrors, "role", "Role", role, 40)
	handlers.ValidateFieldLength(fieldErrors, "division", "Divisi", division, 120)
	handlers.ValidateFieldLength(fieldErrors, "status", "Status", status, 24)
	handlers.ValidateFieldLength(fieldErrors, "registered_at", "Tanggal registrasi", registeredAt, 30)
	handlers.ValidateFieldLength(fieldErrors, "inactive_at", "Tanggal nonaktif", inactiveAt, 30)
	handlers.ValidateEmail(fieldErrors, "email", email)
	handlers.ValidateAllowedValue(fieldErrors, "role", "Role", role, models.UserRoles)
	handlers.ValidateAllowedValue(fieldErrors, "status", "Status", status, models.UserStatuses)
	if registeredAt != "" {
		if _, err := handlers.ParseDateStrict(registeredAt, "2006-01-02"); err != nil {
			fieldErrors["registered_at"] = "Format tanggal registrasi tidak valid."
		}
	}
	if inactiveAt != "" {
		if _, err := handlers.ParseDateStrict(inactiveAt, "2006-01-02"); err != nil {
			fieldErrors["inactive_at"] = "Format tanggal nonaktif tidak valid."
		}
	}

	checkPassword := password != "_skip_password_" || passwordConfirmation != "_skip_password_"
	if checkPassword {
		if password == "" {
			fieldErrors["password"] = "Password wajib diisi."
		}
		if passwordConfirmation == "" {
			fieldErrors["password_confirmation"] = "Konfirmasi password wajib diisi."
		}
		if password != "" && passwordConfirmation != "" && password != passwordConfirmation {
			fieldErrors["password_confirmation"] = "Konfirmasi password tidak sama."
		}
		handlers.ValidateFieldLength(fieldErrors, "password", "Password", password, 128)
		handlers.ValidateFieldLength(fieldErrors, "password_confirmation", "Konfirmasi password", passwordConfirmation, 128)
		handlers.ValidatePasswordPolicy(fieldErrors, "password", password)
	}

	if role == models.RoleAdmin || role == models.RoleStaff {
		if division == "" {
			fieldErrors["division"] = "Divisi wajib dipilih."
		} else if exists, err := services.DivisionExists(db, division); err != nil {
			return nil, err
		} else if !exists {
			fieldErrors["division"] = "Divisi tidak ditemukan. Tambahkan divisi terlebih dahulu."
		}
	}

	if role == models.RoleStaff {
		religion := strings.TrimSpace(c.PostForm("religion"))
		gender := strings.TrimSpace(c.PostForm("gender"))
		educationLevel := strings.TrimSpace(c.PostForm("education_level"))
		if religion == "" {
			fieldErrors["religion"] = "Agama wajib dipilih."
		}
		if gender == "" {
			fieldErrors["gender"] = "Jenis kelamin wajib dipilih."
		}
		if educationLevel == "" {
			fieldErrors["education_level"] = "Tingkat pendidikan wajib dipilih."
		}
		handlers.ValidateFieldLength(fieldErrors, "religion", "Agama", religion, 50)
		handlers.ValidateFieldLength(fieldErrors, "gender", "Jenis kelamin", gender, 20)
		handlers.ValidateFieldLength(fieldErrors, "education_level", "Tingkat pendidikan", educationLevel, 80)
		handlers.ValidateAllowedValue(fieldErrors, "religion", "Agama", religion, models.StaffReligions)
		handlers.ValidateAllowedValue(fieldErrors, "gender", "Jenis kelamin", gender, models.StaffGenders)
		handlers.ValidateAllowedValue(fieldErrors, "education_level", "Tingkat pendidikan", educationLevel, models.StaffEducationLevels)
	}

	return fieldErrors, nil
}
