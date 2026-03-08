package http

import (
	"net/http"
	"strings"
	"time"

	"hris-backend/internal/config"
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

func NewRouter(cfg config.Config, db *sqlx.DB) *gin.Engine {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
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

	r.GET("/healthz", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })
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

	r.Static("/storage", cfg.StoragePath)

	return r
}

func allowedOrigins(cfg config.Config) []string {
	seen := map[string]struct{}{}
	add := func(origin string) {
		origin = strings.TrimSpace(origin)
		if origin == "" {
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
