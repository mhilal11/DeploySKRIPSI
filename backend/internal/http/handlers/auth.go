package handlers

import (
	"crypto/hmac"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	"hris-backend/internal/services"
	"hris-backend/internal/utils"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type loginRequest struct {
	Email    string `form:"email" json:"email"`
	Password string `form:"password" json:"password"`
	Remember bool   `form:"remember" json:"remember"`
}

type registerRequest struct {
	Name                 string `form:"name" json:"name"`
	Email                string `form:"email" json:"email"`
	Password             string `form:"password" json:"password"`
	PasswordConfirmation string `form:"password_confirmation" json:"password_confirmation"`
}

type forgotPasswordRequest struct {
	Email string `form:"email" json:"email"`
}

type resetPasswordRequest struct {
	Token                string `form:"token" json:"token"`
	Email                string `form:"email" json:"email"`
	Password             string `form:"password" json:"password"`
	PasswordConfirmation string `form:"password_confirmation" json:"password_confirmation"`
}

type confirmPasswordRequest struct {
	Password string `form:"password" json:"password"`
}

func RegisterAuthRoutes(rg *gin.RouterGroup) {
	rg.GET("/me", GetMe)
	rg.GET("/login", AuthInfo)
	rg.GET("/register", AuthInfo)
	rg.GET("/auth/google/register", GoogleRegister)
	rg.GET("/auth/google/register/callback", GoogleRegisterCallback)
	rg.POST("/login", Login)
	rg.POST("/logout", Logout)
	rg.POST("/register", Register)
	rg.POST("/forgot-password", ForgotPassword)
	rg.POST("/reset-password", ResetPassword)
	rg.POST("/confirm-password", ConfirmPassword)
	rg.POST("/email/verification-notification", VerificationNotification)
	rg.GET("/verify-email", VerifyEmail)
	rg.GET("/verify-email/:id/:hash", VerifyEmail)
}

func AuthInfo(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"canResetPassword": true,
		"status":           strings.TrimSpace(c.Query("status")),
		"oauth_error":      strings.TrimSpace(c.Query("oauth_error")),
		"oauth_error_code": strings.TrimSpace(c.Query("oauth_error_code")),
	})
}

func GetCSRF(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"csrf_token": c.GetString("csrf_token")})
}

func GetMe(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil {
		c.JSON(http.StatusOK, gin.H{"user": nil})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": sanitizeUser(user)})
}

func Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBind(&req); err != nil {
		ValidationErrors(c, FieldErrors{"email": "Email wajib diisi.", "password": "Password wajib diisi."})
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || req.Password == "" {
		ValidationErrors(c, FieldErrors{"credentials": "Email atau kata sandi salah."})
		return
	}

	db := middleware.GetDB(c)
	var user models.User
	if err := db.Get(&user, "SELECT * FROM users WHERE email = ? LIMIT 1", req.Email); err != nil {
		ValidationErrors(c, FieldErrors{"credentials": "Email atau kata sandi salah."})
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		ValidationErrors(c, FieldErrors{"credentials": "Email atau kata sandi salah."})
		return
	}

	if user.Status == "Inactive" {
		ValidationErrors(c, FieldErrors{"account_status": "Akun Anda telah dinonaktifkan. Silakan hubungi administrator untuk informasi lebih lanjut."})
		return
	}

	now := time.Now()
	_, _ = db.Exec("UPDATE users SET last_login_at = ? WHERE id = ?", now, user.ID)

	session := sessions.Default(c)
	session.Set("user_id", user.ID)
	_ = session.Save()

	c.JSON(http.StatusOK, gin.H{
		"user":        sanitizeUser(&user),
		"redirect_to": dashboardPathFor(user),
	})
}

func Logout(c *gin.Context) {
	session := sessions.Default(c)
	session.Clear()
	_ = session.Save()
	c.JSON(http.StatusOK, gin.H{"redirect_to": "/"})
}

func Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBind(&req); err != nil {
		ValidationErrors(c, FieldErrors{"name": "Nama wajib diisi.", "email": "Email wajib diisi.", "password": "Password wajib diisi."})
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Password != req.PasswordConfirmation {
		ValidationErrors(c, FieldErrors{"password_confirmation": "Konfirmasi password tidak sama."})
		return
	}

	db := middleware.GetDB(c)
	var exists int
	_ = db.Get(&exists, "SELECT COUNT(*) FROM users WHERE email = ?", req.Email)
	if exists > 0 {
		ValidationErrors(c, FieldErrors{"email": "Email sudah digunakan."})
		return
	}

	employeeCode, err := services.GenerateEmployeeCode(db, models.RolePelamar)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal membuat kode karyawan")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal menyimpan password")
		return
	}

	now := time.Now()
	res, err := db.Exec(`INSERT INTO users (employee_code, name, email, role, status, registered_at, password, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'Active', ?, ?, ?, ?)`,
		employeeCode, req.Name, req.Email, models.RolePelamar, now.Format("2006-01-02"), string(hash), now, now)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal membuat akun")
		return
	}
	userID, _ := res.LastInsertId()

	_, _ = db.Exec(`INSERT INTO applicant_profiles (user_id, full_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
		userID, req.Name, req.Email, now, now)

	sendVerificationEmail(c, &models.User{ID: userID, Name: req.Name, Email: req.Email})

	c.JSON(http.StatusOK, gin.H{
		"status":      "Akun Anda berhasil dibuat. Silakan masuk menggunakan email dan password yang telah didaftarkan.",
		"redirect_to": "/login",
	})
}

func ForgotPassword(c *gin.Context) {
	var req forgotPasswordRequest
	if err := c.ShouldBind(&req); err != nil || strings.TrimSpace(req.Email) == "" {
		ValidationErrors(c, FieldErrors{"email": "Email wajib diisi."})
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	db := middleware.GetDB(c)
	var exists int
	_ = db.Get(&exists, "SELECT COUNT(*) FROM users WHERE email = ?", req.Email)

	var token string
	if exists > 0 {
		token, _ = utils.RandomToken(24)
		if token == "" {
			token = "reset-token"
		}
		_, _ = db.Exec("DELETE FROM password_reset_tokens WHERE email = ?", req.Email)
		_, _ = db.Exec("INSERT INTO password_reset_tokens (email, token, created_at) VALUES (?, ?, ?)", req.Email, token, time.Now())

		cfg := middleware.GetConfig(c)
		resetURL := cfg.FrontendURL + "/reset-password/" + token + "?email=" + url.QueryEscape(req.Email)
		body := fmt.Sprintf("Halo,\n\nSilakan klik tautan berikut untuk mereset kata sandi Anda:\n%s\n\nTautan ini berlaku selama 60 menit.\nJika Anda tidak meminta reset kata sandi, abaikan email ini.", resetURL)
		_ = services.SendEmail(cfg, req.Email, "Reset Kata Sandi", body)
	}

	statusMessage := "Jika email terdaftar, link reset password telah dikirim."
	redirectURL := "/forgot-password?status=" + url.QueryEscape(statusMessage)
	c.JSON(http.StatusOK, gin.H{"status": statusMessage, "redirect_to": redirectURL})
}

func ResetPassword(c *gin.Context) {
	var req resetPasswordRequest
	if err := c.ShouldBind(&req); err != nil {
		ValidationErrors(c, FieldErrors{"email": "Email wajib diisi.", "token": "Token wajib diisi."})
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Password == "" || req.Password != req.PasswordConfirmation {
		ValidationErrors(c, FieldErrors{"password_confirmation": "Konfirmasi password tidak sama."})
		return
	}

	db := middleware.GetDB(c)
	var record struct {
		Token     string    `db:"token"`
		CreatedAt time.Time `db:"created_at"`
	}
	if err := db.Get(&record, "SELECT token, created_at FROM password_reset_tokens WHERE email = ? LIMIT 1", req.Email); err != nil || record.Token != req.Token {
		ValidationErrors(c, FieldErrors{"token": "Token reset tidak valid."})
		return
	}
	if time.Since(record.CreatedAt) > 60*time.Minute {
		_, _ = db.Exec("DELETE FROM password_reset_tokens WHERE email = ?", req.Email)
		ValidationErrors(c, FieldErrors{"token": "Token reset sudah kedaluwarsa."})
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if _, err := db.Exec("UPDATE users SET password = ? WHERE email = ?", string(hash), req.Email); err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal memperbarui password")
		return
	}
	_, _ = db.Exec("DELETE FROM password_reset_tokens WHERE email = ?", req.Email)

	c.JSON(http.StatusOK, gin.H{"status": "Password berhasil diperbarui.", "redirect_to": "/login"})
}

func ConfirmPassword(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil {
		JSONError(c, http.StatusUnauthorized, "Unauthenticated")
		return
	}

	var req confirmPasswordRequest
	if err := c.ShouldBind(&req); err != nil || req.Password == "" {
		ValidationErrors(c, FieldErrors{"password": "Password wajib diisi."})
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		ValidationErrors(c, FieldErrors{"password": "Password salah."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "Password terkonfirmasi."})
}

func VerificationNotification(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil {
		JSONError(c, http.StatusUnauthorized, "Unauthenticated")
		return
	}
	if user.EmailVerifiedAt != nil {
		c.JSON(http.StatusOK, gin.H{"redirect_to": "/dashboard"})
		return
	}

	session := sessions.Default(c)
	if lastSentRaw := session.Get("verification_sent_at"); lastSentRaw != nil {
		var lastSent int64
		switch v := lastSentRaw.(type) {
		case int64:
			lastSent = v
		case int:
			lastSent = int64(v)
		case float64:
			lastSent = int64(v)
		}
		if lastSent > 0 && time.Since(time.Unix(lastSent, 0)) < time.Minute {
			JSONError(c, http.StatusTooManyRequests, "Terlalu banyak permintaan. Coba lagi sebentar.")
			return
		}
	}

	sendVerificationEmail(c, user)
	session.Set("verification_sent_at", time.Now().Unix())
	_ = session.Save()

	redirectURL := statusRedirectFromReferer(c, "verification-link-sent", "/verify-email")
	c.JSON(http.StatusOK, gin.H{
		"status":       "verification-link-sent",
		"redirect_to":  redirectURL,
		"email_target": user.Email,
	})
}

func VerifyEmail(c *gin.Context) {
	id := c.Param("id")
	hash := c.Param("hash")
	if id == "" {
		id = c.Query("id")
	}
	if hash == "" {
		hash = c.Query("hash")
	}
	if id == "" {
		JSONError(c, http.StatusBadRequest, "Invalid verification request")
		return
	}
	userID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		JSONError(c, http.StatusBadRequest, "Invalid verification request")
		return
	}
	expires, _ := strconv.ParseInt(c.Query("expires"), 10, 64)
	signature := c.Query("signature")
	if expires == 0 || signature == "" {
		JSONError(c, http.StatusBadRequest, "Invalid verification request")
		return
	}
	if time.Now().Unix() > expires {
		JSONError(c, http.StatusGone, "Link verifikasi sudah kedaluwarsa.")
		return
	}

	db := middleware.GetDB(c)
	var user models.User
	if err := db.Get(&user, "SELECT * FROM users WHERE id = ? LIMIT 1", userID); err != nil {
		JSONError(c, http.StatusNotFound, "User tidak ditemukan")
		return
	}

	expectedHash := sha1Hex(user.Email)
	if hash != expectedHash {
		JSONError(c, http.StatusBadRequest, "Invalid verification request")
		return
	}
	if !verifySignature(middleware.GetConfig(c).CSRFSecret, userID, hash, expires, signature) {
		JSONError(c, http.StatusBadRequest, "Invalid verification request")
		return
	}

	if user.EmailVerifiedAt == nil {
		_, _ = db.Exec("UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?", time.Now(), time.Now(), userID)
	}

	redirectURL := "/dashboard"
	if wantsJSON(c) {
		c.JSON(http.StatusOK, gin.H{"status": "verified", "redirect_to": redirectURL})
		return
	}
	c.Redirect(http.StatusFound, middleware.GetConfig(c).FrontendURL+redirectURL)
}

func dashboardPathFor(user models.User) string {
	if user.IsHumanCapitalAdmin() {
		return "/super-admin/admin-hr/dashboard"
	}
	switch user.Role {
	case models.RoleSuperAdmin:
		return "/super-admin/dashboard"
	case models.RoleAdmin:
		return "/admin-staff/dashboard"
	case models.RoleStaff:
		return "/staff/dashboard"
	case models.RolePelamar:
		return "/pelamar/dashboard"
	default:
		return "/dashboard"
	}
}

func sanitizeUser(user *models.User) gin.H {
	if user == nil {
		return nil
	}
	return gin.H{
		"id":                user.ID,
		"employee_code":     user.EmployeeCode,
		"name":              user.Name,
		"email":             user.Email,
		"role":              user.Role,
		"division":          user.Division,
		"status":            user.Status,
		"registered_at":     user.RegisteredAt,
		"inactive_at":       user.InactiveAt,
		"last_login_at":     user.LastLoginAt,
		"email_verified_at": user.EmailVerifiedAt,
	}
}

func buildVerificationLink(c *gin.Context, user *models.User) (string, error) {
	cfg := middleware.GetConfig(c)
	expires := time.Now().Add(60 * time.Minute).Unix()
	hash := sha1Hex(user.Email)
	signature := signVerification(cfg.CSRFSecret, user.ID, hash, expires)
	path := "/verify-email/" + strconv.FormatInt(user.ID, 10) + "/" + hash
	link := cfg.BaseURL + path + "?expires=" + strconv.FormatInt(expires, 10) + "&signature=" + signature
	return link, nil
}

func sendVerificationEmail(c *gin.Context, user *models.User) {
	if user == nil || user.Email == "" {
		return
	}
	link, err := buildVerificationLink(c, user)
	if err != nil {
		return
	}
	cfg := middleware.GetConfig(c)
	body := fmt.Sprintf("Halo %s,\n\nSilakan verifikasi alamat email Anda dengan membuka tautan berikut:\n%s\n\nTautan ini berlaku selama 60 menit.\nJika Anda tidak membuat akun, abaikan email ini.", user.Name, link)
	_ = services.SendEmail(cfg, user.Email, "Verifikasi Email", body)
}

func signVerification(secret string, userID int64, hash string, expires int64) string {
	mac := hmac.New(sha256.New, []byte(secret))
	payload := strconv.FormatInt(userID, 10) + "|" + hash + "|" + strconv.FormatInt(expires, 10)
	mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
}

func verifySignature(secret string, userID int64, hash string, expires int64, signature string) bool {
	expected := signVerification(secret, userID, hash, expires)
	return hmac.Equal([]byte(expected), []byte(signature))
}

func sha1Hex(value string) string {
	sum := sha1.Sum([]byte(value))
	return hex.EncodeToString(sum[:])
}

func wantsJSON(c *gin.Context) bool {
	accept := c.GetHeader("Accept")
	return strings.Contains(accept, "application/json") || strings.Contains(c.FullPath(), "/api/")
}

func statusRedirectFromReferer(c *gin.Context, status string, fallbackPath string) string {
	ref := c.GetHeader("Referer")
	if ref != "" {
		if parsed, err := url.Parse(ref); err == nil {
			query := parsed.Query()
			query.Set("status", status)
			parsed.RawQuery = query.Encode()
			path := parsed.Path
			if path == "" {
				path = fallbackPath
			}
			if parsed.RawQuery != "" {
				return path + "?" + parsed.RawQuery
			}
			return path
		}
	}
	return fallbackPath + "?status=" + url.QueryEscape(status)
}
