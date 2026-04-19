package middleware

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

const (
	authDebugCSRFGeneratedKey = "auth_debug_csrf_generated"
	authDebugCSRFCookieSetKey = "auth_debug_csrf_cookie_set"
	authDebugCSRFValidKey     = "auth_debug_csrf_valid"
)

func AuthDebugSetCSRFGenerated(c *gin.Context, generated bool) {
	c.Set(authDebugCSRFGeneratedKey, generated)
}

func AuthDebugSetCSRFCookieSet(c *gin.Context, cookieSet bool) {
	c.Set(authDebugCSRFCookieSetKey, cookieSet)
}

func AuthDebugSetCSRFValid(c *gin.Context, valid bool) {
	c.Set(authDebugCSRFValidKey, valid)
}

func AuthDebugCSRFGenerated(c *gin.Context) bool {
	return authDebugBool(c, authDebugCSRFGeneratedKey)
}

func AuthDebugCSRFCookieSet(c *gin.Context) bool {
	return authDebugBool(c, authDebugCSRFCookieSetKey)
}

func AuthDebugCSRFValid(c *gin.Context) bool {
	return authDebugBool(c, authDebugCSRFValidKey)
}

func AuthDebugSessionLookupOK(c *gin.Context) bool {
	session := sessions.Default(c)
	_, ok := parseSessionUserID(session.Get("user_id"))
	return ok
}

func AuthDebugHasRequestCookie(c *gin.Context, name string) bool {
	if c == nil || c.Request == nil {
		return false
	}
	_, err := c.Request.Cookie(name)
	return err == nil
}

func AuthDebugHasCookieHeader(c *gin.Context) bool {
	return strings.TrimSpace(c.GetHeader("Cookie")) != ""
}

func AuthDebugHasHeader(c *gin.Context, name string) bool {
	return strings.TrimSpace(c.GetHeader(name)) != ""
}

func AuthDebugHasSetCookie(c *gin.Context, name string) bool {
	if c == nil {
		return false
	}
	for _, value := range c.Writer.Header().Values("Set-Cookie") {
		if strings.HasPrefix(value, name+"=") {
			return true
		}
	}
	return false
}

func AuthDebugTokenLen(token string) int {
	return len(strings.TrimSpace(token))
}

func AuthDebugLog(c *gin.Context, route string, fields ...string) {
	parts := []string{
		"[auth-debug]",
		"route=" + strconv.Quote(route),
		"method=" + strconv.Quote(requestMethod(c)),
		"origin=" + strconv.Quote(strings.TrimSpace(c.GetHeader("Origin"))),
		"ua=" + strconv.Quote(compactUserAgent(c.GetHeader("User-Agent"))),
		"cookie_header=" + strconv.FormatBool(AuthDebugHasCookieHeader(c)),
		"session_cookie=" + strconv.FormatBool(AuthDebugHasRequestCookie(c, "hris_session")),
		"xsrf_cookie=" + strconv.FormatBool(AuthDebugHasRequestCookie(c, "XSRF-TOKEN")),
		"csrf_header=" + strconv.FormatBool(AuthDebugHasHeader(c, "X-CSRF-Token")),
	}
	for _, field := range fields {
		if strings.TrimSpace(field) != "" {
			parts = append(parts, field)
		}
	}
	log.Println(strings.Join(parts, " "))
}

func AuthDebugStatusField(c *gin.Context) string {
	return "status=" + strconv.Itoa(c.Writer.Status())
}

func AuthDebugBoolField(key string, value bool) string {
	return key + "=" + strconv.FormatBool(value)
}

func AuthDebugIntField(key string, value int) string {
	return key + "=" + strconv.Itoa(value)
}

func requestMethod(c *gin.Context) string {
	if c == nil || c.Request == nil {
		return http.MethodGet
	}
	return c.Request.Method
}

func compactUserAgent(ua string) string {
	ua = strings.TrimSpace(ua)
	if len(ua) <= 160 {
		return ua
	}
	return ua[:157] + "..."
}

func authDebugBool(c *gin.Context, key string) bool {
	if c == nil {
		return false
	}
	value, ok := c.Get(key)
	if !ok {
		return false
	}
	boolValue, ok := value.(bool)
	return ok && boolValue
}
