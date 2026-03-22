package handlers

import (
	"encoding/json"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func AttachmentURL(c *gin.Context, path *string) *string {
	if path == nil || *path == "" {
		return nil
	}
	normalized := NormalizeAttachmentPath(*path)
	if normalized == "" {
		return nil
	}
	if strings.HasPrefix(normalized, "http://") || strings.HasPrefix(normalized, "https://") {
		return &normalized
	}
	cfg := middleware.GetConfig(c)
	base := strings.TrimRight(cfg.BaseURL, "/")
	url := base + "/storage/" + normalized
	return &url
}

func FirstString(ptr *string, fallback string) string {
	if ptr == nil || *ptr == "" {
		return fallback
	}
	return *ptr
}

func LookupUserName(db *sqlx.DB, userID int64) string {
	name, _ := dbrepo.GetUserNameByID(db, userID)
	if name == "" {
		return "HRD"
	}
	return name
}

func DecodeJSONArray(raw models.JSON) []map[string]any {
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

func DecodeJSONMap(raw models.JSON) map[string]any {
	if len(raw) == 0 {
		return nil
	}
	var data map[string]any
	_ = json.Unmarshal([]byte(raw), &data)
	return data
}

func DecodeJSONStringArray(raw models.JSON) []string {
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

func FormatCertifications(c *gin.Context, certs []map[string]any) []map[string]any {
	out := make([]map[string]any, 0, len(certs))
	for _, cert := range certs {
		path, _ := cert["file_path"].(string)
		if path != "" {
			if fileURL := AttachmentURL(c, &path); fileURL != nil {
				cert["file_url"] = *fileURL
			}
			cert["file_name"] = filepath.Base(strings.ReplaceAll(path, "\\", "/"))
		}
		out = append(out, cert)
	}
	return out
}

func CalculateAge(dob *time.Time) *int {
	if dob == nil || dob.IsZero() {
		return nil
	}
	now := time.Now()
	years := now.Year() - dob.Year()
	birthdayThisYear := time.Date(now.Year(), dob.Month(), dob.Day(), 0, 0, 0, 0, now.Location())
	if now.Before(birthdayThisYear) {
		years--
	}
	if years < 0 {
		years = 0
	}
	return &years
}

func EducationRank(level string) int {
	switch strings.TrimSpace(strings.ToLower(level)) {
	case "s3", "doktor", "doctor", "doctoral":
		return 6
	case "s2", "magister", "master":
		return 5
	case "s1", "sarjana", "bachelor":
		return 4
	case "d4":
		return 3
	case "d3":
		return 2
	case "d2", "d1":
		return 1
	default:
		return 0
	}
}

func AnyToString(value any) string {
	switch v := value.(type) {
	case string:
		return v
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case float32:
		return strconv.FormatFloat(float64(v), 'f', -1, 64)
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	default:
		return ""
	}
}

func NormalizeAttachmentPath(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	trimmed = strings.ReplaceAll(trimmed, "\\", "/")
	trimmed = strings.TrimPrefix(trimmed, "./")
	trimmed = strings.TrimPrefix(trimmed, "/")
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return trimmed
	}
	trimmed = strings.TrimPrefix(trimmed, "storage/")
	return strings.TrimPrefix(trimmed, "/")
}

func EnsureDepartemen(db *sqlx.DB, division *string) *int64 {
	if division == nil || *division == "" {
		return nil
	}
	departemen, err := dbrepo.GetDepartemenByName(db, *division)
	if err == nil && departemen != nil {
		return &departemen.ID
	}
	code := services.DivisionCodeFromName(*division)
	id, err := dbrepo.CreateDepartemenAndReturnID(db, *division, code)
	if err != nil {
		return nil
	}
	return id
}

func LookupDepartemenName(db *sqlx.DB, departemenID *int64, userID int64) string {
	if departemenID != nil {
		name, err := dbrepo.GetDepartemenNameByID(db, *departemenID)
		if err == nil && name != "" {
			return name
		}
	}
	division, _ := dbrepo.GetUserDivisionByID(db, userID)
	if division != "" {
		return division
	}
	return "Internal"
}

func TransformLetters(c *gin.Context, db *sqlx.DB, letters []models.Surat) []map[string]any {
	result := make([]map[string]any, 0, len(letters))
	for _, surat := range letters {
		replyHistories, _ := dbrepo.ListSuratReplyHistories(db, surat.SuratID)
		historyPayload := make([]map[string]any, 0, len(replyHistories))
		for _, history := range replyHistories {
			authorName := ""
			if history.RepliedBy != nil {
				authorName = LookupUserName(db, *history.RepliedBy)
			}
			replyAttachmentURL := AttachmentURL(c, history.LampiranPath)
			var replyAttachment map[string]any
			if replyAttachmentURL != nil {
				replyAttachment = map[string]any{
					"name": FirstString(history.LampiranNama, "Lampiran Balasan"),
					"size": history.LampiranSize,
					"url":  replyAttachmentURL,
				}
			}
			historyPayload = append(historyPayload, map[string]any{
				"id":         history.ID,
				"note":       history.Note,
				"author":     authorName,
				"division":   history.FromDivision,
				"toDivision": history.ToDivision,
				"timestamp":  FormatDateTime(history.RepliedAt),
				"attachment": replyAttachment,
			})
		}

		disposerName := ""
		if surat.DisposedBy != nil {
			disposerName = LookupUserName(db, *surat.DisposedBy)
		}
		replyAuthorName := ""
		if surat.ReplyBy != nil {
			replyAuthorName = LookupUserName(db, *surat.ReplyBy)
		}
		senderName := LookupUserName(db, surat.UserID)
		senderDivision := LookupDepartemenName(db, surat.DepartemenID, surat.UserID)
		recipientName := FirstString(surat.TargetDivision, surat.Penerima)
		letterType := strings.TrimSpace(surat.JenisSurat)
		if letterType == "" {
			letterType = "Tidak diketahui"
		}
		attachmentLink := AttachmentURL(c, surat.LampiranPath)
		var attachmentPayload map[string]any
		if attachmentLink != nil {
			attachmentPayload = map[string]any{
				"name": FirstString(surat.LampiranNama, "Lampiran"),
				"size": nil,
				"url":  attachmentLink,
			}
		}

		result = append(result, map[string]any{
			"id":             surat.SuratID,
			"letterNumber":   surat.NomorSurat,
			"from":           senderDivision,
			"sender":         senderName,
			"senderName":     senderName,
			"senderDivision": senderDivision,
			"recipientName":  recipientName,
			"letterType":     letterType,
			"subject":        surat.Perihal,
			"category":       surat.Kategori,
			"date":           FormatDate(surat.TanggalSurat),
			"status": func() string {
				if surat.IsFinalized {
					return "Disposisi Final"
				}
				return surat.StatusPersetujuan
			}(),
			"isFinalized":             surat.IsFinalized,
			"priority":                surat.Prioritas,
			"hasAttachment":           surat.LampiranPath != nil,
			"attachmentUrl":           attachmentLink,
			"attachment":              attachmentPayload,
			"content":                 surat.IsiSurat,
			"dispositionNote":         surat.DispositionNote,
			"replyNote":               surat.ReplyNote,
			"replyBy":                 replyAuthorName,
			"replyAt":                 FormatDateTime(surat.ReplyAt),
			"replyHistory":            historyPayload,
			"canReply":                surat.CurrentRecipient == "division" && surat.StatusPersetujuan != "Diarsipkan" && !surat.IsFinalized,
			"targetDivision":          recipientName,
			"recipient":               surat.Penerima,
			"currentRecipient":        surat.CurrentRecipient,
			"disposedBy":              disposerName,
			"disposedAt":              FormatDateTime(surat.DisposedAt),
			"approvalDate":            FormatDateTime(surat.TanggalPersetujuan),
			"createdAt":               FormatDateTime(surat.CreatedAt),
			"updatedAt":               FormatDateTime(surat.UpdatedAt),
			"dispositionDocumentUrl":  AttachmentURL(c, surat.DispositionDocumentPath),
			"dispositionDocumentName": surat.DispositionDocumentName,
		})
	}
	return result
}

func GetApplicantProfile(db *sqlx.DB, userID int64) *models.ApplicantProfile {
	profile, err := dbrepo.GetApplicantProfileByUserID(db, userID)
	if err != nil || profile == nil {
		return nil
	}
	return profile
}

func ToInt(value any) (int, bool) {
	switch v := value.(type) {
	case float64:
		return int(v), true
	case int:
		return v, true
	case string:
		if v == "" {
			return 0, false
		}
		i, err := strconv.Atoi(v)
		return i, err == nil
	default:
		return 0, false
	}
}
