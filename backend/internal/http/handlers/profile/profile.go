package profile

import (
	"hris-backend/internal/http/handlers"

	"net/http"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"

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
	Name  string `form:"name" json:"name"`
	Email string `form:"email" json:"email"`
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
	c.JSON(http.StatusOK, gin.H{
		"mustVerifyEmail": true,
		"status":          status,
	})
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
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Name == "" || req.Email == "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"name": "Nama wajib diisi.", "email": "Email wajib diisi."})
		return
	}

	db := middleware.GetDB(c)
	var exists int
	_ = db.Get(&exists, "SELECT COUNT(*) FROM users WHERE email = ? AND id != ?", req.Email, user.ID)
	if exists > 0 {
		handlers.ValidationErrors(c, handlers.FieldErrors{"email": "Email sudah digunakan."})
		return
	}

	emailVerifiedAt := user.EmailVerifiedAt
	if req.Email != user.Email {
		emailVerifiedAt = nil
	}

	_, err := db.Exec("UPDATE users SET name = ?, email = ?, email_verified_at = ?, updated_at = ? WHERE id = ?", req.Name, req.Email, emailVerifiedAt, time.Now(), user.ID)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui profil")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "saved"})
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

	if req.Password == "" || req.Password != req.PasswordConfirmation {
		handlers.ValidationErrors(c, handlers.FieldErrors{"password_confirmation": "Konfirmasi password tidak sama."})
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	db := middleware.GetDB(c)
	_, err := db.Exec("UPDATE users SET password = ?, updated_at = ? WHERE id = ?", string(hash), time.Now(), user.ID)
	if err != nil {
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
	_, err := db.Exec("DELETE FROM users WHERE id = ?", user.ID)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menghapus akun")
		return
	}

	session := sessions.Default(c)
	session.Clear()
	_ = session.Save()

	c.JSON(http.StatusOK, gin.H{"redirect_to": "/"})
}
