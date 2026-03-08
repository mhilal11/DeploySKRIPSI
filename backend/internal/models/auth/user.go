package authmodel

import (
	"strings"
	"time"
)

type User struct {
	ID              int64      `db:"id" json:"id"`
	EmployeeCode    *string    `db:"employee_code" json:"employee_code"`
	Name            string     `db:"name" json:"name"`
	Email           string     `db:"email" json:"email"`
	Role            string     `db:"role" json:"role"`
	Division        *string    `db:"division" json:"division"`
	Status          string     `db:"status" json:"status"`
	RegisteredAt    *time.Time `db:"registered_at" json:"registered_at"`
	InactiveAt      *time.Time `db:"inactive_at" json:"inactive_at"`
	LastLoginAt     *time.Time `db:"last_login_at" json:"last_login_at"`
	EmailVerifiedAt *time.Time `db:"email_verified_at" json:"email_verified_at"`
	PasswordHash    string     `db:"password" json:"-"`
	RememberToken   *string    `db:"remember_token" json:"-"`
	CreatedAt       *time.Time `db:"created_at" json:"created_at"`
	UpdatedAt       *time.Time `db:"updated_at" json:"updated_at"`
}

const (
	RoleSuperAdmin = "Super Admin"
	RoleAdmin      = "Admin"
	RoleStaff      = "Staff"
	RolePelamar    = "Pelamar"
)

var UserRoles = []string{RoleSuperAdmin, RoleAdmin, RoleStaff, RolePelamar}

var UserStatuses = []string{"Active", "Inactive"}

func (u User) IsHumanCapitalAdmin() bool {
	if u.Role != RoleAdmin || u.Division == nil {
		return false
	}
	div := *u.Division
	return strings.Contains(strings.ToLower(div), "human capital") || strings.Contains(strings.ToLower(div), "human resources")
}
