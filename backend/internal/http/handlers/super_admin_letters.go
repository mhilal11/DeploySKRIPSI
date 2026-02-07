package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func SuperAdminLettersIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	search := strings.TrimSpace(c.Query("search"))
	category := strings.TrimSpace(c.Query("category"))

	query := "SELECT * FROM surat"
	clauses := []string{}
	args := []any{}
	if search != "" {
		clauses = append(clauses, "(nomor_surat LIKE ? OR perihal LIKE ? OR penerima LIKE ?)")
		like := "%" + search + "%"
		args = append(args, like, like, like)
	}
	if category != "" && category != "all" {
		clauses = append(clauses, "kategori = ?")
		args = append(args, category)
	}
	if len(clauses) > 0 {
		query += " WHERE " + strings.Join(clauses, " AND ")
	}
	query += " ORDER BY tanggal_surat DESC, surat_id DESC"

	letters := []models.Surat{}
	_ = db.Select(&letters, query, args...)

	archive := []models.Surat{}
	activeLetters := []models.Surat{}
	for _, letter := range letters {
		if letter.StatusPersetujuan == "Diarsipkan" {
			archive = append(archive, letter)
		} else {
			activeLetters = append(activeLetters, letter)
		}
	}

	inbox := []models.Surat{}
	outbox := []models.Surat{}
	for _, letter := range activeLetters {
		if letter.CurrentRecipient == "hr" {
			inbox = append(inbox, letter)
		} else if letter.CurrentRecipient == "division" {
			outbox = append(outbox, letter)
		}
	}

	pendingStatuses := map[string]bool{"Menunggu HR": true, "Diajukan": true, "Diproses": true}
	pendingDisposition := []models.Surat{}
	for _, letter := range inbox {
		if pendingStatuses[letter.StatusPersetujuan] {
			pendingDisposition = append(pendingDisposition, letter)
		}
	}

	stats := map[string]int{
		"inbox":    len(inbox),
		"outbox":   len(outbox),
		"pending":  len(pendingDisposition),
		"archived": len(archive),
	}

	divisionCode := services.DivisionCodeFromName(firstString(user.Division, ""))
	nextNumber, _ := services.GenerateNomorSurat(db, divisionCode, time.Now())

	c.JSON(http.StatusOK, gin.H{
		"stats": stats,
		"filters": gin.H{
			"search": search,
			"category": func() string {
				if category == "" {
					return "all"
				}
				return category
			}(),
			"tab": func() string {
				if t := c.Query("tab"); t != "" {
					return t
				}
				return "inbox"
			}(),
		},
		"letters": gin.H{
			"inbox":   transformLetters(c, db, inbox),
			"outbox":  transformLetters(c, db, outbox),
			"archive": transformLetters(c, db, archive),
		},
		"pendingDisposition": transformLetters(c, db, pendingDisposition),
		"options": gin.H{
			"letterTypes": []string{"Permohonan", "Undangan", "Laporan", "Pemberitahuan", "Surat Tugas", "Surat Cuti", "Surat Peringatan", "Surat Kerjasama"},
			"categories":  []string{"Internal", "Eksternal", "Kepegawaian", "Keuangan", "Operasional"},
			"priorities":  map[string]string{"high": "Tinggi", "medium": "Sedang", "low": "Rendah"},
			"divisions":   hrDivisionOptions(db),
		},
		"nextLetterNumber":     nextNumber,
		"sidebarNotifications": computeSuperAdminSidebarNotifications(db),
	})
}

func SuperAdminLettersStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	jenis := c.PostForm("jenis_surat")
	perihal := c.PostForm("perihal")
	isiSurat := c.PostForm("isi_surat")
	kategori := c.PostForm("kategori")
	prioritas := c.PostForm("prioritas")
	penerima := c.PostForm("penerima")
	targetDivision := c.PostForm("target_division")

	if jenis == "" || perihal == "" || kategori == "" || prioritas == "" || targetDivision == "" {
		ValidationErrors(c, FieldErrors{"jenis_surat": "Data surat tidak lengkap."})
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
	divisionCode := services.DivisionCodeFromName(firstString(user.Division, ""))

	targetDivisions := []string{targetDivision}
	if targetDivision == "__all_divisions__" {
		targetDivisions = hrDivisionOptions(db)
	}

	for _, div := range targetDivisions {
		nomor, _ := services.GenerateNomorSurat(db, divisionCode, now)
		_, _ = db.Exec(`INSERT INTO surat (user_id, departemen_id, nomor_surat, tipe_surat, jenis_surat, tanggal_surat, perihal, isi_surat, status_persetujuan, kategori, prioritas, penerima, target_division, previous_division, current_recipient, disposed_by, disposed_at, disposition_note, lampiran_path, lampiran_nama, lampiran_mime, lampiran_size, created_at, updated_at)
            VALUES (?, ?, ?, 'keluar', ?, ?, ?, ?, 'Didisposisi', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			user.ID, departemenID, nomor, jenis, now.Format("2006-01-02"), perihal, isiSurat, kategori, prioritas, firstString(&penerima, div), div, user.Division, div, user.ID, now, "Dikirim langsung oleh Super Admin", attachmentPath, attachmentName, attachmentMime, attachmentSize, now, now)
	}

	c.JSON(http.StatusOK, gin.H{"status": "Surat berhasil dikirim langsung ke divisi tujuan."})
}

func SuperAdminLettersDisposition(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	note := c.PostForm("disposition_note")
	db := middleware.GetDB(c)

	var surat models.Surat
	if err := db.Get(&surat, "SELECT * FROM surat WHERE surat_id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "Surat tidak ditemukan")
		return
	}

	if surat.CurrentRecipient != "hr" {
		JSONError(c, http.StatusBadRequest, "Surat sudah didisposisi")
		return
	}

	_, _ = db.Exec(`UPDATE surat SET current_recipient='division', penerima=?, status_persetujuan='Didisposisi', disposition_note=?, disposed_by=?, disposed_at=?, updated_at=? WHERE surat_id=?`,
		firstString(surat.TargetDivision, surat.Penerima), note, user.ID, time.Now(), time.Now(), surat.SuratID)

	c.JSON(http.StatusOK, gin.H{"status": "Surat berhasil didisposisi ke divisi tujuan."})
}

func SuperAdminLettersBulkDisposition(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	ids := c.PostFormArray("letter_ids[]")
	if len(ids) == 0 {
		ids = c.PostFormArray("letter_ids")
	}
	note := c.PostForm("disposition_note")

	db := middleware.GetDB(c)
	for _, id := range ids {
		_, _ = db.Exec(`UPDATE surat SET current_recipient='division', penerima=COALESCE(target_division,penerima), status_persetujuan='Didisposisi', disposition_note=?, disposed_by=?, disposed_at=?, updated_at=? WHERE surat_id=?`,
			note, user.ID, time.Now(), time.Now(), id)
	}

	c.JSON(http.StatusOK, gin.H{"status": fmt.Sprintf("%d surat berhasil didisposisi ke divisi tujuan.", len(ids))})
}

func SuperAdminLettersRejectDisposition(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	ids := c.PostFormArray("letter_ids[]")
	if len(ids) == 0 {
		ids = c.PostFormArray("letter_ids")
	}
	note := c.PostForm("disposition_note")
	if note == "" {
		ValidationErrors(c, FieldErrors{"disposition_note": "Catatan disposisi wajib diisi."})
		return
	}

	db := middleware.GetDB(c)
	for _, id := range ids {
		var surat models.Surat
		if err := db.Get(&surat, "SELECT * FROM surat WHERE surat_id = ?", id); err != nil {
			continue
		}
		originDivision := lookupDepartemenName(db, surat.DepartemenID, surat.UserID)
		_, _ = db.Exec(`UPDATE surat SET current_recipient='division', penerima=?, target_division=?, status_persetujuan='Ditolak HR', disposition_note=?, disposed_by=?, disposed_at=?, updated_at=? WHERE surat_id=?`,
			originDivision, originDivision, note, user.ID, time.Now(), time.Now(), id)
	}

	c.JSON(http.StatusOK, gin.H{"status": fmt.Sprintf("%d surat ditolak dan dikembalikan ke divisi pengirim.", len(ids))})
}

func SuperAdminLettersFinalDisposition(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	ids := c.PostFormArray("letter_ids[]")
	if len(ids) == 0 {
		ids = c.PostFormArray("letter_ids")
	}
	note := c.PostForm("disposition_note")

	db := middleware.GetDB(c)
	for _, id := range ids {
		var surat models.Surat
		if err := db.Get(&surat, "SELECT * FROM surat WHERE surat_id = ?", id); err != nil {
			continue
		}

		if note != "" {
			surat.DispositionNote = &note
		}

		filePath, fileName := generateDispositionDocument(c, db, &surat)
		_, _ = db.Exec(`UPDATE surat SET current_recipient='division', penerima=COALESCE(target_division,penerima), status_persetujuan='Didisposisi', is_finalized=1, disposition_document_path=?, disposition_document_name=?, disposition_note=?, disposed_by=?, disposed_at=?, updated_at=? WHERE surat_id=?`,
			filePath, fileName, surat.DispositionNote, user.ID, time.Now(), time.Now(), surat.SuratID)
	}

	c.JSON(http.StatusOK, gin.H{"status": fmt.Sprintf("%d surat didisposisi final.", len(ids))})
}

func SuperAdminLettersArchive(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	id := c.Param("id")
	db := middleware.GetDB(c)
	_, _ = db.Exec(`UPDATE surat SET status_persetujuan='Diarsipkan', current_recipient='archive' WHERE surat_id = ?`, id)
	c.JSON(http.StatusOK, gin.H{"status": "Surat dipindahkan ke arsip."})
}

func SuperAdminLettersUnarchive(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	id := c.Param("id")
	db := middleware.GetDB(c)
	_, _ = db.Exec(`UPDATE surat SET status_persetujuan='Didisposisi', current_recipient='division' WHERE surat_id = ?`, id)
	c.JSON(http.StatusOK, gin.H{"status": "Surat dikembalikan ke daftar aktif."})
}

func SuperAdminLettersExportWord(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	db := middleware.GetDB(c)
	var surat models.Surat
	if err := db.Get(&surat, "SELECT * FROM surat WHERE surat_id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "Surat tidak ditemukan")
		return
	}

	filePath, fileName := generateDispositionDocument(c, db, &surat)
	absPath := filepath.Join(middleware.GetConfig(c).StoragePath, filePath)
	c.FileAttachment(absPath, fileName)
}

func SuperAdminLettersExportFinal(c *gin.Context) {
	SuperAdminLettersExportWord(c)
}

func generateDispositionDocument(c *gin.Context, db *sqlx.DB, surat *models.Surat) (string, string) {
	placeholders := dispositionPlaceholders(db, surat)

	// try template
	var template models.LetterTemplate
	err := db.Get(&template, "SELECT * FROM letter_templates WHERE is_active = 1 LIMIT 1")
	var tempFile string
	if err == nil && template.FilePath != "" {
		templatePath := filepath.Join(middleware.GetConfig(c).StoragePath, template.FilePath)
		if _, err := os.Stat(templatePath); err == nil {
			tempFile, _ = services.ReplaceDocxPlaceholders(templatePath, placeholders)
		}
	}

	if tempFile == "" {
		lines := services.BuildDispositionLines(placeholders)
		tempFile = filepath.Join(os.TempDir(), fmt.Sprintf("disposition_%d.docx", time.Now().UnixNano()))
		_ = services.GenerateSimpleDocx(lines, tempFile)
	}
	if tempFile != "" {
		defer os.Remove(tempFile)
	}

	fileName := fmt.Sprintf("disposisi_final_%s_%s.docx", surat.NomorSurat, time.Now().Format("20060102_150405"))
	fileName = sanitizeFilename(fileName)
	storagePath := filepath.Join(middleware.GetConfig(c).StoragePath, "disposition_documents")
	_ = os.MkdirAll(storagePath, 0o755)
	destPath := filepath.Join(storagePath, fileName)
	_ = copyFile(tempFile, destPath)

	relPath := filepath.ToSlash(filepath.Join("disposition_documents", fileName))
	return relPath, fileName
}

func dispositionPlaceholders(db *sqlx.DB, surat *models.Surat) map[string]string {
	placeholders := map[string]string{}
	placeholders["{{nomor_surat}}"] = surat.NomorSurat
	placeholders["{{tanggal}}"] = formatDate(surat.TanggalSurat)
	placeholders["{{pengirim}}"] = lookupUserName(db, surat.UserID)
	placeholders["{{divisi_pengirim}}"] = lookupDepartemenName(db, surat.DepartemenID, surat.UserID)
	placeholders["{{penerima}}"] = firstString(surat.TargetDivision, surat.Penerima)
	placeholders["{{perihal}}"] = surat.Perihal
	placeholders["{{isi_surat}}"] = surat.IsiSurat
	placeholders["{{prioritas}}"] = surat.Prioritas
	if surat.DispositionNote != nil {
		placeholders["{{catatan_disposisi}}"] = *surat.DispositionNote
	} else {
		placeholders["{{catatan_disposisi}}"] = "-"
	}
	placeholders["{{tanggal_disposisi}}"] = formatDateTime(surat.DisposedAt)
	if surat.DisposedBy != nil {
		placeholders["{{oleh}}"] = lookupUserName(db, *surat.DisposedBy)
	} else {
		placeholders["{{oleh}}"] = "HR Admin"
	}
	placeholders["{{header}}"] = ""
	placeholders["{{footer}}"] = ""
	placeholders["{{logo}}"] = ""

	// also replace ${} variants
	for k, v := range placeholders {
		placeholders[strings.ReplaceAll(strings.ReplaceAll(k, "{{", "${"), "}}", "}")] = v
	}

	return placeholders
}

func copyFile(src, dest string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

func sanitizeFilename(name string) string {
	name = strings.ReplaceAll(name, "/", "-")
	name = strings.ReplaceAll(name, "\\", "-")
	return name
}

func hrDivisionOptions(db *sqlx.DB) []string {
	divisions := []string{}
	_ = db.Select(&divisions, "SELECT DISTINCT division FROM users WHERE role = ? AND division IS NOT NULL AND division != ''", models.RoleAdmin)
	if len(divisions) == 0 {
		divisions = models.UserDivisions
	}
	return divisions
}
