package pelamar

import (
	"encoding/json"
	"hris-backend/internal/http/handlers"
	"hris-backend/internal/models"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func applicantProfilePayload(c *gin.Context, profile *models.ApplicantProfile, completion int) map[string]any {
	return map[string]any{
		"id":                    profile.ID,
		"full_name":             profile.FullName,
		"email":                 profile.Email,
		"phone":                 profile.Phone,
		"date_of_birth":         handlers.FormatDateISO(profile.DateOfBirth),
		"gender":                profile.Gender,
		"religion":              profile.Religion,
		"address":               profile.Address,
		"domicile_address":      profile.DomicileAddress,
		"city":                  profile.City,
		"province":              profile.Province,
		"profile_photo_url":     handlers.AttachmentURL(c, profile.ProfilePhotoPath),
		"educations":            decodeJSONArray(profile.Educations),
		"experiences":           decodeJSONArray(profile.Experiences),
		"certifications":        formatCertifications(c, decodeJSONArray(profile.Certifications)),
		"is_complete":           profile.CompletedAt != nil,
		"completion_percentage": completion,
	}
}

func decodeJSONArray(raw models.JSON) []map[string]any {
	if len(raw) == 0 {
		return []map[string]any{}
	}
	var data []map[string]any
	_ = json.Unmarshal([]byte(raw), &data)
	if data == nil {
		return []map[string]any{}
	}
	return data
}

func decodeJSONMap(raw models.JSON) map[string]any {
	if len(raw) == 0 {
		return nil
	}
	var data map[string]any
	_ = json.Unmarshal([]byte(raw), &data)
	return data
}

func decodeJSONStringArray(raw models.JSON) []string {
	if len(raw) == 0 {
		return []string{}
	}

	var data []string
	if err := json.Unmarshal([]byte(raw), &data); err == nil {
		if data == nil {
			return []string{}
		}
		return data
	}

	var anyData []any
	if err := json.Unmarshal([]byte(raw), &anyData); err != nil {
		return []string{}
	}
	out := make([]string, 0, len(anyData))
	for _, item := range anyData {
		if str, ok := item.(string); ok && strings.TrimSpace(str) != "" {
			out = append(out, str)
		}
	}
	return out
}

func formatCertifications(c *gin.Context, certs []map[string]any) []map[string]any {
	out := make([]map[string]any, 0, len(certs))
	for _, cert := range certs {
		path, _ := cert["file_path"].(string)
		if path != "" {
			if fileURL := handlers.AttachmentURL(c, &path); fileURL != nil {
				cert["file_url"] = *fileURL
			}
			cert["file_name"] = filepathBase(path)
		}
		out = append(out, cert)
	}
	return out
}

func filepathBase(path string) string {
	path = strings.ReplaceAll(path, "\\", "/")
	parts := strings.Split(path, "/")
	return parts[len(parts)-1]
}

func computeProfileCompletion(profile *models.ApplicantProfile) int {
	fullNameFilled := profile.FullName != nil && strings.TrimSpace(*profile.FullName) != ""
	emailFilled := profile.Email != nil && strings.TrimSpace(*profile.Email) != ""
	phoneValid := false
	if profile.Phone != nil {
		phoneValid = isValidPhoneNumber(normalizePhoneNumber(*profile.Phone))
	}

	required := []bool{
		fullNameFilled,
		emailFilled,
		phoneValid,
		profile.DateOfBirth != nil,
		profile.Gender != nil && *profile.Gender != "",
		profile.Religion != nil && *profile.Religion != "",
		profile.Address != nil && *profile.Address != "",
		profile.DomicileAddress != nil && *profile.DomicileAddress != "",
		profile.City != nil && *profile.City != "",
		profile.Province != nil && *profile.Province != "",
	}
	filled := 0
	for _, ok := range required {
		if ok {
			filled++
		}
	}
	return int(float64(filled) / float64(len(required)) * 100)
}

func isProfileComplete(profile *models.ApplicantProfile) bool {
	if profile == nil {
		return false
	}
	if profile.FullName == nil || strings.TrimSpace(*profile.FullName) == "" ||
		profile.Email == nil || strings.TrimSpace(*profile.Email) == "" ||
		profile.Phone == nil || !isValidPhoneNumber(normalizePhoneNumber(*profile.Phone)) ||
		profile.DateOfBirth == nil ||
		profile.Gender == nil || strings.TrimSpace(*profile.Gender) == "" ||
		profile.Religion == nil || strings.TrimSpace(*profile.Religion) == "" ||
		profile.Address == nil || strings.TrimSpace(*profile.Address) == "" ||
		profile.DomicileAddress == nil || strings.TrimSpace(*profile.DomicileAddress) == "" ||
		profile.City == nil || strings.TrimSpace(*profile.City) == "" ||
		profile.Province == nil || strings.TrimSpace(*profile.Province) == "" {
		return false
	}
	return len(profile.Educations) > 0
}

func syncCompletion(profile *models.ApplicantProfile) {
	if isProfileComplete(profile) {
		if profile.CompletedAt == nil {
			now := time.Now()
			profile.CompletedAt = &now
		}
	} else {
		profile.CompletedAt = nil
	}
}

func normalizePhoneNumber(value string) string {
	return handlers.NormalizePhoneNumber(value)
}

func isValidPhoneNumber(value string) bool {
	return handlers.IsValidPhoneNumber(value)
}

func stageDate(app models.Application, stage string) *time.Time {
	switch stage {
	case "Applied":
		return app.SubmittedAt
	case "Screening":
		return app.ScreeningAt
	case "Interview":
		if app.InterviewDate != nil {
			return app.InterviewDate
		}
		return app.InterviewAt
	case "Offering":
		return app.OfferingAt
	case "Rejected":
		return app.RejectedAt
	case "Hired":
		return app.HiredAt
	default:
		return app.SubmittedAt
	}
}
