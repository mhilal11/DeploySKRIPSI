package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
)

func SuperAdminTemplatesList(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	templates := []models.LetterTemplate{}
	_ = db.Select(&templates, "SELECT * FROM letter_templates ORDER BY created_at DESC")

	payload := make([]map[string]any, 0, len(templates))
	for _, t := range templates {
		payload = append(payload, map[string]any{
			"id":         t.ID,
			"name":       t.Name,
			"fileName":   t.FileName,
			"headerText": t.HeaderText,
			"footerText": t.FooterText,
			"logoUrl":    attachmentURL(c, t.LogoPath),
			"isActive":   t.IsActive,
			"createdBy":  lookupUserName(db, derefInt64(t.CreatedBy)),
			"createdAt":  formatDateTime(t.CreatedAt),
		})
	}

	c.JSON(http.StatusOK, gin.H{"templates": payload})
}

func SuperAdminTemplatesSample(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	lines := []string{
		"${logo}",
		"${header}",
		"Nomor: ${nomor_surat}",
		"Tanggal: ${tanggal}",
		"Prioritas: ${prioritas}",
		"Kepada Yth.",
		"${penerima}",
		"Perihal: ${perihal}",
		"${isi_surat}",
		"Catatan Disposisi: ${catatan_disposisi}",
		"Tanggal Disposisi: ${tanggal_disposisi}",
		"Oleh: ${oleh}",
		"Pengirim: ${pengirim}",
		"Divisi: ${divisi_pengirim}",
		"${footer}",
	}
	outFile, err := os.CreateTemp("", "Template_Disposisi_Sample_*.docx")
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal membuat file contoh")
		return
	}
	tempFile := outFile.Name()
	outFile.Close()

	if err := services.GenerateSimpleDocx(lines, tempFile); err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal membuat file contoh")
		return
	}
	defer os.Remove(tempFile)

	c.FileAttachment(tempFile, "Template_Disposisi_Sample.docx")
}

func SuperAdminTemplatesIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	templates := []models.LetterTemplate{}
	_ = db.Select(&templates, "SELECT * FROM letter_templates ORDER BY created_at DESC")
	payload := make([]map[string]any, 0, len(templates))
	for _, t := range templates {
		payload = append(payload, map[string]any{
			"id":        t.ID,
			"name":      t.Name,
			"fileName":  t.FileName,
			"isActive":  t.IsActive,
			"createdBy": lookupUserName(db, derefInt64(t.CreatedBy)),
			"createdAt": formatDateTime(t.CreatedAt),
		})
	}

	placeholders := map[string]string{
		"{{logo}}":              "Logo Perusahaan",
		"{{header}}":            "Header Surat",
		"{{nomor_surat}}":       "Nomor Surat",
		"{{tanggal}}":           "Tanggal Surat",
		"{{pengirim}}":          "Nama Pengirim",
		"{{divisi_pengirim}}":   "Divisi Pengirim",
		"{{penerima}}":          "Penerima / Divisi Tujuan",
		"{{perihal}}":           "Perihal",
		"{{isi_surat}}":         "Isi Surat",
		"{{prioritas}}":         "Prioritas",
		"{{catatan_disposisi}}": "Catatan Disposisi",
		"{{tanggal_disposisi}}": "Tanggal Disposisi",
		"{{oleh}}":              "HR yang Mendisposisi",
		"{{footer}}":            "Footer Surat",
	}

	c.JSON(http.StatusOK, gin.H{
		"templates":    payload,
		"placeholders": placeholders,
	})
}

func SuperAdminTemplatesStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	name := c.PostForm("name")
	if name == "" {
		ValidationErrors(c, FieldErrors{"name": "Nama wajib diisi."})
		return
	}

	templatePath, meta, err := saveUploadedFile(c, "template_file", "letter-templates")
	if err != nil {
		ValidationErrors(c, FieldErrors{"template_file": "File template wajib diupload."})
		return
	}

	var logoPath *string
	if _, err := c.FormFile("logo_file"); err == nil {
		path, _, err := saveUploadedFile(c, "logo_file", "letter-templates/logos")
		if err == nil {
			logoPath = &path
		}
	}

	headerText := c.PostForm("header_text")
	footerText := c.PostForm("footer_text")

	db := middleware.GetDB(c)
	now := time.Now()
	_, _ = db.Exec(`INSERT INTO letter_templates (name, file_path, file_name, header_text, footer_text, logo_path, is_active, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
		name, templatePath, meta.OriginalName, headerText, footerText, logoPath, user.ID, now, now)

	_, _ = db.Exec("UPDATE letter_templates SET is_active = 0 WHERE file_path != ?", templatePath)

	c.JSON(http.StatusOK, gin.H{"status": "Template berhasil diunggah dan diaktifkan."})
}

func SuperAdminTemplatesToggle(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	db := middleware.GetDB(c)

	var active bool
	_ = db.Get(&active, "SELECT is_active FROM letter_templates WHERE id = ?", id)

	if !active {
		_, _ = db.Exec("UPDATE letter_templates SET is_active = 0")
	}
	_, _ = db.Exec("UPDATE letter_templates SET is_active = ? WHERE id = ?", !active, id)

	c.JSON(http.StatusOK, gin.H{"status": "Template diperbarui."})
}

func SuperAdminTemplatesDownload(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	db := middleware.GetDB(c)
	var template models.LetterTemplate
	if err := db.Get(&template, "SELECT * FROM letter_templates WHERE id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "Template tidak ditemukan")
		return
	}

	templatePath := filepath.Join(middleware.GetConfig(c).StoragePath, template.FilePath)
	if _, err := os.Stat(templatePath); err != nil {
		JSONError(c, http.StatusNotFound, "File template tidak ditemukan")
		return
	}

	replacements := map[string]string{
		"{{header}}": firstString(template.HeaderText, ""),
		"{{footer}}": firstString(template.FooterText, ""),
		"{{logo}}":   "",
	}
	for k, v := range replacements {
		replacements[strings.ReplaceAll(strings.ReplaceAll(k, "{{", "${"), "}}", "}")] = v
	}

	tempFile, err := services.ReplaceDocxPlaceholders(templatePath, replacements)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Gagal memproses template")
		return
	}
	if tempFile != "" {
		defer os.Remove(tempFile)
	}
	c.FileAttachment(tempFile, "Preview_"+template.FileName)
}

func SuperAdminTemplatesUpdate(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	name := c.PostForm("name")
	headerText := c.PostForm("header_text")
	footerText := c.PostForm("footer_text")
	removeLogo := c.PostForm("remove_logo") == "true"

	db := middleware.GetDB(c)
	var template models.LetterTemplate
	if err := db.Get(&template, "SELECT * FROM letter_templates WHERE id = ?", id); err != nil {
		JSONError(c, http.StatusNotFound, "Template tidak ditemukan")
		return
	}

	if name == "" {
		name = template.Name
	}

	filePath := template.FilePath
	fileName := template.FileName
	oldTemplatePath := template.FilePath
	if _, err := c.FormFile("template_file"); err == nil {
		path, meta, err := saveUploadedFile(c, "template_file", "letter-templates")
		if err == nil {
			filePath = path
			fileName = meta.OriginalName
		}
	}

	logoPath := template.LogoPath
	oldLogoPath := template.LogoPath
	if removeLogo {
		logoPath = nil
	} else if _, err := c.FormFile("logo_file"); err == nil {
		path, _, err := saveUploadedFile(c, "logo_file", "letter-templates/logos")
		if err == nil {
			logoPath = &path
		}
	}

	_, _ = db.Exec(`UPDATE letter_templates SET name=?, file_path=?, file_name=?, header_text=?, footer_text=?, logo_path=?, updated_at=? WHERE id = ?`,
		name, filePath, fileName, headerText, footerText, logoPath, time.Now(), id)

	cfg := middleware.GetConfig(c)
	if oldTemplatePath != "" && oldTemplatePath != filePath {
		deleteStoredPath(cfg.StoragePath, oldTemplatePath)
	}
	if removeLogo && oldLogoPath != nil {
		deleteStoredPath(cfg.StoragePath, *oldLogoPath)
	}
	if oldLogoPath != nil && logoPath != nil && *oldLogoPath != *logoPath {
		deleteStoredPath(cfg.StoragePath, *oldLogoPath)
	}

	c.JSON(http.StatusOK, gin.H{"status": "Template berhasil diperbarui."})
}

func SuperAdminTemplatesDelete(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id := c.Param("id")
	db := middleware.GetDB(c)

	var template models.LetterTemplate
	_ = db.Get(&template, "SELECT * FROM letter_templates WHERE id = ?", id)
	_, _ = db.Exec("DELETE FROM letter_templates WHERE id = ?", id)

	cfg := middleware.GetConfig(c)
	if template.FilePath != "" {
		deleteStoredPath(cfg.StoragePath, template.FilePath)
	}
	if template.LogoPath != nil {
		deleteStoredPath(cfg.StoragePath, *template.LogoPath)
	}
	c.JSON(http.StatusOK, gin.H{"status": "Template berhasil dihapus."})
}

func derefInt64(ptr *int64) int64 {
	if ptr == nil {
		return 0
	}
	return *ptr
}

func deleteStoredPath(basePath string, relPath string) {
	if strings.TrimSpace(relPath) == "" {
		return
	}
	abs := filepath.Join(basePath, relPath)
	_ = os.Remove(abs)
}
