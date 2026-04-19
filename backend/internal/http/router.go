package http

import (
	_ "embed"
	"net/http"
	"strings"
	"time"

	"hris-backend/internal/config"
	basehandlers "hris-backend/internal/http/handlers"
	adminhandlers "hris-backend/internal/http/handlers/admin"
	authhandlers "hris-backend/internal/http/handlers/auth"
	dashboardhandlers "hris-backend/internal/http/handlers/dashboard"
	pelamarhandlers "hris-backend/internal/http/handlers/pelamar"
	profilehandlers "hris-backend/internal/http/handlers/profile"
	publichandlers "hris-backend/internal/http/handlers/public"
	staffhandlers "hris-backend/internal/http/handlers/staff"
	superadminhandlers "hris-backend/internal/http/handlers/superadmin"
	"hris-backend/internal/http/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

//go:embed docs/openapi.yaml
var openAPISpec []byte

const swaggerUIHTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>HRIS API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({ url: '/openapi.yaml', dom_id: '#swagger-ui' });
    };
  </script>
</body>
</html>`

func NewRouter(cfg config.Config, db *sqlx.DB) *gin.Engine {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	_ = basehandlers.SetDisplayLocation(cfg.AppTimezone)

	r := gin.New()
	r.GET("/healthz", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.Use(gin.Recovery())
	r.Use(middleware.SecurityHeaders(cfg))
	r.Use(middleware.LimitRequestBody(cfg.MaxRequestBodyBytes))
	r.Use(middleware.Gzip())

	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins(cfg),
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With", "X-CSRF-Token", "X-XSRF-TOKEN"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	store := cookie.NewStore([]byte(cfg.SessionSecret))
	store.Options(sessions.Options{
		Path:     "/",
		HttpOnly: true,
		Secure:   cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   60 * 60 * 24 * 7,
	})

	r.Use(sessions.Sessions("hris_session", store))

	r.Use(middleware.AttachDB(db))
	r.Use(middleware.AttachConfig(cfg))
	r.Use(middleware.LoadCurrentUser())
	r.Use(middleware.EnsureCSRFToken())

	r.GET("/openapi.yaml", func(c *gin.Context) { c.Data(http.StatusOK, "application/yaml; charset=utf-8", openAPISpec) })
	r.GET("/docs", func(c *gin.Context) { c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(swaggerUIHTML)) })
	r.GET("/verify-email", authhandlers.VerifyEmail)
	r.GET("/verify-email/:id/:hash", authhandlers.VerifyEmail)

	api := r.Group("/api")
	{
		api.GET("/csrf", authhandlers.GetCSRF)
		authhandlers.RegisterAuthRoutes(api)
		publichandlers.RegisterPublicRoutes(api)

		authGroup := api.Group("")
		authGroup.Use(middleware.RequireAuth())
		{
			authGroup.POST("/password", profilehandlers.UpdatePassword)
			authGroup.PUT("/password", profilehandlers.UpdatePassword)
			profilehandlers.RegisterProfileRoutes(authGroup)
			dashboardhandlers.RegisterDashboardRoutes(authGroup)
			staffhandlers.RegisterStaffRoutes(authGroup)
			pelamarhandlers.RegisterPelamarRoutes(authGroup)
			adminhandlers.RegisterAdminStaffRoutes(authGroup)
			superadminhandlers.RegisterSuperAdminRoutes(authGroup)
		}
	}

	if !cfg.DisableBackgroundWorker {
		superadminhandlers.StartRecruitmentAIScreeningWorker(db, cfg)
	}

	r.GET("/storage/*filepath", basehandlers.ServeStorageFile)

	return r
}

func allowedOrigins(cfg config.Config) []string {
	seen := map[string]struct{}{}
	add := func(origin string) {
		origin = strings.TrimSpace(origin)
		if origin == "" || origin == "*" {
			return
		}
		seen[origin] = struct{}{}
	}

	for _, origin := range strings.Split(cfg.FrontendURL, ",") {
		add(origin)
	}

	if cfg.Env != "production" {
		add("http://localhost:5173")
		add("http://127.0.0.1:5173")
	}

	out := make([]string, 0, len(seen))
	for origin := range seen {
		out = append(out, origin)
	}
	return out
}
