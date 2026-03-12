package admin

import (
	"hris-backend/internal/dto"
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

func recentRecruitments(db *sqlx.DB) []dto.RecruitmentSummary {
	apps, _ := dbrepo.ListAppliedOrScreeningApplications(db, 10)
	out := make([]dto.RecruitmentSummary, 0, len(apps))
	for _, app := range apps {
		out = append(out, dto.RecruitmentSummary{
			Name:      app.FullName,
			Position:  app.Position,
			Date:      handlers.FormatDate(app.SubmittedAt),
			Status:    app.Status,
			Education: app.Education,
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

func transformLetters(c *gin.Context, db *sqlx.DB, letters []models.Surat) []dto.AdminLetter {
	result := make([]dto.AdminLetter, 0, len(letters))
	for _, surat := range letters {
		replyHistories, _ := dbrepo.ListSuratReplyHistories(db, surat.SuratID)
		historyPayload := make([]dto.LetterReplyHistory, 0, len(replyHistories))
		for _, history := range replyHistories {
			authorName := ""
			if history.RepliedBy != nil {
				authorName = lookupUserName(db, *history.RepliedBy)
			}
			historyPayload = append(historyPayload, dto.LetterReplyHistory{
				ID:         history.ID,
				Note:       history.Note,
				Author:     authorName,
				Division:   history.FromDivision,
				ToDivision: history.ToDivision,
				Timestamp:  handlers.FormatDateTime(history.RepliedAt),
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
		var attachmentPayload *dto.LetterAttachment
		if attachmentLink != nil {
			attachmentPayload = &dto.LetterAttachment{
				Name: handlers.FirstString(surat.LampiranNama, "Lampiran"),
				Size: nil,
				URL:  attachmentLink,
			}
		}

		result = append(result, dto.AdminLetter{
			ID:             surat.SuratID,
			LetterNumber:   surat.NomorSurat,
			From:           senderDivision,
			Sender:         senderName,
			SenderName:     senderName,
			SenderDivision: senderDivision,
			RecipientName:  recipientName,
			LetterType:     letterType,
			Subject:        surat.Perihal,
			Category:       surat.Kategori,
			Date:           handlers.FormatDate(surat.TanggalSurat),
			Status: func() string {
				if surat.IsFinalized {
					return "Disposisi Final"
				}
				return surat.StatusPersetujuan
			}(),
			IsFinalized:             surat.IsFinalized,
			Priority:                surat.Prioritas,
			HasAttachment:           surat.LampiranPath != nil,
			AttachmentURL:           attachmentLink,
			Attachment:              attachmentPayload,
			Content:                 surat.IsiSurat,
			DispositionNote:         surat.DispositionNote,
			ReplyNote:               surat.ReplyNote,
			ReplyBy:                 replyAuthorName,
			ReplyAt:                 handlers.FormatDateTime(surat.ReplyAt),
			ReplyHistory:            historyPayload,
			CanReply:                surat.CurrentRecipient == "division" && surat.StatusPersetujuan != "Diarsipkan" && !surat.IsFinalized,
			TargetDivision:          recipientName,
			Recipient:               surat.Penerima,
			CurrentRecipient:        surat.CurrentRecipient,
			DisposedBy:              disposerName,
			DisposedAt:              handlers.FormatDateTime(surat.DisposedAt),
			ApprovalDate:            handlers.FormatDateTime(surat.TanggalPersetujuan),
			CreatedAt:               handlers.FormatDateTime(surat.CreatedAt),
			UpdatedAt:               handlers.FormatDateTime(surat.UpdatedAt),
			DispositionDocumentURL:  handlers.AttachmentURL(c, surat.DispositionDocumentPath),
			DispositionDocumentName: surat.DispositionDocumentName,
		})
	}
	return result
}
