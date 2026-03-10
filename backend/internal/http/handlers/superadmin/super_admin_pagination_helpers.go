package superadmin

import (
	"net/url"
	"strconv"
	"strings"
)

func buildPaginationLinks(basePath string, current int, last int, filters map[string]string) []map[string]any {
	if last < 1 {
		last = 1
	}
	links := []map[string]any{}
	links = append(links, map[string]any{
		"url":    pageURL(basePath, current-1, filters, last),
		"label":  "&laquo; Previous",
		"active": false,
	})

	for i := 1; i <= last; i++ {
		links = append(links, map[string]any{
			"url":    pageURL(basePath, i, filters, last),
			"label":  strconv.Itoa(i),
			"active": i == current,
		})
	}

	links = append(links, map[string]any{
		"url":    pageURL(basePath, current+1, filters, last),
		"label":  "Next &raquo;",
		"active": false,
	})

	return links
}

func pageURL(basePath string, page int, filters map[string]string, last int) any {
	if page < 1 || page > last {
		return nil
	}
	values := url.Values{}
	for key, value := range filters {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" || strings.EqualFold(trimmed, "all") {
			continue
		}
		values.Set(key, trimmed)
	}
	if page > 1 {
		values.Set("page", strconv.Itoa(page))
	}
	if len(values) == 0 {
		return basePath
	}
	return basePath + "?" + values.Encode()
}

func parsePositiveInt64(raw string) (int64, bool) {
	parsed, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	if err != nil || parsed <= 0 {
		return 0, false
	}
	return parsed, true
}

func stringPtrOrNil(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func ptrToString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
