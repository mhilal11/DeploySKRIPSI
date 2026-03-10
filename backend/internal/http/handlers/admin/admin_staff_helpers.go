package admin

import (
	"hris-backend/internal/http/handlers"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"
	"hris-backend/internal/services"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func countPending(letters []models.Surat) int {
	count := 0
	for _, surat := range letters {
		if surat.StatusPersetujuan == "Menunggu HR" || surat.StatusPersetujuan == "Diajukan" || surat.StatusPersetujuan == "Diproses" {
			count++
		}
	}
	return count
}

func recentRecruitments(db *sqlx.DB) []map[string]any {
	apps, _ := dbrepo.ListAppliedOrScreeningApplications(db, 10)
	out := make([]map[string]any, 0, len(apps))
	for _, app := range apps {
		out = append(out, map[string]any{
			"name":      app.FullName,
			"position":  app.Position,
			"date":      handlers.FormatDate(app.SubmittedAt),
			"status":    app.Status,
			"education": app.Education,
		})
	}
	return out
}

func divisionOptions(db *sqlx.DB) []string {
	divisions, err := services.DivisionNames(db)
	if err != nil {
		return []string{}
	}
	return divisions
}

func ensureDepartemen(db *sqlx.DB, division *string) *int64 {
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

func lookupDepartemenName(db *sqlx.DB, departemenID *int64, userID int64) string {
	if departemenID != nil {
		if name, err := dbrepo.GetDepartemenNameByID(db, *departemenID); err == nil && name != "" {
			return name
		}
	}
	division, _ := dbrepo.GetUserDivisionByID(db, userID)
	if division != "" {
		return division
	}
	return "Internal"
}

func lookupUserName(db *sqlx.DB, userID int64) string {
	name, _ := dbrepo.GetUserNameByID(db, userID)
	if name == "" {
		return "HRD"
	}
	return name
}

func transformLetters(c *gin.Context, db *sqlx.DB, letters []models.Surat) []map[string]any {
	result := make([]map[string]any, 0, len(letters))
	for _, surat := range letters {
		replyHistories, _ := dbrepo.ListSuratReplyHistories(db, surat.SuratID)
		historyPayload := make([]map[string]any, 0, len(replyHistories))
		for _, history := range replyHistories {
			authorName := ""
			if history.RepliedBy != nil {
				authorName = lookupUserName(db, *history.RepliedBy)
			}
			historyPayload = append(historyPayload, map[string]any{
				"id":         history.ID,
				"note":       history.Note,
				"author":     authorName,
				"division":   history.FromDivision,
				"toDivision": history.ToDivision,
				"timestamp":  handlers.FormatDateTime(history.RepliedAt),
			})
		}

		disposerName := ""
		if surat.DisposedBy != nil {
			disposerName = lookupUserName(db, *surat.DisposedBy)
		}
		replyAuthorName := ""
		if surat.ReplyBy != nil {
			replyAuthorName = lookupUserName(db, *surat.ReplyBy)
		}
		senderName := lookupUserName(db, surat.UserID)
		senderDivision := lookupDepartemenName(db, surat.DepartemenID, surat.UserID)
		recipientName := handlers.FirstString(surat.TargetDivision, surat.Penerima)
		letterType := strings.TrimSpace(surat.JenisSurat)
		if letterType == "" {
			letterType = "Tidak diketahui"
		}
		attachmentLink := handlers.AttachmentURL(c, surat.LampiranPath)
		var attachmentPayload map[string]any
		if attachmentLink != nil {
			attachmentPayload = map[string]any{
				"name": handlers.FirstString(surat.LampiranNama, "Lampiran"),
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
			"date":           handlers.FormatDate(surat.TanggalSurat),
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
			"replyAt":                 handlers.FormatDateTime(surat.ReplyAt),
			"replyHistory":            historyPayload,
			"canReply":                surat.CurrentRecipient == "division" && surat.StatusPersetujuan != "Diarsipkan" && !surat.IsFinalized,
			"targetDivision":          recipientName,
			"recipient":               surat.Penerima,
			"currentRecipient":        surat.CurrentRecipient,
			"disposedBy":              disposerName,
			"disposedAt":              handlers.FormatDateTime(surat.DisposedAt),
			"approvalDate":            handlers.FormatDateTime(surat.TanggalPersetujuan),
			"createdAt":               handlers.FormatDateTime(surat.CreatedAt),
			"updatedAt":               handlers.FormatDateTime(surat.UpdatedAt),
			"dispositionDocumentUrl":  handlers.AttachmentURL(c, surat.DispositionDocumentPath),
			"dispositionDocumentName": surat.DispositionDocumentName,
		})
	}
	return result
}
