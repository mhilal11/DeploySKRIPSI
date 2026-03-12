package auth

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

	"hris-backend/internal/dto"
	"hris-backend/internal/http/handlers"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"
	"hris-backend/internal/services"
	"hris-backend/internal/utils"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
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

type authRepository interface {
	GetUserByEmail(email string) (*models.User, error)
	SetUserLastLogin(userID int64, at time.Time) error
	UserEmailExists(email string, excludeID *int64) (bool, error)
	CreatePelamarUserWithProfile(employeeCode, name, email, passwordHash string, registeredAt time.Time, emailVerifiedAt *time.Time, now time.Time) (int64, error)
	SavePasswordResetToken(email, token string, now time.Time) error
	GetPasswordResetTokenByEmail(email string) (*dbrepo.PasswordResetTokenRecord, error)
	DeletePasswordResetTokenByEmail(email string) error
	UpdateUserPasswordByEmail(email, passwordHash string) error
	GetUserByID(userID int64) (*models.User, error)
	MarkUserEmailVerified(userID int64, now time.Time) error
}

type sqlAuthRepository struct {
	db *sqlx.DB
}

func newAuthRepository(db *sqlx.DB) authRepository {
	return &sqlAuthRepository{db: db}
}

func (r *sqlAuthRepository) GetUserByEmail(email string) (*models.User, error) {
	return dbrepo.GetUserByEmail(r.db, email)
}

func (r *sqlAuthRepository) SetUserLastLogin(userID int64, at time.Time) error {
	return dbrepo.SetUserLastLogin(r.db, userID, at)
}

func (r *sqlAuthRepository) UserEmailExists(email string, excludeID *int64) (bool, error) {
	return dbrepo.UserEmailExists(r.db, email, excludeID)
}

func (r *sqlAuthRepository) CreatePelamarUserWithProfile(employeeCode, name, email, passwordHash string, registeredAt time.Time, emailVerifiedAt *time.Time, now time.Time) (int64, error) {
	return dbrepo.CreatePelamarUserWithProfile(r.db, employeeCode, name, email, passwordHash, registeredAt, emailVerifiedAt, now)
}

func (r *sqlAuthRepository) SavePasswordResetToken(email, token string, now time.Time) error {
	return dbrepo.SavePasswordResetToken(r.db, email, token, now)
}

func (r *sqlAuthRepository) GetPasswordResetTokenByEmail(email string) (*dbrepo.PasswordResetTokenRecord, error) {
	return dbrepo.GetPasswordResetTokenByEmail(r.db, email)
}

func (r *sqlAuthRepository) DeletePasswordResetTokenByEmail(email string) error {
	return dbrepo.DeletePasswordResetTokenByEmail(r.db, email)
}

func (r *sqlAuthRepository) UpdateUserPasswordByEmail(email, passwordHash string) error {
	return dbrepo.UpdateUserPasswordByEmail(r.db, email, passwordHash)
}

func (r *sqlAuthRepository) GetUserByID(userID int64) (*models.User, error) {
	return dbrepo.GetUserByID(r.db, userID)
}

func (r *sqlAuthRepository) MarkUserEmailVerified(userID int64, now time.Time) error {
	return dbrepo.MarkUserEmailVerified(r.db, userID, now)
}

const (
	maxEmailLength    = 254
	maxNameLength     = 120
	maxPasswordLength = 128
	maxTokenLength    = 255
)

func RegisterAuthRoutes(rg *gin.RouterGroup) {
	rg.GET("/me", GetMe)
	rg.GET("/login", AuthInfo)
	rg.GET("/register", AuthInfo)
	rg.GET("/auth/google/register", GoogleRegister)
	rg.GET("/auth/google/register/callback", GoogleRegisterCallback)
	rg.POST("/logout", Logout)
	rg.POST("/confirm-password", ConfirmPassword)
	rg.POST("/email/verification-notification", VerificationNotification)
	rg.GET("/verify-email", VerifyEmail)
	rg.GET("/verify-email/:id/:hash", VerifyEmail)

	authLimiter := middleware.RateLimit(8, time.Minute)
	rg.POST("/login", authLimiter, Login)
	rg.POST("/register", authLimiter, Register)
	rg.POST("/forgot-password", authLimiter, ForgotPassword)
	rg.POST("/reset-password", authLimiter, ResetPassword)
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
	c.JSON(http.StatusOK, gin.H{"user": dto.UserFromModel(user)})
}

func Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBind(&req); err != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"email": "Email wajib diisi.", "password": "Password wajib diisi."})
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || req.Password == "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"credentials": "Email atau kata sandi salah."})
		return
	}
	if field, msg := validateAuthFieldLengths(req.Email, maxEmailLength, "Email"); field != "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"email": msg})
		return
	}
	if field, msg := validateAuthFieldLengths(req.Password, maxPasswordLength, "Password"); field != "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"password": msg})
		return
	}

	db := middleware.GetDB(c)
	repo := newAuthRepository(db)
	user, err := repo.GetUserByEmail(req.Email)
	if err != nil || user == nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"credentials": "Email atau kata sandi salah."})
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"credentials": "Email atau kata sandi salah."})
		return
	}

	if user.Status == "Inactive" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"account_status": "Akun Anda telah dinonaktifkan. Silakan hubungi administrator untuk informasi lebih lanjut."})
		return
	}

	now := time.Now()
	_ = repo.SetUserLastLogin(user.ID, now)

	session := sessions.Default(c)
	if err := renewAuthenticatedSession(session, user.ID); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menyimpan sesi login.")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user":        dto.UserFromModel(user),
		"redirect_to": dashboardPathFor(*user),
	})
}

func Logout(c *gin.Context) {
	session := sessions.Default(c)
	session.Clear()
	if err := session.Save(); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menghapus sesi.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"redirect_to": "/"})
}

func Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBind(&req); err != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"name": "Nama wajib diisi.", "email": "Email wajib diisi.", "password": "Password wajib diisi."})
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if field, msg := validateAuthFieldLengths(req.Name, maxNameLength, "Nama"); field != "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"name": msg})
		return
	}
	if field, msg := validateAuthFieldLengths(req.Email, maxEmailLength, "Email"); field != "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"email": msg})
		return
	}
	if field, msg := validateAuthFieldLengths(req.Password, maxPasswordLength, "Password"); field != "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"password": msg})
		return
	}
	if field, msg := validateAuthFieldLengths(req.PasswordConfirmation, maxPasswordLength, "Konfirmasi password"); field != "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"password_confirmation": msg})
		return
	}
	if req.Password != req.PasswordConfirmation {
		handlers.ValidationErrors(c, handlers.FieldErrors{"password_confirmation": "Konfirmasi password tidak sama."})
		return
	}

	db := middleware.GetDB(c)
	repo := newAuthRepository(db)
	exists, _ := repo.UserEmailExists(req.Email, nil)
	if exists {
		handlers.ValidationErrors(c, handlers.FieldErrors{"email": "Email sudah digunakan."})
		return
	}

	employeeCode, err := services.GenerateEmployeeCode(db, models.RolePelamar)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal membuat kode karyawan")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal menyimpan password")
		return
	}

	now := time.Now()
	userID, err := repo.CreatePelamarUserWithProfile(
		employeeCode,
		req.Name,
		req.Email,
		string(hash),
		now,
		nil,
		now,
	)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal membuat akun")
		return
	}

	sendVerificationEmail(c, &models.User{ID: userID, Name: req.Name, Email: req.Email})

	c.JSON(http.StatusOK, gin.H{
		"status":      "Akun Anda berhasil dibuat. Silakan masuk menggunakan email dan password yang telah didaftarkan.",
		"redirect_to": "/login",
	})
}

func ForgotPassword(c *gin.Context) {
	var req forgotPasswordRequest
	if err := c.ShouldBind(&req); err != nil || strings.TrimSpace(req.Email) == "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"email": "Email wajib diisi."})
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if field, msg := validateAuthFieldLengths(req.Email, maxEmailLength, "Email"); field != "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"email": msg})
		return
	}

	db := middleware.GetDB(c)
	repo := newAuthRepository(db)
	exists, _ := repo.UserEmailExists(req.Email, nil)

	var token string
	if exists {
		token, _ = utils.RandomToken(24)
		if token == "" {
			token = "reset-token"
		}
		_ = repo.SavePasswordResetToken(req.Email, token, time.Now())

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
		handlers.ValidationErrors(c, handlers.FieldErrors{"email": "Email wajib diisi.", "token": "Token wajib diisi."})
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if field, msg := validateAuthFieldLengths(req.Email, maxEmailLength, "Email"); field != "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"email": msg})
		return
	}
	if field, msg := validateAuthFieldLengths(req.Token, maxTokenLength, "Token"); field != "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"token": msg})
		return
	}
	if field, msg := validateAuthFieldLengths(req.Password, maxPasswordLength, "Password"); field != "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"password": msg})
		return
	}
	if field, msg := validateAuthFieldLengths(req.PasswordConfirmation, maxPasswordLength, "Konfirmasi password"); field != "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"password_confirmation": msg})
		return
	}
	if req.Password == "" || req.Password != req.PasswordConfirmation {
		handlers.ValidationErrors(c, handlers.FieldErrors{"password_confirmation": "Konfirmasi password tidak sama."})
		return
	}

	db := middleware.GetDB(c)
	repo := newAuthRepository(db)
	record, err := repo.GetPasswordResetTokenByEmail(req.Email)
	if err != nil || record == nil || record.Token != req.Token {
		handlers.ValidationErrors(c, handlers.FieldErrors{"token": "Token reset tidak valid."})
		return
	}
	if time.Since(record.CreatedAt) > 60*time.Minute {
		_ = repo.DeletePasswordResetTokenByEmail(req.Email)
		handlers.ValidationErrors(c, handlers.FieldErrors{"token": "Token reset sudah kedaluwarsa."})
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err := repo.UpdateUserPasswordByEmail(req.Email, string(hash)); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui password")
		return
	}
	_ = repo.DeletePasswordResetTokenByEmail(req.Email)

	c.JSON(http.StatusOK, gin.H{"status": "Password berhasil diperbarui.", "redirect_to": "/login"})
}

func ConfirmPassword(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil {
		handlers.JSONError(c, http.StatusUnauthorized, "Unauthenticated")
		return
	}

	var req confirmPasswordRequest
	if err := c.ShouldBind(&req); err != nil || req.Password == "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"password": "Password wajib diisi."})
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"password": "Password salah."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "Password terkonfirmasi."})
}

func VerificationNotification(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil {
		handlers.JSONError(c, http.StatusUnauthorized, "Unauthenticated")
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
			handlers.JSONError(c, http.StatusTooManyRequests, "Terlalu banyak permintaan. Coba lagi sebentar.")
			return
		}
	}

	sendVerificationEmail(c, user)
	session.Set("verification_sent_at", time.Now().Unix())
	if err := session.Save(); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui status verifikasi.")
		return
	}

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
		handlers.JSONError(c, http.StatusBadRequest, "Invalid verification request")
		return
	}
	userID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		handlers.JSONError(c, http.StatusBadRequest, "Invalid verification request")
		return
	}
	expires, _ := strconv.ParseInt(c.Query("expires"), 10, 64)
	signature := c.Query("signature")
	if expires == 0 || signature == "" {
		handlers.JSONError(c, http.StatusBadRequest, "Invalid verification request")
		return
	}
	if time.Now().Unix() > expires {
		handlers.JSONError(c, http.StatusGone, "Link verifikasi sudah kedaluwarsa.")
		return
	}

	db := middleware.GetDB(c)
	repo := newAuthRepository(db)
	user, err := repo.GetUserByID(userID)
	if err != nil || user == nil {
		handlers.JSONError(c, http.StatusNotFound, "User tidak ditemukan")
		return
	}

	expectedHash := sha256Hex(user.Email)
	legacyHash := sha1LegacyHex(user.Email)
	if hash != expectedHash && hash != legacyHash {
		handlers.JSONError(c, http.StatusBadRequest, "Invalid verification request")
		return
	}
	if !verifySignature(middleware.GetConfig(c).CSRFSecret, userID, hash, expires, signature) {
		handlers.JSONError(c, http.StatusBadRequest, "Invalid verification request")
		return
	}

	if user.EmailVerifiedAt == nil {
		_ = repo.MarkUserEmailVerified(userID, time.Now())
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

func buildVerificationLink(c *gin.Context, user *models.User) (string, error) {
	cfg := middleware.GetConfig(c)
	expires := time.Now().Add(60 * time.Minute).Unix()
	hash := sha256Hex(user.Email)
	signature := signVerification(cfg.CSRFSecret, user.ID, hash, expires)
	path := "/verify-email/" + strconv.FormatInt(user.ID, 10) + "/" + hash
	link := cfg.BaseURL + path + "?expires=" + strconv.FormatInt(expires, 10) + "&signature=" + signature
	return link, nil
}

func renewAuthenticatedSession(session sessions.Session, userID int64) error {
	csrfToken, err := utils.RandomToken(32)
	if err != nil || strings.TrimSpace(csrfToken) == "" {
		return fmt.Errorf("failed to rotate csrf token")
	}

	session.Clear()
	session.Set("user_id", userID)
	session.Set("session_rotated_at", time.Now().Unix())
	session.Set("csrf_token", csrfToken)
	return session.Save()
}

func validateAuthFieldLengths(value string, maxLen int, label string) (string, string) {
	trimmed := strings.TrimSpace(value)
	if maxLen > 0 && len([]rune(trimmed)) > maxLen {
		return label, fmt.Sprintf("%s melebihi batas maksimum %d karakter.", label, maxLen)
	}
	return "", ""
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

func sha1LegacyHex(value string) string {
	sum := sha1.Sum([]byte(value))
	return hex.EncodeToString(sum[:])
}

func sha256Hex(value string) string {
	sum := sha256.Sum256([]byte(value))
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
