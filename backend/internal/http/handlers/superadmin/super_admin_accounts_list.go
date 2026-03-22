package superadmin

import (
	"net/http"
	"strconv"

	"hris-backend/internal/http/handlers"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func SuperAdminAccountsIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	filters := map[string]string{
		"search":   c.Query("search"),
		"role":     c.Query("role"),
		"status":   c.Query("status"),
		"division": c.Query("division"),
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage := 10

	users, total, err := dbrepo.ListUsers(db, dbrepo.UserListFilters{
		Search:   filters["search"],
		Role:     filters["role"],
		Status:   filters["status"],
		Division: filters["division"],
	}, page, perPage)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat daftar akun")
		return
	}

	lastPage := (total + perPage - 1) / perPage
	if lastPage == 0 {
		lastPage = 1
	}
	if page > lastPage {
		page = lastPage
		users, total, err = dbrepo.ListUsers(db, dbrepo.UserListFilters{
			Search:   filters["search"],
			Role:     filters["role"],
			Status:   filters["status"],
			Division: filters["division"],
		}, page, perPage)
		if err != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat daftar akun")
			return
		}
	}

	data := make([]map[string]any, 0, len(users))
	for _, row := range users {
		data = append(data, map[string]any{
			"id":            row.ID,
			"employee_code": row.EmployeeCode,
			"name":          row.Name,
			"email":         row.Email,
			"role":          row.Role,
			"division":      row.Division,
			"status":        row.Status,
			"registered_at": handlers.FormatDateISO(row.RegisteredAt),
			"inactive_at":   handlers.FormatDateISO(row.InactiveAt),
			"last_login_at": handlers.FormatDateTime(row.LastLoginAt),
			"created_at":    handlers.FormatDateTime(row.CreatedAt),
		})
	}

	statsFromDB, err := dbrepo.CountUsersByRoleStats(db)
	if err != nil {
		statsFromDB = dbrepo.UserRoleStats{}
	}
	stats := map[string]int{
		"total":       statsFromDB.Total,
		"super_admin": statsFromDB.SuperAdmin,
		"admin":       statsFromDB.Admin,
		"staff":       statsFromDB.Staff,
		"pelamar":     statsFromDB.Pelamar,
	}

	var from any
	var to any
	if total > 0 && len(users) > 0 {
		offset := (page - 1) * perPage
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
		"divisionOptions":      accountDivisionOptions(db),
		"flash":                gin.H{"success": ""},
		"sidebarNotifications": handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func SuperAdminAccountsCreate(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleSuperAdmin {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	c.JSON(http.StatusOK, gin.H{
		"roleOptions":           models.UserRoles,
		"statusOptions":         models.UserStatuses,
		"divisionOptions":       accountDivisionOptions(db),
		"religionOptions":       models.StaffReligions,
		"genderOptions":         models.StaffGenders,
		"educationLevelOptions": models.StaffEducationLevels,
		"sidebarNotifications":  handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func SuperAdminAccountsEdit(c *gin.Context) {
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
	account, err := dbrepo.GetUserByID(db, id)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat data user")
		return
	}
	if account == nil {
		handlers.JSONError(c, http.StatusNotFound, "User tidak ditemukan")
		return
	}

	profile, err := dbrepo.GetStaffProfileByUserID(db, account.ID)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memuat profil staff")
		return
	}

	religion := any(nil)
	gender := any(nil)
	educationLevel := any(nil)
	if profile != nil {
		religion = profile.Religion
		gender = profile.Gender
		educationLevel = profile.EducationLevel
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":              account.ID,
			"employee_code":   account.EmployeeCode,
			"name":            account.Name,
			"email":           account.Email,
			"role":            account.Role,
			"division":        account.Division,
			"religion":        religion,
			"gender":          gender,
			"education_level": educationLevel,
			"status":          account.Status,
			"registered_at":   handlers.FormatDateISO(account.RegisteredAt),
			"inactive_at":     handlers.FormatDateISO(account.InactiveAt),
		},
		"roleOptions":           models.UserRoles,
		"statusOptions":         models.UserStatuses,
		"divisionOptions":       accountDivisionOptions(db),
		"religionOptions":       models.StaffReligions,
		"genderOptions":         models.StaffGenders,
		"educationLevelOptions": models.StaffEducationLevels,
		"sidebarNotifications":  handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func accountDivisionOptions(db *sqlx.DB) []string {
	options, err := services.DivisionNames(db)
	if err != nil {
		return []string{}
	}
	return options
}
