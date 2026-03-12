package public

import (
	"context"
	"encoding/json"
	"hris-backend/internal/http/handlers"
	dbrepo "hris-backend/internal/repository"

	"net/http"
	"strings"
	"sync"
	"time"

	"hris-backend/internal/config"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

const landingDataCacheTTL = 30 * time.Second
const landingDataRedisKey = "public:landing:v1"

var landingDataCache = struct {
	mu        sync.RWMutex
	expiresAt time.Time
	payload   gin.H
}{}

var landingDataRedisClient = struct {
	mu     sync.Mutex
	client *redis.Client
	ready  bool
}{}

func RegisterPublicRoutes(rg *gin.RouterGroup) {
	rg.GET("/public/landing", LandingData)
}

func LandingData(c *gin.Context) {
	cfg := middleware.GetConfig(c)
	if payload, ok := getLandingDataRedis(c.Request.Context(), cfg); ok {
		setLandingDataCache(payload)
		c.JSON(http.StatusOK, payload)
		return
	}

	if payload, ok := getLandingDataCache(); ok {
		c.JSON(http.StatusOK, payload)
		return
	}

	db := middleware.GetDB(c)

	profiles, err := services.EnsureDivisionProfiles(db)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Failed to load divisions")
		return
	}

	divisions := make([]map[string]any, 0, len(profiles))
	for _, profile := range profiles {
		currentStaff, _ := dbrepo.CountActiveDivisionUsers(db, profile.Name)
		effectiveCapacity := profile.Capacity
		if effectiveCapacity < currentStaff {
			effectiveCapacity = currentStaff
		}
		availableSlots := effectiveCapacity - currentStaff
		if availableSlots < 0 {
			availableSlots = 0
		}

		divisions = append(divisions, map[string]any{
			"id":               profile.ID,
			"name":             profile.Name,
			"description":      profile.Description,
			"manager_name":     profile.ManagerName,
			"capacity":         effectiveCapacity,
			"current_staff":    currentStaff,
			"available_slots":  availableSlots,
			"is_hiring":        profile.IsHiring && profile.JobTitle != nil,
			"job_title":        profile.JobTitle,
			"job_description":  profile.JobDescription,
			"job_requirements": handlers.DecodeJSONStringArray(profile.JobRequirements),
			"job_eligibility":  handlers.DecodeJSONMap(profile.JobEligibility),
			"hiring_opened_at": handlers.FormatDateISO(profile.HiringOpenedAt),
		})
	}

	jobs := make([]map[string]any, 0)
	for _, division := range divisions {
		if hiring, ok := division["is_hiring"].(bool); ok && !hiring {
			continue
		}
		jobs = append(jobs, map[string]any{
			"id":                   division["id"],
			"division":             division["name"],
			"division_description": division["description"],
			"manager_name":         division["manager_name"],
			"capacity":             division["capacity"],
			"current_staff":        division["current_staff"],
			"availableSlots":       division["available_slots"],
			"isHiring":             division["is_hiring"],
			"title":                division["job_title"],
			"description":          division["job_description"],
			"requirements":         division["job_requirements"],
			"eligibility_criteria": division["job_eligibility"],
			"hiring_opened_at":     division["hiring_opened_at"],
			"location":             "Divisi " + division["name"].(string),
			"type":                 "Full-time",
		})
	}

	payload := gin.H{
		"canLogin":    true,
		"canRegister": true,
		"jobs":        jobs,
	}
	setLandingDataCache(payload)
	setLandingDataRedis(c.Request.Context(), cfg, payload)
	c.JSON(http.StatusOK, payload)
}

func getLandingDataCache() (gin.H, bool) {
	landingDataCache.mu.RLock()
	defer landingDataCache.mu.RUnlock()
	if landingDataCache.payload == nil {
		return nil, false
	}
	if time.Now().After(landingDataCache.expiresAt) {
		return nil, false
	}
	return landingDataCache.payload, true
}

func setLandingDataCache(payload gin.H) {
	landingDataCache.mu.Lock()
	landingDataCache.payload = payload
	landingDataCache.expiresAt = time.Now().Add(landingDataCacheTTL)
	landingDataCache.mu.Unlock()
}

func getLandingDataRedis(ctx context.Context, cfg config.Config) (gin.H, bool) {
	client := getLandingDataRedisClient(cfg)
	if client == nil {
		return nil, false
	}

	raw, err := client.Get(ctx, landingDataRedisKey).Bytes()
	if err != nil {
		return nil, false
	}

	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, false
	}
	return gin.H(payload), true
}

func setLandingDataRedis(ctx context.Context, cfg config.Config, payload gin.H) {
	client := getLandingDataRedisClient(cfg)
	if client == nil || payload == nil {
		return
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return
	}
	_ = client.Set(ctx, landingDataRedisKey, raw, landingDataCacheTTL).Err()
}

func getLandingDataRedisClient(cfg config.Config) *redis.Client {
	landingDataRedisClient.mu.Lock()
	defer landingDataRedisClient.mu.Unlock()

	if landingDataRedisClient.ready {
		return landingDataRedisClient.client
	}

	var client *redis.Client
	if strings.TrimSpace(cfg.RedisURL) != "" {
		opts, err := redis.ParseURL(cfg.RedisURL)
		if err == nil {
			client = redis.NewClient(opts)
		}
	} else if strings.TrimSpace(cfg.RedisAddr) != "" {
		client = redis.NewClient(&redis.Options{
			Addr:     cfg.RedisAddr,
			Password: cfg.RedisPassword,
			DB:       cfg.RedisDB,
		})
	}

	landingDataRedisClient.client = client
	landingDataRedisClient.ready = true
	return landingDataRedisClient.client
}
