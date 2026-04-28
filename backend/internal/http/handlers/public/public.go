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

const landingDataCacheTTL = 5 * time.Second
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

	divisionIDs := make([]int64, 0, len(profiles))
	for _, profile := range profiles {
		divisionIDs = append(divisionIDs, profile.ID)
	}
	activeJobsByDivisionID := map[int64][]map[string]any{}
	activeJobs, activeJobsErr := dbrepo.ListActiveDivisionJobsByDivisionIDs(db, divisionIDs)
	if activeJobsErr == nil {
		for _, job := range activeJobs {
			activeJobsByDivisionID[job.DivisionProfileID] = append(activeJobsByDivisionID[job.DivisionProfileID], map[string]any{
				"id":                   job.ID,
				"title":                job.JobTitle,
				"description":          job.JobDescription,
				"requirements":         handlers.DecodeJSONStringArray(job.JobRequirements),
				"eligibility_criteria": handlers.DecodeJSONMap(job.JobEligibility),
				"salary_min":           job.JobSalaryMin,
				"work_mode":            job.JobWorkMode,
				"hiring_opened_at":     handlers.FormatDateISO(job.OpenedAt),
			})
		}
	}

	jobs := make([]map[string]any, 0)
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

		activeDivisionJobs := activeJobsByDivisionID[profile.ID]
		if len(activeDivisionJobs) > 0 {
			for _, activeJob := range activeDivisionJobs {
				jobs = append(jobs, map[string]any{
					"id":                   activeJob["id"],
					"division":             profile.Name,
					"division_description": profile.Description,
					"manager_name":         profile.ManagerName,
					"capacity":             effectiveCapacity,
					"current_staff":        currentStaff,
					"availableSlots":       availableSlots,
					"isHiring":             true,
					"title":                activeJob["title"],
					"description":          activeJob["description"],
					"requirements":         activeJob["requirements"],
					"eligibility_criteria": activeJob["eligibility_criteria"],
					"salary_min":           activeJob["salary_min"],
					"work_mode":            activeJob["work_mode"],
					"hiring_opened_at":     activeJob["hiring_opened_at"],
					"location":             "Divisi " + profile.Name,
					"type":                 "Full-time",
				})
			}
			continue
		}

		if !(profile.IsHiring && profile.JobTitle != nil) {
			continue
		}
		jobs = append(jobs, map[string]any{
			"id":                   profile.ID,
			"division":             profile.Name,
			"division_description": profile.Description,
			"manager_name":         profile.ManagerName,
			"capacity":             effectiveCapacity,
			"current_staff":        currentStaff,
			"availableSlots":       availableSlots,
			"isHiring":             true,
			"title":                profile.JobTitle,
			"description":          profile.JobDescription,
			"requirements":         handlers.DecodeJSONStringArray(profile.JobRequirements),
			"eligibility_criteria": handlers.DecodeJSONMap(profile.JobEligibility),
			"salary_min":           profile.JobSalaryMin,
			"work_mode":            profile.JobWorkMode,
			"hiring_opened_at":     handlers.FormatDateISO(profile.HiringOpenedAt),
			"location":             "Divisi " + profile.Name,
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
