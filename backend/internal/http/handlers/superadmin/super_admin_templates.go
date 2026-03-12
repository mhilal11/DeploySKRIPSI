package superadmin

import (
	"hris-backend/internal/http/handlers"
	dbrepo "hris-backend/internal/repository"

	"net/http"
	"os"
	"strconv"
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
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	templates, _ := dbrepo.ListLetterTemplates(db)

	payload := make([]map[string]any, 0, len(templates))
	for _, t := range templates {
		payload = append(payload, map[string]any{
			"id":         t.ID,
			"name":       t.Name,
			"fileName":   t.FileName,
			"headerText": t.HeaderText,
			"footerText": t.FooterText,
			"logoUrl":    handlers.AttachmentURL(c, t.LogoPath),
			"isActive":   t.IsActive,
			"createdBy":  handlers.LookupUserName(db, derefInt64(t.CreatedBy)),
			"createdAt":  handlers.FormatDateTime(t.CreatedAt),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"templates":            payload,
		"sidebarNotifications": handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func SuperAdminTemplatesSample(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
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
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal membuat file contoh")
		return
	}
	tempFile := outFile.Name()
	outFile.Close()

	if err := services.GenerateSimpleDocx(lines, tempFile); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal membuat file contoh")
		return
	}
	defer os.Remove(tempFile)

	c.FileAttachment(tempFile, "Template_Disposisi_Sample.docx")
}

func SuperAdminTemplatesIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	templates, _ := dbrepo.ListLetterTemplates(db)
	payload := make([]map[string]any, 0, len(templates))
	for _, t := range templates {
		payload = append(payload, map[string]any{
			"id":        t.ID,
			"name":      t.Name,
			"fileName":  t.FileName,
			"isActive":  t.IsActive,
			"createdBy": handlers.LookupUserName(db, derefInt64(t.CreatedBy)),
			"createdAt": handlers.FormatDateTime(t.CreatedAt),
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
		"templates":            payload,
		"placeholders":         placeholders,
		"sidebarNotifications": handlers.ComputeSuperAdminSidebarNotifications(db, user.ID),
	})
}

func SuperAdminTemplatesStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	name := c.PostForm("name")
	if name == "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"name": "Nama wajib diisi."})
		return
	}
	validationErrors := handlers.FieldErrors{}
	headerText := c.PostForm("header_text")
	footerText := c.PostForm("footer_text")
	handlers.ValidateFieldLength(validationErrors, "name", "Nama template", name, 120)
	handlers.ValidateFieldLength(validationErrors, "header_text", "Header template", headerText, 4000)
	handlers.ValidateFieldLength(validationErrors, "footer_text", "Footer template", footerText, 4000)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	templatePath, meta, err := handlers.SaveUploadedFile(c, "template_file", "letter-templates")
	if err != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"template_file": "File template wajib diupload."})
		return
	}

	var logoPath *string
	if _, err := c.FormFile("logo_file"); err == nil {
		path, _, err := handlers.SaveUploadedFile(c, "logo_file", "letter-templates/logos")
		if err == nil {
			logoPath = &path
		}
	}

	db := middleware.GetDB(c)
	now := time.Now()
	_ = dbrepo.CreateAndActivateLetterTemplate(db, dbrepo.LetterTemplateCreateInput{
		Name:       name,
		FilePath:   templatePath,
		FileName:   meta.OriginalName,
		HeaderText: headerText,
		FooterText: footerText,
		LogoPath:   logoPath,
		CreatedBy:  user.ID,
		Now:        now,
	})

	c.JSON(http.StatusOK, gin.H{"status": "Template berhasil diunggah dan diaktifkan."})
}

func SuperAdminTemplatesToggle(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID template tidak valid")
		return
	}
	db := middleware.GetDB(c)

	active, _ := dbrepo.GetLetterTemplateIsActive(db, id)

	if !active {
		_ = dbrepo.DeactivateAllLetterTemplates(db)
	}
	_ = dbrepo.SetLetterTemplateActive(db, id, !active)

	c.JSON(http.StatusOK, gin.H{"status": "Template diperbarui."})
}

func SuperAdminTemplatesDownload(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID template tidak valid")
		return
	}
	db := middleware.GetDB(c)
	template, err := dbrepo.GetLetterTemplateByID(db, id)
	if err != nil || template == nil {
		handlers.JSONError(c, http.StatusNotFound, "Template tidak ditemukan")
		return
	}

	normalizedTemplatePath := handlers.NormalizeAttachmentPath(template.FilePath)
	templatePath, ok := resolveStorageFilePath(middleware.GetConfig(c).StoragePath, normalizedTemplatePath)
	if !ok {
		handlers.JSONError(c, http.StatusNotFound, "File template tidak ditemukan")
		return
	}
	readTemplatePath, cleanupReadTemplate, prepErr := services.PrepareFileForRead(templatePath, middleware.GetConfig(c).StorageEncryptionKey)
	if prepErr != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal membaca file template")
		return
	}
	defer cleanupReadTemplate()

	replacements := map[string]string{
		"{{header}}": handlers.FirstString(template.HeaderText, ""),
		"{{footer}}": handlers.FirstString(template.FooterText, ""),
		"{{logo}}":   "",
	}
	for k, v := range replacements {
		replacements[strings.ReplaceAll(strings.ReplaceAll(k, "{{", "${"), "}}", "}")] = v
	}

	tempFile, err := services.ReplaceDocxPlaceholders(readTemplatePath, replacements)
	if err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memproses template")
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
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID template tidak valid")
		return
	}
	name := c.PostForm("name")
	headerText := c.PostForm("header_text")
	footerText := c.PostForm("footer_text")
	removeLogo := c.PostForm("remove_logo") == "true"
	validationErrors := handlers.FieldErrors{}
	handlers.ValidateFieldLength(validationErrors, "name", "Nama template", name, 120)
	handlers.ValidateFieldLength(validationErrors, "header_text", "Header template", headerText, 4000)
	handlers.ValidateFieldLength(validationErrors, "footer_text", "Footer template", footerText, 4000)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	db := middleware.GetDB(c)
	template, err := dbrepo.GetLetterTemplateByID(db, id)
	if err != nil || template == nil {
		handlers.JSONError(c, http.StatusNotFound, "Template tidak ditemukan")
		return
	}

	if name == "" {
		name = template.Name
	}

	filePath := template.FilePath
	fileName := template.FileName
	oldTemplatePath := template.FilePath
	if _, err := c.FormFile("template_file"); err == nil {
		path, meta, err := handlers.SaveUploadedFile(c, "template_file", "letter-templates")
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
		path, _, err := handlers.SaveUploadedFile(c, "logo_file", "letter-templates/logos")
		if err == nil {
			logoPath = &path
		}
	}

	_ = dbrepo.UpdateLetterTemplate(db, dbrepo.LetterTemplateUpdateInput{
		ID:         id,
		Name:       name,
		FilePath:   filePath,
		FileName:   fileName,
		HeaderText: headerText,
		FooterText: footerText,
		LogoPath:   logoPath,
		UpdatedAt:  time.Now(),
	})

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
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID template tidak valid")
		return
	}
	db := middleware.GetDB(c)

	template, _ := dbrepo.GetLetterTemplateByID(db, id)
	_ = dbrepo.DeleteLetterTemplateByID(db, id)

	cfg := middleware.GetConfig(c)
	if template != nil && template.FilePath != "" {
		deleteStoredPath(cfg.StoragePath, template.FilePath)
	}
	if template != nil && template.LogoPath != nil {
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
	normalized := handlers.NormalizeAttachmentPath(relPath)
	if normalized == "" {
		return
	}
	abs, ok := resolveStorageFilePath(basePath, normalized)
	if !ok {
		return
	}
	_ = os.Remove(abs)
}
