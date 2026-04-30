package auth

import (
	"encoding/json"
	"errors"
	"html"
	"html/template"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/config"
	"hris-backend/internal/http/handlers"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"
	"hris-backend/internal/services"
	"hris-backend/internal/utils"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
)

const (
	googleOAuthStateKey    = "google_oauth_state"
	googleOAuthNonceKey    = "google_oauth_nonce"
	googleOAuthIssuedAtKey = "google_oauth_issued_at"
)

type googleTokenClaims struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Nonce         string `json:"nonce"`
}

func GoogleRegister(c *gin.Context) {
	cfg := middleware.GetConfig(c)
	oauthCfg, err := googleOAuthConfig(cfg)
	if err != nil {
		redirectGoogleRegisterError(c, cfg, "Konfigurasi pendaftaran Google belum lengkap.")
		return
	}

	state, err := utils.RandomToken(32)
	if err != nil || state == "" {
		redirectGoogleRegisterError(c, cfg, "Gagal menyiapkan proses pendaftaran Google.")
		return
	}
	nonce, err := utils.RandomToken(32)
	if err != nil || nonce == "" {
		redirectGoogleRegisterError(c, cfg, "Gagal menyiapkan proses pendaftaran Google.")
		return
	}

	session := sessions.Default(c)
	session.Set(googleOAuthStateKey, state)
	session.Set(googleOAuthNonceKey, nonce)
	session.Set(googleOAuthIssuedAtKey, time.Now().Unix())
	if err := session.Save(); err != nil {
		redirectGoogleRegisterError(c, cfg, "Gagal menyiapkan sesi pendaftaran Google.")
		return
	}

	authURL := oauthCfg.AuthCodeURL(
		state,
		oauth2.AccessTypeOnline,
		oauth2.SetAuthURLParam("prompt", "select_account"),
		oauth2.SetAuthURLParam("nonce", nonce),
	)
	redirectBrowser(c, authURL)
}

func GoogleRegisterCallback(c *gin.Context) {
	cfg := middleware.GetConfig(c)
	oauthCfg, err := googleOAuthConfig(cfg)
	if err != nil {
		redirectGoogleRegisterError(c, cfg, "Konfigurasi pendaftaran Google belum lengkap.")
		return
	}

	session := sessions.Default(c)
	expectedState := sessionString(session.Get(googleOAuthStateKey))
	expectedNonce := sessionString(session.Get(googleOAuthNonceKey))
	issuedAt := sessionInt64(session.Get(googleOAuthIssuedAtKey))

	clearGoogleOAuthSession(session)
	if err := session.Save(); err != nil {
		redirectGoogleRegisterError(c, cfg, "Gagal membersihkan sesi pendaftaran Google.")
		return
	}

	queryState := strings.TrimSpace(c.Query("state"))
	code := strings.TrimSpace(c.Query("code"))
	if expectedState == "" || queryState == "" || queryState != expectedState {
		redirectGoogleRegisterError(c, cfg, "State OAuth tidak valid. Silakan coba lagi.")
		return
	}
	if code == "" {
		redirectGoogleRegisterError(c, cfg, "Kode otorisasi Google tidak ditemukan.")
		return
	}
	if issuedAt > 0 && time.Since(time.Unix(issuedAt, 0)) > 10*time.Minute {
		redirectGoogleRegisterError(c, cfg, "Sesi pendaftaran Google sudah kedaluwarsa. Coba lagi.")
		return
	}

	token, err := oauthCfg.Exchange(c.Request.Context(), code)
	if err != nil {
		redirectGoogleRegisterError(c, cfg, "Gagal menukar kode otorisasi Google.")
		return
	}

	rawIDToken, _ := token.Extra("id_token").(string)
	if rawIDToken == "" {
		redirectGoogleRegisterError(c, cfg, "Google tidak mengirim ID token yang valid.")
		return
	}

	provider, err := oidc.NewProvider(c.Request.Context(), "https://accounts.google.com")
	if err != nil {
		redirectGoogleRegisterError(c, cfg, "Gagal memvalidasi identitas Google.")
		return
	}

	idToken, err := provider.Verifier(&oidc.Config{ClientID: cfg.GoogleOAuthClientID}).Verify(c.Request.Context(), rawIDToken)
	if err != nil {
		redirectGoogleRegisterError(c, cfg, "ID token Google tidak valid.")
		return
	}

	var claims googleTokenClaims
	if err := idToken.Claims(&claims); err != nil {
		redirectGoogleRegisterError(c, cfg, "Data akun Google tidak dapat diproses.")
		return
	}

	if expectedNonce != "" && claims.Nonce != expectedNonce {
		redirectGoogleRegisterError(c, cfg, "Nonce OAuth tidak valid. Silakan coba lagi.")
		return
	}

	claims.Email = strings.ToLower(strings.TrimSpace(claims.Email))
	if claims.Email == "" {
		redirectGoogleRegisterError(c, cfg, "Email Google tidak tersedia.")
		return
	}
	if !claims.EmailVerified {
		redirectGoogleRegisterError(c, cfg, "Email Google belum terverifikasi.")
		return
	}

	db := middleware.GetDB(c)
	if db == nil {
		redirectGoogleRegisterError(c, cfg, "Koneksi database tidak tersedia.")
		return
	}

	exists, err := dbrepo.UserEmailExists(db, claims.Email, nil)
	if err != nil {
		redirectGoogleRegisterError(c, cfg, "Gagal memeriksa akun pengguna.")
		return
	}
	if exists {
		redirectGoogleRegisterErrorWithCode(c, cfg, "Email sudah terdaftar. Silakan login.", "email_exists")
		return
	}

	user, err := createGoogleRegisteredUser(c, claims)
	if err != nil {
		redirectGoogleRegisterError(c, cfg, err.Error())
		return
	}

	if err := sendGooglePasswordSetupEmail(c, user.Email); err != nil {
		redirectGoogleRegisterError(c, cfg, "Akun berhasil dibuat, tetapi email pengaturan kata sandi gagal dikirim.")
		return
	}

	redirectGoogleRegisterSuccess(c, cfg, "Akun berhasil dibuat dengan Google. Silakan cek email Anda untuk mengatur kata sandi, lalu login.")
}

func googleOAuthConfig(cfg config.Config) (*oauth2.Config, error) {
	clientID := strings.TrimSpace(cfg.GoogleOAuthClientID)
	clientSecret := strings.TrimSpace(cfg.GoogleOAuthClientSecret)
	redirectURL := strings.TrimSpace(cfg.GoogleOAuthRedirectURL)
	if clientID == "" || clientSecret == "" || redirectURL == "" {
		return nil, errors.New("google oauth config is incomplete")
	}
	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://accounts.google.com/o/oauth2/v2/auth",
			TokenURL: "https://oauth2.googleapis.com/token",
		},
	}, nil
}

func createGoogleRegisteredUser(c *gin.Context, claims googleTokenClaims) (*models.User, error) {
	db := middleware.GetDB(c)
	if db == nil {
		return nil, errors.New("Koneksi database tidak tersedia.")
	}

	seedPassword, err := utils.RandomToken(32)
	if err != nil || seedPassword == "" {
		seedPassword = claims.Sub + strconv.FormatInt(time.Now().UnixNano(), 10)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(seedPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("Gagal menyiapkan akun baru.")
	}

	displayName := handlers.NormalizePersonName(claims.Name)
	if displayName == "" {
		parts := strings.SplitN(claims.Email, "@", 2)
		candidate := handlers.NormalizePersonName(parts[0])
		if handlers.IsValidPersonName(candidate) {
			displayName = candidate
		} else {
			displayName = "Pelamar"
		}
	}
	if !handlers.IsValidPersonName(displayName) {
		displayName = "Pelamar"
	}

	now := time.Now()
	var userID int64
	_, err = services.WithGeneratedEmployeeCodeRetry(db, models.RolePelamar, func(code string) error {
		var createErr error
		userID, createErr = dbrepo.CreatePelamarUserWithProfile(
			db,
			code,
			displayName,
			claims.Email,
			string(hash),
			now,
			&now,
			now,
		)
		return createErr
	})
	if err != nil {
		return nil, errors.New("Gagal membuat akun baru.")
	}

	user, err := dbrepo.GetUserByID(db, userID)
	if err != nil || user == nil {
		return nil, errors.New("Gagal memuat akun pengguna.")
	}
	return user, nil
}

func sendGooglePasswordSetupEmail(c *gin.Context, email string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return errors.New("email kosong")
	}

	db := middleware.GetDB(c)
	if db == nil {
		return errors.New("database unavailable")
	}

	token, err := utils.RandomToken(24)
	if err != nil || token == "" {
		token = "setup-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	}

	if err := dbrepo.SavePasswordResetToken(db, email, token, time.Now()); err != nil {
		return err
	}

	cfg := middleware.GetConfig(c)
	resetURL := frontendURL(cfg, "/set-password/"+token+"?email="+url.QueryEscape(email))
	logoSrc, inlineAssets := resolveAuthEmailLogo(cfg)
	textBody, htmlBody := buildGoogleSetPasswordEmailTemplate(resetURL, logoSrc)
	return sendAuthEmailMultipart(cfg, email, "Atur Kata Sandi Akun", textBody, htmlBody, inlineAssets)
}

func buildGoogleSetPasswordEmailTemplate(resetURL string, logoURL string) (string, string) {
	cleanURL := strings.TrimSpace(resetURL)
	escapedURL := html.EscapeString(cleanURL)
	escapedLogoURL := html.EscapeString(strings.TrimSpace(logoURL))

	textBody := "Halo,\n\n" +
		"Akun Anda berhasil dibuat menggunakan Google.\n" +
		"Silakan atur kata sandi akun Anda melalui tautan berikut:\n" + cleanURL + "\n\n" +
		"Tautan ini berlaku selama 60 menit.\n\n" +
		"Salam,\nTim Rekrutmen Lintas Data Prima"

	htmlBody := `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Atur Kata Sandi Akun</title>
</head>
<body style="margin:0;padding:0;background:#f3f6fb;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f3f6fb;padding:28px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%);padding:24px 28px;">
              <img src="` + escapedLogoURL + `" alt="Lintas Data Prima" style="display:block;height:42px;width:auto;max-width:180px;margin-bottom:12px;" />
              <h1 style="margin:0;font-size:24px;line-height:1.3;color:#ffffff;">Atur Kata Sandi Akun</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155;">
                Akun Anda berhasil dibuat menggunakan Google. Silakan atur kata sandi agar Anda dapat login menggunakan email dan password.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
                <tr>
                  <td style="border-radius:10px;background:#1d4ed8;">
                    <a href="` + escapedURL + `" style="display:inline-block;padding:14px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                      Atur Kata Sandi
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#64748b;">
                Tautan ini berlaku selama <strong>60 menit</strong>.
              </p>
              <p style="margin:0;padding:12px 14px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;word-break:break-all;font-size:12px;line-height:1.6;color:#1e293b;">
                <a href="` + escapedURL + `" style="color:#1d4ed8;text-decoration:none;">` + escapedURL + `</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

	return textBody, htmlBody
}

func clearGoogleOAuthSession(session sessions.Session) {
	session.Delete(googleOAuthStateKey)
	session.Delete(googleOAuthNonceKey)
	session.Delete(googleOAuthIssuedAtKey)
}

func sessionString(value any) string {
	if v, ok := value.(string); ok {
		return strings.TrimSpace(v)
	}
	return ""
}

func sessionInt64(value any) int64 {
	switch v := value.(type) {
	case int64:
		return v
	case int:
		return int64(v)
	case float64:
		return int64(v)
	case string:
		parsed, _ := strconv.ParseInt(strings.TrimSpace(v), 10, 64)
		return parsed
	default:
		return 0
	}
}

func frontendURL(cfg config.Config, path string) string {
	base := firstNonEmpty(strings.Split(cfg.FrontendURL, ",")...)
	base = strings.TrimRight(base, "/")

	if path == "" {
		path = "/"
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}

	if base == "" {
		return path
	}
	return base + path
}

func redirectGoogleRegisterError(c *gin.Context, cfg config.Config, message string) {
	redirectGoogleRegisterErrorWithCode(c, cfg, message, "")
}

func redirectGoogleRegisterErrorWithCode(c *gin.Context, cfg config.Config, message string, code string) {
	msg := strings.TrimSpace(message)
	if msg == "" {
		msg = "Pendaftaran Google gagal."
	}
	query := url.Values{}
	query.Set("oauth_error", msg)
	code = strings.TrimSpace(code)
	if code != "" {
		query.Set("oauth_error_code", code)
	}
	redirectBrowser(c, frontendURL(cfg, "/register?"+query.Encode()))
}

func redirectGoogleRegisterSuccess(c *gin.Context, cfg config.Config, message string) {
	msg := strings.TrimSpace(message)
	if msg == "" {
		msg = "Akun berhasil dibuat."
	}
	query := url.Values{}
	query.Set("status", msg)
	redirectBrowser(c, frontendURL(cfg, "/login?"+query.Encode()))
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func redirectBrowser(c *gin.Context, target string) {
	safeTarget := strings.TrimSpace(target)
	if safeTarget == "" {
		safeTarget = "/"
	}

	escapedHref := template.HTMLEscapeString(safeTarget)
	jsValue, err := json.Marshal(safeTarget)
	if err != nil {
		jsValue = []byte(`"/"`)
	}

	body := "<!doctype html><html><head><meta charset=\"utf-8\">" +
		"<meta http-equiv=\"refresh\" content=\"0;url=" + escapedHref + "\">" +
		"<title>Redirecting...</title></head><body>" +
		"<script>window.location.replace(" + string(jsValue) + ");</script>" +
		"<a href=\"" + escapedHref + "\">Continue</a>" +
		"</body></html>"

	c.Header("Location", safeTarget)
	c.Data(http.StatusFound, "text/html; charset=utf-8", []byte(body))
}
