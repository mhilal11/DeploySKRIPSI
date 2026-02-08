package handlers

import (
	"database/sql"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	"hris-backend/internal/services"
	"hris-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func SuperAdminAccountsIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	filters := map[string]string{
		"search": c.Query("search"),
		"role":   c.Query("role"),
		"status": c.Query("status"),
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage := 10

	query := "SELECT * FROM users"
	clauses := []string{}
	args := []any{}
	if filters["search"] != "" {
		like := "%" + filters["search"] + "%"
		clauses = append(clauses, "(name LIKE ? OR email LIKE ? OR employee_code LIKE ?)")
		args = append(args, like, like, like)
	}
	if filters["role"] != "" && filters["role"] != "all" {
		clauses = append(clauses, "role = ?")
		args = append(args, filters["role"])
	}
	if filters["status"] != "" && filters["status"] != "all" {
		clauses = append(clauses, "status = ?")
		args = append(args, filters["status"])
	}
	if len(clauses) > 0 {
		query += " WHERE " + strings.Join(clauses, " AND ")
	}
	query += " ORDER BY id DESC LIMIT ? OFFSET ?"

	countQuery := "SELECT COUNT(*) FROM users"
	if len(clauses) > 0 {
		countQuery += " WHERE " + strings.Join(clauses, " AND ")
	}

	var total int
	_ = db.Get(&total, countQuery, args...)
	if total < 0 {
		total = 0
	}

	lastPage := (total + perPage - 1) / perPage
	if lastPage == 0 {
		lastPage = 1
	}
	if page > lastPage {
		page = lastPage
	}
	if page < 1 {
		page = 1
	}

	offset := (page - 1) * perPage
	argsWithLimit := append(append([]any{}, args...), perPage, offset)

	users := []models.User{}
	_ = db.Select(&users, query, argsWithLimit...)

	data := []map[string]any{}
	for _, u := range users {
		data = append(data, map[string]any{
			"id":            u.ID,
			"employee_code": u.EmployeeCode,
			"name":          u.Name,
			"email":         u.Email,
			"role":          u.Role,
			"division":      u.Division,
			"status":        u.Status,
			"registered_at": formatDateISO(u.RegisteredAt),
			"inactive_at":   formatDateISO(u.InactiveAt),
			"last_login_at": formatDateTime(u.LastLoginAt),
			"created_at":    formatDateTime(u.CreatedAt),
		})
	}

	var totalUsers int
	var totalSuperAdmin int
	var totalAdmin int
	var totalStaff int
	var totalPelamar int
	_ = db.Get(&totalUsers, "SELECT COUNT(*) FROM users")
	_ = db.Get(&totalSuperAdmin, "SELECT COUNT(*) FROM users WHERE role = ?", models.RoleSuperAdmin)
	_ = db.Get(&totalAdmin, "SELECT COUNT(*) FROM users WHERE role = ?", models.RoleAdmin)
	_ = db.Get(&totalStaff, "SELECT COUNT(*) FROM users WHERE role = ?", models.RoleStaff)
	_ = db.Get(&totalPelamar, "SELECT COUNT(*) FROM users WHERE role = ?", models.RolePelamar)

	stats := map[string]int{
		"total":       totalUsers,
		"super_admin": totalSuperAdmin,
		"admin":       totalAdmin,
		"staff":       totalStaff,
		"pelamar":     totalPelamar,
	}

	var from any
	var to any
	if total > 0 && len(users) > 0 {
		from = offset + 1
		to = offset + len(users)
	}

	c.JSON(http.StatusOK, gin.H{
		"users": gin.H{
			"data":         data,
			"links":        buildPaginationLinks("/super-admin/accounts", page, lastPage, filters),
			"from":         from,
			"to":           to,
			"current_page": page,
			"last_page":    lastPage,
			"per_page":     perPage,
			"total":        total,
		},
		"filters":              filters,
		"stats":                stats,
		"roleOptions":          models.UserRoles,
		"statusOptions":        models.UserStatuses,
		"divisionOptions":      models.UserDivisions,
		"flash":                gin.H{"success": ""},
		"sidebarNotifications": computeSuperAdminSidebarNotifications(db),
	})
}

func SuperAdminAccountsCreate(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	c.JSON(http.StatusOK, gin.H{
		"roleOptions":           models.UserRoles,
		"statusOptions":         models.UserStatuses,
		"divisionOptions":       models.UserDivisions,
		"religionOptions":       models.StaffReligions,
		"genderOptions":         models.StaffGenders,
		"educationLevelOptions": models.StaffEducationLevels,
		"sidebarNotifications":  computeSuperAdminSidebarNotifications(db),
	})
}

func SuperAdminAccountsEdit(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	db := middleware.GetDB(c)

	var u models.User
	if err := db.Get(&u, "SELECT * FROM users WHERE id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "User tidak ditemukan")
		return
	}

	var profile models.StaffProfile
	_ = db.Get(&profile, "SELECT * FROM staff_profiles WHERE user_id = ?", u.ID)

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":              u.ID,
			"employee_code":   u.EmployeeCode,
			"name":            u.Name,
			"email":           u.Email,
			"role":            u.Role,
			"division":        u.Division,
			"religion":        profile.Religion,
			"gender":          profile.Gender,
			"education_level": profile.EducationLevel,
			"status":          u.Status,
			"registered_at":   formatDateISO(u.RegisteredAt),
			"inactive_at":     formatDateISO(u.InactiveAt),
		},
		"roleOptions":           models.UserRoles,
		"statusOptions":         models.UserStatuses,
		"divisionOptions":       models.UserDivisions,
		"religionOptions":       models.StaffReligions,
		"genderOptions":         models.StaffGenders,
		"educationLevelOptions": models.StaffEducationLevels,
		"sidebarNotifications":  computeSuperAdminSidebarNotifications(db),
	})
}

func SuperAdminAccountsStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	name := c.PostForm("name")
	email := strings.ToLower(c.PostForm("email"))
	role := c.PostForm("role")
	division := c.PostForm("division")
	status := c.PostForm("status")
	registeredAt := c.PostForm("registered_at")
	inactiveAt := c.PostForm("inactive_at")
	password := c.PostForm("password")
	passwordConfirmation := c.PostForm("password_confirmation")

	name = strings.TrimSpace(name)
	email = strings.TrimSpace(email)
	role = strings.TrimSpace(role)
	division = strings.TrimSpace(division)
	status = strings.TrimSpace(status)
	registeredAt = strings.TrimSpace(registeredAt)
	inactiveAt = strings.TrimSpace(inactiveAt)
	password = strings.TrimSpace(password)
	passwordConfirmation = strings.TrimSpace(passwordConfirmation)

	fieldErrors := FieldErrors{}
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
	if password == "" {
		fieldErrors["password"] = "Password wajib diisi."
	}
	if passwordConfirmation == "" {
		fieldErrors["password_confirmation"] = "Konfirmasi password wajib diisi."
	}
	if password != "" && passwordConfirmation != "" && password != passwordConfirmation {
		fieldErrors["password_confirmation"] = "Konfirmasi password tidak sama."
	}
	if role == models.RoleAdmin || role == models.RoleStaff {
		if division == "" {
			fieldErrors["division"] = "Divisi wajib dipilih."
		}
	}
	if role == models.RoleStaff {
		if strings.TrimSpace(c.PostForm("religion")) == "" {
			fieldErrors["religion"] = "Agama wajib dipilih."
		}
		if strings.TrimSpace(c.PostForm("gender")) == "" {
			fieldErrors["gender"] = "Jenis kelamin wajib dipilih."
		}
		if strings.TrimSpace(c.PostForm("education_level")) == "" {
			fieldErrors["education_level"] = "Tingkat pendidikan wajib dipilih."
		}
	}
	if len(fieldErrors) > 0 {
		ValidationErrors(c, fieldErrors)
		return
	}

	db := middleware.GetDB(c)

	var exists int
	_ = db.Get(&exists, "SELECT COUNT(*) FROM users WHERE email = ?", email)
	if exists > 0 {
		ValidationErrors(c, FieldErrors{"email": "Email sudah digunakan."})
		return
	}

	employeeCode, _ := services.GenerateEmployeeCode(db, role)
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	now := time.Now()

	if registeredAt == "" {
		registeredAt = now.Format("2006-01-02")
	}
	if status == "Inactive" && inactiveAt == "" {
		inactiveAt = now.Format("2006-01-02")
	}

	res, err := db.Exec(`INSERT INTO users (employee_code, name, email, role, division, status, registered_at, inactive_at, password, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		employeeCode, name, email, role, division, status, registeredAt, nullIfEmpty(inactiveAt), string(hash), now, now)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal membuat akun")
		return
	}
	userID, _ := res.LastInsertId()

	if role == models.RoleStaff {
		religion := c.PostForm("religion")
		gender := c.PostForm("gender")
		education := c.PostForm("education_level")
		_, _ = db.Exec(`INSERT INTO staff_profiles (user_id, religion, gender, education_level, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
			userID, religion, gender, education, now, now)
	}

	c.JSON(http.StatusOK, gin.H{"status": "Akun baru berhasil dibuat."})
}

func SuperAdminAccountsUpdate(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	name := c.PostForm("name")
	email := strings.ToLower(c.PostForm("email"))
	role := c.PostForm("role")
	division := c.PostForm("division")
	status := c.PostForm("status")
	registeredAt := c.PostForm("registered_at")
	inactiveAt := c.PostForm("inactive_at")
	password := c.PostForm("password")

	name = strings.TrimSpace(name)
	email = strings.TrimSpace(email)
	role = strings.TrimSpace(role)
	division = strings.TrimSpace(division)
	status = strings.TrimSpace(status)
	registeredAt = strings.TrimSpace(registeredAt)
	inactiveAt = strings.TrimSpace(inactiveAt)
	password = strings.TrimSpace(password)

	fieldErrors := FieldErrors{}
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
	if role == models.RoleAdmin || role == models.RoleStaff {
		if division == "" {
			fieldErrors["division"] = "Divisi wajib dipilih."
		}
	}
	if role == models.RoleStaff {
		if strings.TrimSpace(c.PostForm("religion")) == "" {
			fieldErrors["religion"] = "Agama wajib dipilih."
		}
		if strings.TrimSpace(c.PostForm("gender")) == "" {
			fieldErrors["gender"] = "Jenis kelamin wajib dipilih."
		}
		if strings.TrimSpace(c.PostForm("education_level")) == "" {
			fieldErrors["education_level"] = "Tingkat pendidikan wajib dipilih."
		}
	}
	if len(fieldErrors) > 0 {
		ValidationErrors(c, fieldErrors)
		return
	}

	db := middleware.GetDB(c)

	var exists int
	_ = db.Get(&exists, "SELECT COUNT(*) FROM users WHERE email = ? AND id != ?", email, id)
	if exists > 0 {
		ValidationErrors(c, FieldErrors{"email": "Email sudah digunakan."})
		return
	}

	if status == "Inactive" && inactiveAt == "" {
		inactiveAt = time.Now().Format("2006-01-02")
	}

	updateFields := []string{"name = ?", "email = ?", "role = ?", "division = ?", "status = ?", "registered_at = ?", "inactive_at = ?", "updated_at = ?"}
	args := []any{name, email, role, division, status, registeredAt, nullIfEmpty(inactiveAt), time.Now()}
	if password != "" {
		hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		updateFields = append(updateFields, "password = ?")
		args = append(args, string(hash))
	}
	args = append(args, id)

	query := "UPDATE users SET " + strings.Join(updateFields, ", ") + " WHERE id = ?"
	_, _ = db.Exec(query, args...)

	if role == models.RoleStaff {
		religion := c.PostForm("religion")
		gender := c.PostForm("gender")
		education := c.PostForm("education_level")
		_, _ = db.Exec(`INSERT INTO staff_profiles (user_id, religion, gender, education_level, created_at, updated_at)
            VALUES (?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE religion=VALUES(religion), gender=VALUES(gender), education_level=VALUES(education_level), updated_at=NOW()`,
			id, religion, gender, education)
	} else {
		_, _ = db.Exec("DELETE FROM staff_profiles WHERE user_id = ?", id)
	}

	c.JSON(http.StatusOK, gin.H{"status": "Akun berhasil diperbarui."})
}

func SuperAdminAccountsDelete(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	db := middleware.GetDB(c)
	_, _ = db.Exec("DELETE FROM users WHERE id = ?", id)
	c.JSON(http.StatusOK, gin.H{"status": "Akun berhasil dihapus."})
}

func SuperAdminAccountsToggleStatus(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	db := middleware.GetDB(c)
	var status string
	_ = db.Get(&status, "SELECT status FROM users WHERE id = ?", id)
	newStatus := "Active"
	inactiveAt := sql.NullString{}
	if status == "Active" {
		newStatus = "Inactive"
		inactiveAt.Valid = true
		inactiveAt.String = time.Now().Format("2006-01-02")
	}
	_, _ = db.Exec("UPDATE users SET status = ?, inactive_at = ? WHERE id = ?", newStatus, inactiveAt, id)
	c.JSON(http.StatusOK, gin.H{"status": "Status akun telah diperbarui."})
}

func SuperAdminAccountsResetPassword(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	plain, _ := utils.RandomToken(8)
	if plain == "" {
		plain = "Temp1234"
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	db := middleware.GetDB(c)
	_, _ = db.Exec("UPDATE users SET password = ? WHERE id = ?", string(hash), id)

	c.JSON(http.StatusOK, gin.H{"status": "Password baru berhasil dibuat.", "generated_password": plain})
}

func countUsersByRole(users []models.User, role string) int {
	count := 0
	for _, u := range users {
		if u.Role == role {
			count++
		}
	}
	return count
}

func nullIfEmpty(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

func buildPaginationLinks(basePath string, current int, last int, filters map[string]string) []map[string]any {
	if last < 1 {
		last = 1
	}
	links := []map[string]any{}
	links = append(links, map[string]any{
		"url":    pageURL(basePath, current-1, filters, last),
		"label":  "&laquo; Previous",
		"active": false,
	})

	for i := 1; i <= last; i++ {
		links = append(links, map[string]any{
			"url":    pageURL(basePath, i, filters, last),
			"label":  strconv.Itoa(i),
			"active": i == current,
		})
	}

	links = append(links, map[string]any{
		"url":    pageURL(basePath, current+1, filters, last),
		"label":  "Next &raquo;",
		"active": false,
	})

	return links
}

func pageURL(basePath string, page int, filters map[string]string, last int) any {
	if page < 1 || page > last {
		return nil
	}
	values := url.Values{}
	for key, value := range filters {
		if strings.TrimSpace(value) == "" || value == "all" {
			continue
		}
		values.Set(key, value)
	}
	if page > 1 {
		values.Set("page", strconv.Itoa(page))
	}
	if len(values) == 0 {
		return basePath
	}
	return basePath + "?" + values.Encode()
}
