package handlers

import (
	"net/http"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func RegisterAdminStaffRoutes(rg *gin.RouterGroup) {
	rg.GET("/admin-staff/dashboard", AdminStaffDashboard)
	rg.GET("/admin-staff/kelola-surat", AdminStaffLettersIndex)
	rg.POST("/admin-staff/kelola-surat", AdminStaffLettersStore)
	rg.POST("/admin-staff/kelola-surat/:id/reply", AdminStaffLettersReply)
	rg.POST("/admin-staff/kelola-surat/:id/archive", AdminStaffLettersArchive)
	rg.POST("/admin-staff/kelola-surat/:id/unarchive", AdminStaffLettersUnarchive)
	rg.GET("/admin-staff/recruitment", AdminStaffRecruitment)
}

func AdminStaffDashboard(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleAdmin {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	if user.IsHumanCapitalAdmin() {
		SuperAdminAdminHrDashboard(c)
		return
	}

	db := middleware.GetDB(c)

	var inboxCount int
	_ = db.Get(&inboxCount, "SELECT COUNT(*) FROM surat WHERE current_recipient = 'division' AND (target_division = ? OR penerima = ?)", user.Division, user.Division)
	var outboxCount int
	_ = db.Get(&outboxCount, "SELECT COUNT(*) FROM surat WHERE user_id = ?", user.ID)
	var pendingCount int
	_ = db.Get(&pendingCount, "SELECT COUNT(*) FROM surat WHERE current_recipient = 'division' AND (target_division = ? OR penerima = ?) AND status_persetujuan IN ('Menunggu HR','Diajukan','Diproses')", user.Division, user.Division)

	stats := map[string]int{
		"inbox":   inboxCount,
		"outbox":  outboxCount,
		"pending": pendingCount,
	}

	incoming := []models.Surat{}
	_ = db.Select(&incoming, "SELECT * FROM surat WHERE current_recipient = 'division' AND (target_division = ? OR penerima = ?) ORDER BY tanggal_surat DESC, surat_id DESC LIMIT 5", user.Division, user.Division)

	outgoing := []models.Surat{}
	_ = db.Select(&outgoing, "SELECT * FROM surat WHERE user_id = ? ORDER BY tanggal_surat DESC, surat_id DESC LIMIT 5", user.ID)

	incomingPayload := make([]map[string]any, 0, len(incoming))
	for _, surat := range incoming {
		sender := lookupUserName(db, surat.UserID)
		incomingPayload = append(incomingPayload, map[string]any{
			"id":            surat.SuratID,
			"from":          lookupDepartemenName(db, surat.DepartemenID, surat.UserID),
			"sender":        sender,
			"subject":       surat.Perihal,
			"date":          formatDate(surat.TanggalSurat),
			"status":        surat.StatusPersetujuan,
			"hasAttachment": surat.LampiranPath != nil,
		})
	}

	outgoingPayload := make([]map[string]any, 0, len(outgoing))
	for _, surat := range outgoing {
		outgoingPayload = append(outgoingPayload, map[string]any{
			"id":            surat.SuratID,
			"to":            firstString(surat.TargetDivision, surat.Penerima),
			"subject":       surat.Perihal,
			"date":          formatDate(surat.TanggalSurat),
			"status":        surat.StatusPersetujuan,
			"hasAttachment": surat.LampiranPath != nil,
		})
	}

	announcements := []models.Surat{}
	_ = db.Select(&announcements, "SELECT * FROM surat WHERE kategori = 'Internal' ORDER BY tanggal_surat DESC LIMIT 3")

	announcementsPayload := make([]map[string]any, 0, len(announcements))
	for _, surat := range announcements {
		announcementsPayload = append(announcementsPayload, map[string]any{
			"title": surat.Perihal,
			"date":  formatDate(surat.TanggalSurat),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"stats":         stats,
		"incomingMails": incomingPayload,
		"outgoingMails": outgoingPayload,
		"announcements": announcementsPayload,
	})
}

func AdminStaffRecruitment(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleAdmin {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	if user.IsHumanCapitalAdmin() {
		SuperAdminRecruitmentIndex(c)
		return
	}

	db := middleware.GetDB(c)

	apps := []models.Application{}
	_ = db.Select(&apps, "SELECT * FROM applications ORDER BY submitted_at DESC LIMIT 20")

	applications := make([]map[string]any, 0, len(apps))
	for _, app := range apps {
		applications = append(applications, map[string]any{
			"id":          app.ID,
			"name":        app.FullName,
			"position":    app.Position,
			"status":      app.Status,
			"submittedAt": formatDate(app.SubmittedAt),
			"email":       app.Email,
			"phone":       app.Phone,
		})
	}

	statusBreakdown := make([]map[string]any, 0)
	for _, status := range models.ApplicationStatuses {
		var count int
		_ = db.Get(&count, "SELECT COUNT(*) FROM applications WHERE status = ?", status)
		statusBreakdown = append(statusBreakdown, map[string]any{
			"status": status,
			"count":  count,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"applications":    applications,
		"statusBreakdown": statusBreakdown,
	})
}

func AdminStaffLettersIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleAdmin {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	if user.IsHumanCapitalAdmin() {
		SuperAdminLettersIndex(c)
		return
	}

	db := middleware.GetDB(c)

	inbox := []models.Surat{}
	_ = db.Select(&inbox, "SELECT * FROM surat WHERE current_recipient = 'division' AND (target_division = ? OR penerima = ?) ORDER BY tanggal_surat DESC, surat_id DESC", user.Division, user.Division)
	outbox := []models.Surat{}
	_ = db.Select(&outbox, "SELECT * FROM surat WHERE user_id = ? ORDER BY tanggal_surat DESC, surat_id DESC", user.ID)
	archive := []models.Surat{}
	_ = db.Select(&archive, "SELECT * FROM surat WHERE status_persetujuan = 'Diarsipkan' AND (target_division = ? OR penerima = ? OR user_id = ?) ORDER BY tanggal_surat DESC, surat_id DESC", user.Division, user.Division, user.ID)

	stats := map[string]int{
		"inbox":    len(inbox),
		"outbox":   len(outbox),
		"pending":  countPending(inbox),
		"archived": len(archive),
	}

	letterOptions := map[string]any{
		"letterTypes": []string{"Permohonan", "Undangan", "Laporan", "Pemberitahuan", "Surat Tugas", "Surat Cuti", "Surat Peringatan", "Surat Kerjasama"},
		"categories":  []string{"Internal", "Eksternal", "Keuangan", "Operasional"},
		"priorities":  map[string]string{"high": "Tinggi", "medium": "Sedang", "low": "Rendah"},
		"divisions":   divisionOptions(db),
	}

	divisionCode := services.DivisionCodeFromName(firstString(user.Division, ""))
	nextNumber, _ := services.GenerateNomorSurat(db, divisionCode, time.Now())

	c.JSON(http.StatusOK, gin.H{
		"letters": gin.H{
			"inbox":   transformLetters(c, db, inbox),
			"outbox":  transformLetters(c, db, outbox),
			"archive": transformLetters(c, db, archive),
		},
		"recruitments":     recentRecruitments(db),
		"stats":            stats,
		"options":          letterOptions,
		"nextLetterNumber": nextNumber,
	})
}

func AdminStaffLettersStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleAdmin || user.IsHumanCapitalAdmin() {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	jenisSurat := c.PostForm("jenis_surat")
	perihal := c.PostForm("perihal")
	isiSurat := c.PostForm("isi_surat")
	kategori := c.PostForm("kategori")
	prioritas := c.PostForm("prioritas")
	penerima := c.PostForm("penerima")

	targetDivisions := c.PostFormArray("target_divisions[]")
	if len(targetDivisions) == 0 {
		targetDivisions = c.PostFormArray("target_divisions")
	}

	if len(targetDivisions) == 0 {
		ValidationErrors(c, FieldErrors{"target_divisions": "Divisi tujuan tidak tersedia."})
		return
	}

	departemenID := ensureDepartemen(db, user.Division)

	var attachmentPath *string
	var attachmentName *string
	var attachmentMime *string
	var attachmentSize *int64
	if _, err := c.FormFile("lampiran"); err == nil {
		path, meta, err := saveUploadedFile(c, "lampiran", "letters")
		if err == nil {
			attachmentPath = &path
			attachmentName = &meta.OriginalName
			attachmentMime = &meta.Mime
			attachmentSize = &meta.Size
		}
	}

	now := time.Now()
	for _, target := range targetDivisions {
		if user.Division != nil && target == *user.Division {
			continue
		}
		code := services.DivisionCodeFromName(firstString(user.Division, ""))
		nomor, _ := services.GenerateNomorSurat(db, code, now)
		_, _ = db.Exec(`INSERT INTO surat (user_id, departemen_id, nomor_surat, tipe_surat, jenis_surat, tanggal_surat, perihal, isi_surat, status_persetujuan, kategori, prioritas, penerima, target_division, previous_division, current_recipient, lampiran_path, lampiran_nama, lampiran_mime, lampiran_size, created_at, updated_at)
            VALUES (?, ?, ?, 'keluar', ?, ?, ?, ?, 'Menunggu HR', ?, ?, ?, ?, ?, 'hr', ?, ?, ?, ?, ?, ?)`,
			user.ID, departemenID, nomor, jenisSurat, now.Format("2006-01-02"), perihal, isiSurat, kategori, prioritas, firstString(&penerima, "Admin HR"), target, user.Division, attachmentPath, attachmentName, attachmentMime, attachmentSize, now, now)
	}

	c.JSON(http.StatusOK, gin.H{"status": "Surat berhasil dikirim dan menunggu disposisi HR."})
}

func AdminStaffLettersReply(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleAdmin || user.IsHumanCapitalAdmin() {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	id := c.Param("id")
	var surat models.Surat
	if err := db.Get(&surat, "SELECT * FROM surat WHERE surat_id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "Surat tidak ditemukan")
		return
	}

	belongsToDivision := false
	if user.Division != nil {
		if surat.TargetDivision != nil && *surat.TargetDivision == *user.Division {
			belongsToDivision = true
		}
		if surat.Penerima == *user.Division {
			belongsToDivision = true
		}
	}

	if surat.CurrentRecipient != "division" || !belongsToDivision {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	if surat.StatusPersetujuan == "Diarsipkan" {
		JSONError(c, http.StatusForbidden, "Surat sudah berada di arsip.")
		return
	}

	if surat.IsFinalized {
		JSONError(c, http.StatusForbidden, "Surat ini bersifat final dan tidak dapat dibalas.")
		return
	}

	replyNote := c.PostForm("reply_note")
	if strings.TrimSpace(replyNote) == "" {
		ValidationErrors(c, FieldErrors{"reply_note": "Balasan wajib diisi."})
		return
	}

	originDivision := lookupDepartemenName(db, surat.DepartemenID, surat.UserID)
	currentDivision := firstString(user.Division, firstString(surat.TargetDivision, originDivision))
	nextTarget := surat.PreviousDivision
	if nextTarget == nil || *nextTarget == currentDivision {
		next := originDivision
		nextTarget = &next
	}

	now := time.Now()
	_, _ = db.Exec(`UPDATE surat SET reply_note=?, reply_by=?, reply_at=?, current_recipient='hr', penerima='Admin HR', target_division=?, previous_division=?, status_persetujuan='Menunggu HR', updated_at=? WHERE surat_id = ?`,
		replyNote, user.ID, now, nextTarget, currentDivision, now, surat.SuratID)

	_, _ = db.Exec(`INSERT INTO surat_reply_histories (surat_id, replied_by, from_division, to_division, note, replied_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		surat.SuratID, user.ID, currentDivision, nextTarget, replyNote, now, now, now)

	c.JSON(http.StatusOK, gin.H{"status": "Balasan surat dikirim ke HR untuk diteruskan."})
}

func AdminStaffLettersArchive(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleAdmin || user.IsHumanCapitalAdmin() {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	id := c.Param("id")

	var surat models.Surat
	if err := db.Get(&surat, "SELECT * FROM surat WHERE surat_id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "Surat tidak ditemukan")
		return
	}

	belongsToDivision := false
	if user.Division != nil {
		if surat.TargetDivision != nil && *surat.TargetDivision == *user.Division {
			belongsToDivision = true
		}
		if surat.Penerima == *user.Division {
			belongsToDivision = true
		}
	}
	canArchiveInbox := surat.CurrentRecipient == "division" && belongsToDivision
	canArchiveOutbox := surat.UserID == user.ID
	if !canArchiveInbox && !canArchiveOutbox {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	if surat.StatusPersetujuan == "Diarsipkan" {
		c.JSON(http.StatusOK, gin.H{"status": "Surat sudah berada di arsip."})
		return
	}
	if surat.StatusPersetujuan != "Didisposisi" {
		JSONError(c, http.StatusBadRequest, "Hanya surat yang sudah didisposisi yang dapat diarsipkan.")
		return
	}

	_, _ = db.Exec(`UPDATE surat SET status_persetujuan='Diarsipkan', current_recipient='archive' WHERE surat_id = ?`, id)
	c.JSON(http.StatusOK, gin.H{"status": "Surat berhasil dipindahkan ke arsip."})
}

func AdminStaffLettersUnarchive(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleAdmin || user.IsHumanCapitalAdmin() {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)
	id := c.Param("id")

	var surat models.Surat
	if err := db.Get(&surat, "SELECT * FROM surat WHERE surat_id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "Surat tidak ditemukan")
		return
	}

	belongsToDivision := false
	if user.Division != nil {
		if surat.TargetDivision != nil && *surat.TargetDivision == *user.Division {
			belongsToDivision = true
		}
		if surat.Penerima == *user.Division {
			belongsToDivision = true
		}
	}
	canUnarchiveInbox := belongsToDivision
	canUnarchiveOutbox := surat.UserID == user.ID
	if !canUnarchiveInbox && !canUnarchiveOutbox {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	if surat.StatusPersetujuan != "Diarsipkan" {
		c.JSON(http.StatusOK, gin.H{"status": "Surat tidak berada di arsip."})
		return
	}

	_, _ = db.Exec(`UPDATE surat SET status_persetujuan='Didisposisi', current_recipient='division' WHERE surat_id = ?`, id)
	c.JSON(http.StatusOK, gin.H{"status": "Surat dikembalikan ke daftar aktif."})
}

// helper functions
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
	apps := []models.Application{}
	_ = db.Select(&apps, "SELECT * FROM applications WHERE status IN ('Applied','Screening') ORDER BY submitted_at DESC LIMIT 10")
	out := make([]map[string]any, 0, len(apps))
	for _, app := range apps {
		out = append(out, map[string]any{
			"name":      app.FullName,
			"position":  app.Position,
			"date":      formatDate(app.SubmittedAt),
			"status":    app.Status,
			"education": app.Education,
		})
	}
	return out
}

func divisionOptions(db *sqlx.DB) []string {
	divisions := []string{}
	_ = db.Select(&divisions, "SELECT DISTINCT division FROM users WHERE division IS NOT NULL AND division != ''")
	if len(divisions) == 0 {
		divisions = models.UserDivisions
	}
	return divisions
}

func ensureDepartemen(db *sqlx.DB, division *string) *int64 {
	if division == nil || *division == "" {
		return nil
	}
	var departemen models.Departemen
	err := db.Get(&departemen, "SELECT * FROM departemen WHERE nama = ? LIMIT 1", *division)
	if err == nil {
		return &departemen.ID
	}
	code := services.DivisionCodeFromName(*division)
	res, err := db.Exec("INSERT INTO departemen (nama, kode, created_at, updated_at) VALUES (?, ?, NOW(), NOW())", *division, code)
	if err != nil {
		return nil
	}
	id, _ := res.LastInsertId()
	return &id
}

func lookupDepartemenName(db *sqlx.DB, departemenID *int64, userID int64) string {
	if departemenID != nil {
		var name string
		if err := db.Get(&name, "SELECT nama FROM departemen WHERE id = ?", *departemenID); err == nil {
			return name
		}
	}
	var division string
	_ = db.Get(&division, "SELECT division FROM users WHERE id = ?", userID)
	if division != "" {
		return division
	}
	return "Internal"
}

func lookupUserName(db *sqlx.DB, userID int64) string {
	var name string
	_ = db.Get(&name, "SELECT name FROM users WHERE id = ?", userID)
	if name == "" {
		return "HRD"
	}
	return name
}

func transformLetters(c *gin.Context, db *sqlx.DB, letters []models.Surat) []map[string]any {
	result := make([]map[string]any, 0, len(letters))
	for _, surat := range letters {
		replyHistories := []models.SuratReplyHistory{}
		_ = db.Select(&replyHistories, "SELECT * FROM surat_reply_histories WHERE surat_id = ? ORDER BY replied_at", surat.SuratID)
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
				"timestamp":  formatDateTime(history.RepliedAt),
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
		recipientName := firstString(surat.TargetDivision, surat.Penerima)
		letterType := strings.TrimSpace(surat.JenisSurat)
		if letterType == "" {
			letterType = "Tidak diketahui"
		}
		attachmentLink := attachmentURL(c, surat.LampiranPath)
		var attachmentPayload map[string]any
		if attachmentLink != nil {
			attachmentPayload = map[string]any{
				"name": firstString(surat.LampiranNama, "Lampiran"),
				"size": nil,
				"url":  attachmentLink,
			}
		}

		result = append(result, map[string]any{
			"id":           surat.SuratID,
			"letterNumber": surat.NomorSurat,
			"from":         senderDivision,
			"sender":       senderName,
			// Super Admin views consume these keys.
			"senderName":     senderName,
			"senderDivision": senderDivision,
			"recipientName":  recipientName,
			"letterType":     letterType,
			"subject":        surat.Perihal,
			"category":       surat.Kategori,
			"date":           formatDate(surat.TanggalSurat),
			"status": func() string {
				if surat.IsFinalized {
					return "Disposisi Final"
				}
				return surat.StatusPersetujuan
			}(),
			"isFinalized":   surat.IsFinalized,
			"priority":      surat.Prioritas,
			"hasAttachment": surat.LampiranPath != nil,
			"attachmentUrl": attachmentLink,
			// Super Admin tables/dialogs consume object attachment.
			"attachment":              attachmentPayload,
			"content":                 surat.IsiSurat,
			"dispositionNote":         surat.DispositionNote,
			"replyNote":               surat.ReplyNote,
			"replyBy":                 replyAuthorName,
			"replyAt":                 formatDateTime(surat.ReplyAt),
			"replyHistory":            historyPayload,
			"canReply":                surat.CurrentRecipient == "division" && surat.StatusPersetujuan != "Diarsipkan" && !surat.IsFinalized,
			"targetDivision":          recipientName,
			"recipient":               surat.Penerima,
			"currentRecipient":        surat.CurrentRecipient,
			"disposedBy":              disposerName,
			"disposedAt":              formatDateTime(surat.DisposedAt),
			"approvalDate":            formatDateTime(surat.TanggalPersetujuan),
			"createdAt":               formatDateTime(surat.CreatedAt),
			"updatedAt":               formatDateTime(surat.UpdatedAt),
			"dispositionDocumentUrl":  attachmentURL(c, surat.DispositionDocumentPath),
			"dispositionDocumentName": surat.DispositionDocumentName,
		})
	}
	return result
}
