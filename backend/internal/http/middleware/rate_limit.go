package middleware

import (
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type fixedWindowCounter struct {
	WindowStart time.Time
	Count       int
}

func RateLimit(limit int, window time.Duration) gin.HandlerFunc {
	if limit <= 0 || window <= 0 {
		return func(c *gin.Context) { c.Next() }
	}

	var (
		mu          sync.Mutex
		counters    = make(map[string]fixedWindowCounter)
		lastCleanup = time.Now()
	)

	cleanup := func(now time.Time) {
		if now.Sub(lastCleanup) < window {
			return
		}
		lastCleanup = now
		for key, counter := range counters {
			if now.Sub(counter.WindowStart) > 2*window {
				delete(counters, key)
			}
		}
	}

	return func(c *gin.Context) {
		now := time.Now()
		key := c.ClientIP() + "|" + c.FullPath()

		mu.Lock()
		cleanup(now)
		counter := counters[key]
		if counter.WindowStart.IsZero() || now.Sub(counter.WindowStart) >= window {
			counter.WindowStart = now
			counter.Count = 0
		}
		counter.Count++
		counters[key] = counter
		count := counter.Count
		resetIn := window - now.Sub(counter.WindowStart)
		mu.Unlock()

		if resetIn < 0 {
			resetIn = 0
		}

		remaining := limit - count
		if remaining < 0 {
			remaining = 0
		}
		c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(now.Add(resetIn).Unix(), 10))

		if count > limit {
			retryAfter := int(math.Ceil(resetIn.Seconds()))
			if retryAfter < 1 {
				retryAfter = 1
			}
			c.Header("Retry-After", strconv.Itoa(retryAfter))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"message": "Terlalu banyak permintaan. Coba lagi sebentar.",
			})
			return
		}

		c.Next()
	}
}
