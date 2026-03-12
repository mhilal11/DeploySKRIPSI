package superadmin

import (
	"hris-backend/internal/http/handlers"
	dbrepo "hris-backend/internal/repository"

	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
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
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)

	search := strings.TrimSpace(c.Query("search"))
	category := strings.TrimSpace(c.Query("category"))
	pagination := handlers.ParsePagination(c, 20, 100)

	filterConfig := dbrepo.SuratListFilters{
		Search:   search,
		Category: category,
	}
	letters, _ := dbrepo.ListSuratByFiltersPaged(db, filterConfig, pagination.Limit, pagination.Offset)
	totalLetters, _ := dbrepo.CountSuratByFilters(db, filterConfig)
	letterStats, _ := dbrepo.CountSuratStatsByFilters(db, filterConfig)

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
		"inbox":    letterStats.Inbox,
		"outbox":   letterStats.Outbox,
		"pending":  letterStats.Pending,
		"archived": letterStats.Archived,
	}

	divisionCode := services.DivisionCodeFromName(handlers.FirstString(user.Division, ""))
	nextNumber, _ := services.GenerateNomorSurat(db, divisionCode, time.Now())

	c.JSON(http.StatusOK, gin.H{
		"stats":      stats,
		"pagination": handlers.BuildPaginationMeta(pagination.Page, pagination.Limit, totalLetters),
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
			"inbox":   handlers.TransformLetters(c, db, inbox),
			"outbox":  handlers.TransformLetters(c, db, outbox),
			"archive": handlers.TransformLetters(c, db, archive),
		},
		"pendingDisposition": handlers.TransformLetters(c, db, pendingDisposition),
		"options": gin.H{
			"letterTypes": []string{"Permohonan", "Undangan", "Laporan", "Pemberitahuan", "Surat Tugas", "Surat Cuti", "Surat Peringatan", "Surat Kerjasama"},
			"categories":  []string{"Internal", "Eksternal", "Kepegawaian", "Keuangan", "Operasional"},
			"priorities":  map[string]string{"high": "Tinggi", "medium": "Sedang", "low": "Rendah"},
			"divisions":   hrDivisionOptions(db),
		},
		"nextLetterNumber":     nextNumber,
		"sidebarNotifications": handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func SuperAdminLettersStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
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
		handlers.ValidationErrors(c, handlers.FieldErrors{"jenis_surat": "Data surat tidak lengkap."})
		return
	}
	validationErrors := handlers.FieldErrors{}
	handlers.ValidateFieldLength(validationErrors, "jenis_surat", "Jenis surat", jenis, 80)
	handlers.ValidateFieldLength(validationErrors, "perihal", "Perihal", perihal, 220)
	handlers.ValidateFieldLength(validationErrors, "isi_surat", "Isi surat", isiSurat, 8000)
	handlers.ValidateFieldLength(validationErrors, "kategori", "Kategori", kategori, 80)
	handlers.ValidateFieldLength(validationErrors, "prioritas", "Prioritas", prioritas, 24)
	handlers.ValidateFieldLength(validationErrors, "penerima", "Penerima", penerima, 120)
	handlers.ValidateFieldLength(validationErrors, "target_division", "Divisi tujuan", targetDivision, 120)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	departemenID := handlers.EnsureDepartemen(db, user.Division)

	var attachmentPath *string
	var attachmentName *string
	var attachmentMime *string
	var attachmentSize *int64
	if _, err := c.FormFile("lampiran"); err == nil {
		path, meta, err := handlers.SaveUploadedFile(c, "lampiran", "letters")
		if err == nil {
			attachmentPath = &path
			attachmentName = &meta.OriginalName
			attachmentMime = &meta.Mime
			attachmentSize = &meta.Size
		}
	}

	now := time.Now()
	divisionCode := services.DivisionCodeFromName(handlers.FirstString(user.Division, ""))

	targetDivisions := []string{targetDivision}
	if targetDivision == "__all_divisions__" {
		targetDivisions = hrDivisionOptions(db)
	}

	for _, div := range targetDivisions {
		nomor, _ := services.GenerateNomorSurat(db, divisionCode, now)
		_ = dbrepo.InsertSuperAdminLetter(db, dbrepo.SuperAdminLetterCreateInput{
			UserID:            user.ID,
			DepartemenID:      departemenID,
			NomorSurat:        nomor,
			JenisSurat:        jenis,
			TanggalSurat:      now.Format("2006-01-02"),
			Perihal:           perihal,
			IsiSurat:          isiSurat,
			Kategori:          kategori,
			Prioritas:         prioritas,
			Penerima:          handlers.FirstString(&penerima, div),
			TargetDivision:    div,
			PreviousDivision:  user.Division,
			CurrentRecipient:  div,
			DisposedBy:        user.ID,
			DisposedAt:        now,
			DispositionNote:   "Dikirim langsung oleh Super Admin",
			LampiranPath:      attachmentPath,
			LampiranNama:      attachmentName,
			LampiranMime:      attachmentMime,
			LampiranSize:      attachmentSize,
			CreatedAt:         now,
			UpdatedAt:         now,
			StatusPersetujuan: "Didisposisi",
		})
	}

	c.JSON(http.StatusOK, gin.H{"status": "Surat berhasil dikirim langsung ke divisi tujuan."})
}

func SuperAdminLettersDisposition(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID surat tidak valid")
		return
	}
	note := c.PostForm("disposition_note")
	validationErrors := handlers.FieldErrors{}
	handlers.ValidateFieldLength(validationErrors, "disposition_note", "Catatan disposisi", note, 3000)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}
	db := middleware.GetDB(c)

	surat, err := dbrepo.GetSuratByID(db, id)
	if err != nil || surat == nil {
		handlers.JSONError(c, http.StatusNotFound, "Surat tidak ditemukan")
		return
	}

	if surat.CurrentRecipient != "hr" {
		handlers.JSONError(c, http.StatusBadRequest, "Surat sudah didisposisi")
		return
	}

	_ = dbrepo.UpdateSuratDispositionToDivision(db, surat.SuratID, handlers.FirstString(surat.TargetDivision, surat.Penerima), note, user.ID, time.Now())

	c.JSON(http.StatusOK, gin.H{"status": "Surat berhasil didisposisi ke divisi tujuan."})
}

func SuperAdminLettersBulkDisposition(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	ids := c.PostFormArray("letter_ids[]")
	if len(ids) == 0 {
		ids = c.PostFormArray("letter_ids")
	}
	note := c.PostForm("disposition_note")
	validationErrors := handlers.FieldErrors{}
	handlers.ValidateFieldLength(validationErrors, "disposition_note", "Catatan disposisi", note, 3000)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	db := middleware.GetDB(c)
	idValues := parseInt64IDs(ids)
	_ = dbrepo.BulkDispositionLetters(db, idValues, note, user.ID, time.Now())

	c.JSON(http.StatusOK, gin.H{"status": fmt.Sprintf("%d surat berhasil didisposisi ke divisi tujuan.", len(ids))})
}

func SuperAdminLettersRejectDisposition(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	ids := c.PostFormArray("letter_ids[]")
	if len(ids) == 0 {
		ids = c.PostFormArray("letter_ids")
	}
	note := c.PostForm("disposition_note")
	if note == "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"disposition_note": "Catatan disposisi wajib diisi."})
		return
	}
	validationErrors := handlers.FieldErrors{}
	handlers.ValidateFieldLength(validationErrors, "disposition_note", "Catatan disposisi", note, 3000)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	db := middleware.GetDB(c)
	for _, id := range ids {
		suratID, parseErr := strconv.ParseInt(id, 10, 64)
		if parseErr != nil || suratID <= 0 {
			continue
		}
		surat, err := dbrepo.GetSuratByID(db, suratID)
		if err != nil || surat == nil {
			continue
		}
		originDivision := handlers.LookupDepartemenName(db, surat.DepartemenID, surat.UserID)
		_ = dbrepo.UpdateSuratRejectedToOrigin(db, suratID, originDivision, note, user.ID, time.Now())
	}

	c.JSON(http.StatusOK, gin.H{"status": fmt.Sprintf("%d surat ditolak dan dikembalikan ke divisi pengirim.", len(ids))})
}

func SuperAdminLettersFinalDisposition(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	ids := c.PostFormArray("letter_ids[]")
	if len(ids) == 0 {
		ids = c.PostFormArray("letter_ids")
	}
	note := c.PostForm("disposition_note")
	validationErrors := handlers.FieldErrors{}
	handlers.ValidateFieldLength(validationErrors, "disposition_note", "Catatan disposisi", note, 3000)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	db := middleware.GetDB(c)
	for _, id := range ids {
		suratID, parseErr := strconv.ParseInt(id, 10, 64)
		if parseErr != nil || suratID <= 0 {
			continue
		}
		surat, err := dbrepo.GetSuratByID(db, suratID)
		if err != nil || surat == nil {
			continue
		}

		if note != "" {
			surat.DispositionNote = &note
		}

		filePath, fileName := generateDispositionDocument(c, db, surat)
		_ = dbrepo.UpdateSuratFinalDisposition(db, surat.SuratID, &filePath, &fileName, surat.DispositionNote, user.ID, time.Now())
	}

	c.JSON(http.StatusOK, gin.H{"status": fmt.Sprintf("%d surat didisposisi final.", len(ids))})
}

func SuperAdminLettersArchive(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID surat tidak valid")
		return
	}
	db := middleware.GetDB(c)
	_ = dbrepo.ArchiveSurat(db, id)
	c.JSON(http.StatusOK, gin.H{"status": "Surat dipindahkan ke arsip."})
}

func SuperAdminLettersUnarchive(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID surat tidak valid")
		return
	}
	db := middleware.GetDB(c)
	_ = dbrepo.UnarchiveSurat(db, id)
	c.JSON(http.StatusOK, gin.H{"status": "Surat dikembalikan ke daftar aktif."})
}

func SuperAdminLettersExportWord(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID surat tidak valid")
		return
	}
	db := middleware.GetDB(c)
	surat, err := dbrepo.GetSuratByID(db, id)
	if err != nil || surat == nil {
		handlers.JSONError(c, http.StatusNotFound, "Surat tidak ditemukan")
		return
	}

	filePath, fileName := generateDispositionDocument(c, db, surat)
	normalizedPath := handlers.NormalizeAttachmentPath(filePath)
	absPath, ok := resolveStorageFilePath(middleware.GetConfig(c).StoragePath, normalizedPath)
	if !ok {
		handlers.JSONError(c, http.StatusUnprocessableEntity, "Path dokumen disposisi tidak valid.")
		return
	}
	content, _, readErr := services.ReadFileMaybeDecrypted(absPath, middleware.GetConfig(c).StorageEncryptionKey)
	if readErr != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal membaca dokumen disposisi.")
		return
	}
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", content)
}

func SuperAdminLettersExportFinal(c *gin.Context) {
	SuperAdminLettersExportWord(c)
}

func generateDispositionDocument(c *gin.Context, db *sqlx.DB, surat *models.Surat) (string, string) {
	placeholders := dispositionPlaceholders(db, surat)

	// try template
	template, err := dbrepo.GetActiveLetterTemplate(db)
	var tempFile string
	if err == nil && template != nil && template.FilePath != "" {
		templatePath := handlers.NormalizeAttachmentPath(template.FilePath)
		if resolvedTemplatePath, ok := resolveStorageFilePath(middleware.GetConfig(c).StoragePath, templatePath); ok {
			if _, err := os.Stat(resolvedTemplatePath); err == nil {
				readPath, cleanup, prepErr := services.PrepareFileForRead(resolvedTemplatePath, middleware.GetConfig(c).StorageEncryptionKey)
				if prepErr == nil {
					defer cleanup()
					tempFile, _ = services.ReplaceDocxPlaceholders(readPath, placeholders)
				}
			}
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
	cfg := middleware.GetConfig(c)
	if cfg.StorageEncryptUploads && cfg.StorageEncryptionKey != "" {
		_ = services.EncryptFileInPlace(destPath, cfg.StorageEncryptionKey)
	}

	relPath := filepath.ToSlash(filepath.Join("disposition_documents", fileName))
	return relPath, fileName
}

func dispositionPlaceholders(db *sqlx.DB, surat *models.Surat) map[string]string {
	placeholders := map[string]string{}
	placeholders["{{nomor_surat}}"] = surat.NomorSurat
	placeholders["{{tanggal}}"] = handlers.FormatDate(surat.TanggalSurat)
	placeholders["{{pengirim}}"] = handlers.LookupUserName(db, surat.UserID)
	placeholders["{{divisi_pengirim}}"] = handlers.LookupDepartemenName(db, surat.DepartemenID, surat.UserID)
	placeholders["{{penerima}}"] = handlers.FirstString(surat.TargetDivision, surat.Penerima)
	placeholders["{{perihal}}"] = surat.Perihal
	placeholders["{{isi_surat}}"] = surat.IsiSurat
	placeholders["{{prioritas}}"] = surat.Prioritas
	if surat.DispositionNote != nil {
		placeholders["{{catatan_disposisi}}"] = *surat.DispositionNote
	} else {
		placeholders["{{catatan_disposisi}}"] = "-"
	}
	placeholders["{{tanggal_disposisi}}"] = handlers.FormatDateTime(surat.DisposedAt)
	if surat.DisposedBy != nil {
		placeholders["{{oleh}}"] = handlers.LookupUserName(db, *surat.DisposedBy)
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
	divisions, err := services.DivisionNames(db)
	if err != nil {
		return []string{}
	}
	return divisions
}

func parseInt64IDs(values []string) []int64 {
	out := make([]int64, 0, len(values))
	for _, value := range values {
		id, err := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
		if err != nil || id <= 0 {
			continue
		}
		out = append(out, id)
	}
	return out
}
