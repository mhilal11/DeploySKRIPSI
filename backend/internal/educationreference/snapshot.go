package educationreference

import (
	"html"
	"regexp"
	"sort"
	"strings"
	"time"
)

const (
	BANPTSourceName = "BAN-PT Direktori Prodi (sumber resmi)"
	BANPTProdiURL   = "https://www.banpt.or.id/direktori/model/dir_prodi/get_hasil_pencariannew.php"
)

var leadingInstitutionCodePattern = regexp.MustCompile(`^(?:\d{6}\s*-\s*)+`)
var trailingParentheticalPattern = regexp.MustCompile(`\s*\([^)]*\)\s*$`)
var campusParentheticalPattern = regexp.MustCompile(`(?i)\s*\(([^)]*kampus[^)]*)\)`)
var anyParentheticalPattern = regexp.MustCompile(`\s*\([^)]*\)`)
var campusSuffixPattern = regexp.MustCompile(`(?i)\s*-?\s*kampus\s+.*$`)
var regionCampusSuffixPattern = regexp.MustCompile(`(?i)\s+k[\.,]?\s*(kab\.?|kabupaten|kota|prov\.?|provinsi)\s+.*$`)
var institutionMentionPattern = regexp.MustCompile(`(?i)\b(universitas|institut|politeknik|akademi|sekolah tinggi|stie|stikes|stmik|uin|iain|iahn)\b.*$`)
var regionOnlyProgramPattern = regexp.MustCompile(`(?i)^(kota|kab\.?|kabupaten|prov\.?|provinsi)\s+.+$`)
var multiSpacePattern = regexp.MustCompile(`\s+`)
var nonAlphaNumericSpacePattern = regexp.MustCompile(`[^a-z0-9 ]+`)

type SnapshotEntry struct {
	Institution string   `json:"institution"`
	Programs    []string `json:"programs"`
}

type SnapshotFile struct {
	Source       string          `json:"source"`
	SourceURL    string          `json:"source_url"`
	LastUpdated  string          `json:"last_updated"`
	Institutions []SnapshotEntry `json:"institutions"`
}

// BuildFromBANPTRows builds snapshot from BAN-PT rows with expected columns:
// [institution, program, strata, ...]
func BuildFromBANPTRows(rows [][]string, updatedAt time.Time) SnapshotFile {
	type normalizedRow struct {
		institution string
		program     string
	}

	type institutionPrograms struct {
		name     string
		programs map[string]string
	}

	normalizedRows := make([]normalizedRow, 0, len(rows))
	institutionCandidates := map[string]struct{}{}

	for _, row := range rows {
		if len(row) < 2 {
			continue
		}

		institutionCandidate := normalizeInstitutionCandidate(row[0])
		if institutionCandidate == "" {
			continue
		}

		program := normalizeProgramName(row[1], institutionCandidate)
		if program == "" {
			continue
		}

		normalizedRows = append(normalizedRows, normalizedRow{
			institution: institutionCandidate,
			program:     program,
		})
		institutionCandidates[strings.ToLower(institutionCandidate)] = struct{}{}
	}

	grouped := make(map[string]*institutionPrograms)

	for _, row := range normalizedRows {
		institution := canonicalInstitutionName(row.institution, institutionCandidates)
		program := row.program
		if institution == "" || program == "" {
			continue
		}

		key := normalizeLookupKey(institution)
		bucket, exists := grouped[key]
		if !exists {
			bucket = &institutionPrograms{
				name:     institution,
				programs: make(map[string]string),
			}
			grouped[key] = bucket
		} else {
			bucket.name = preferredDisplayName(bucket.name, institution)
		}

		programKey := normalizeLookupKey(program)
		if existing, ok := bucket.programs[programKey]; ok {
			bucket.programs[programKey] = preferredDisplayName(existing, program)
			continue
		}
		bucket.programs[programKey] = program
	}

	globalPrograms := make(map[string]string)
	for _, bucket := range grouped {
		for key, label := range bucket.programs {
			if existing, ok := globalPrograms[key]; ok {
				globalPrograms[key] = preferredDisplayName(existing, label)
				continue
			}
			globalPrograms[key] = label
		}
	}

	for _, bucket := range grouped {
		for key := range bucket.programs {
			bucket.programs[key] = globalPrograms[key]
		}
	}

	institutions := make([]SnapshotEntry, 0, len(grouped))
	for _, bucket := range grouped {
		programs := mapValues(bucket.programs)
		sort.Slice(programs, func(i, j int) bool {
			return strings.ToLower(programs[i]) < strings.ToLower(programs[j])
		})

		institutions = append(institutions, SnapshotEntry{
			Institution: bucket.name,
			Programs:    programs,
		})
	}

	sort.Slice(institutions, func(i, j int) bool {
		return institutions[i].Institution < institutions[j].Institution
	})

	return SnapshotFile{
		Source:       BANPTSourceName,
		SourceURL:    BANPTProdiURL,
		LastUpdated:  updatedAt.Format("2006-01-02"),
		Institutions: institutions,
	}
}

func normalizeInstitutionCandidate(value string) string {
	out := normalizeText(value)
	if out == "" {
		return ""
	}
	out = trailingParentheticalPattern.ReplaceAllString(out, "")
	if idx := strings.Index(out, ","); idx >= 0 {
		out = strings.TrimSpace(out[:idx])
	}
	return strings.TrimSpace(out)
}

func canonicalInstitutionName(candidate string, known map[string]struct{}) string {
	candidate = strings.TrimSpace(candidate)
	if candidate == "" {
		return ""
	}

	words := strings.Fields(candidate)
	if len(words) >= 3 {
		withoutLast := strings.Join(words[:len(words)-1], " ")
		if _, ok := known[strings.ToLower(withoutLast)]; ok {
			return withoutLast
		}
	}

	if len(words) >= 4 {
		lastTwoHead := strings.ToLower(words[len(words)-2])
		if lastTwoHead == "kota" || lastTwoHead == "kab" || lastTwoHead == "kabupaten" {
			withoutLocation := strings.Join(words[:len(words)-2], " ")
			if _, ok := known[strings.ToLower(withoutLocation)]; ok {
				return withoutLocation
			}
		}
	}

	return candidate
}

func normalizeProgramName(value string, institution string) string {
	out := normalizeText(value)
	if out == "" {
		return ""
	}

	out = campusParentheticalPattern.ReplaceAllString(out, "")
	out = anyParentheticalPattern.ReplaceAllString(out, "")
	out = campusSuffixPattern.ReplaceAllString(out, "")
	out = regionCampusSuffixPattern.ReplaceAllString(out, "")
	out = institutionMentionPattern.ReplaceAllString(out, "")
	out = removeCaseInsensitive(out, institution)
	out = strings.Trim(out, " -,:;/")
	out = strings.TrimSpace(out)
	if regionOnlyProgramPattern.MatchString(out) {
		return ""
	}

	parts := strings.Fields(out)
	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, " ")
}

func removeCaseInsensitive(source string, toRemove string) string {
	source = strings.TrimSpace(source)
	toRemove = strings.TrimSpace(toRemove)
	if source == "" || toRemove == "" {
		return source
	}

	lowerSource := strings.ToLower(source)
	lowerNeedle := strings.ToLower(toRemove)
	for {
		idx := strings.Index(lowerSource, lowerNeedle)
		if idx < 0 {
			break
		}
		source = strings.TrimSpace(source[:idx] + " " + source[idx+len(toRemove):])
		lowerSource = strings.ToLower(source)
	}

	source = strings.Trim(source, " -,:;/")
	source = strings.TrimSpace(source)
	return source
}

func normalizeLookupKey(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = nonAlphaNumericSpacePattern.ReplaceAllString(value, " ")
	value = multiSpacePattern.ReplaceAllString(value, " ")
	return strings.TrimSpace(value)
}

func preferredDisplayName(current string, candidate string) string {
	current = strings.TrimSpace(current)
	candidate = strings.TrimSpace(candidate)
	if current == "" {
		return candidate
	}
	if candidate == "" {
		return current
	}

	if strings.EqualFold(current, candidate) {
		if isUpperCaseWord(current) && !isUpperCaseWord(candidate) {
			return candidate
		}
		if isUpperCaseWord(candidate) && !isUpperCaseWord(current) {
			return current
		}
		if len(candidate) < len(current) {
			return candidate
		}
		return current
	}

	if len(candidate) < len(current) {
		return candidate
	}
	return current
}

func isUpperCaseWord(value string) bool {
	if value == "" {
		return false
	}
	hasLetter := false
	for _, ch := range value {
		if ch >= 'a' && ch <= 'z' {
			return false
		}
		if (ch >= 'A' && ch <= 'Z') || ch > 127 {
			hasLetter = true
		}
	}
	return hasLetter
}

func mapValues(values map[string]string) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		out = append(out, value)
	}
	return out
}

func normalizeText(value string) string {
	unescaped := html.UnescapeString(strings.TrimSpace(value))
	unescaped = leadingInstitutionCodePattern.ReplaceAllString(unescaped, "")
	parts := strings.Fields(unescaped)
	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, " ")
}
