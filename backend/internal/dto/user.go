package dto

import (
	"time"

	"hris-backend/internal/models"
)

type UserResponse struct {
	ID              int64      `json:"id"`
	EmployeeCode    *string    `json:"employee_code"`
	Name            string     `json:"name"`
	Email           string     `json:"email"`
	Role            string     `json:"role"`
	Division        *string    `json:"division"`
	Status          string     `json:"status"`
	RegisteredAt    *time.Time `json:"registered_at"`
	InactiveAt      *time.Time `json:"inactive_at"`
	LastLoginAt     *time.Time `json:"last_login_at"`
	EmailVerifiedAt *time.Time `json:"email_verified_at"`
}

func UserFromModel(user *models.User) *UserResponse {
	if user == nil {
		return nil
	}
	return &UserResponse{
		ID:              user.ID,
		EmployeeCode:    user.EmployeeCode,
		Name:            user.Name,
		Email:           user.Email,
		Role:            user.Role,
		Division:        user.Division,
		Status:          user.Status,
		RegisteredAt:    user.RegisteredAt,
		InactiveAt:      user.InactiveAt,
		LastLoginAt:     user.LastLoginAt,
		EmailVerifiedAt: user.EmailVerifiedAt,
	}
}
