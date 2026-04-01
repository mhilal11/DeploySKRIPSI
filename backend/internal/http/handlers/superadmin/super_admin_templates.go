package superadmin

import (
	"fmt"
	"hris-backend/internal/dto"
	"hris-backend/internal/http/handlers"
	dbrepo "hris-backend/internal/repository"

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

type templatesRepository interface {
	ListLetterTemplatesPaged(limit, offset int) ([]models.LetterTemplate, error)
	CountLetterTemplates() (int, error)
	GetLetterTemplateIsActive(id int64) (bool, error)
	DeactivateAllLetterTemplates() error
	SetLetterTemplateActive(id int64, active bool) error
	GetLetterTemplateByID(id int64) (*models.LetterTemplate, error)
	CreateAndActivateLetterTemplate(input dbrepo.LetterTemplateCreateInput) error
	UpdateLetterTemplate(input dbrepo.LetterTemplateUpdateInput) error
	DeleteLetterTemplateByID(id int64) error
}

type sqlTemplatesRepository struct {
	db *sqlx.DB
}

func newTemplatesRepository(db *sqlx.DB) templatesRepository {
	return &sqlTemplatesRepository{db: db}
}

func (r *sqlTemplatesRepository) ListLetterTemplatesPaged(limit, offset int) ([]models.LetterTemplate, error) {
	return dbrepo.ListLetterTemplatesPaged(r.db, limit, offset)
}

func (r *sqlTemplatesRepository) CountLetterTemplates() (int, error) {
	return dbrepo.CountLetterTemplates(r.db)
}

func (r *sqlTemplatesRepository) GetLetterTemplateIsActive(id int64) (bool, error) {
	return dbrepo.GetLetterTemplateIsActive(r.db, id)
}

func (r *sqlTemplatesRepository) DeactivateAllLetterTemplates() error {
	return dbrepo.DeactivateAllLetterTemplates(r.db)
}

func (r *sqlTemplatesRepository) SetLetterTemplateActive(id int64, active bool) error {
	return dbrepo.SetLetterTemplateActive(r.db, id, active)
}

func (r *sqlTemplatesRepository) GetLetterTemplateByID(id int64) (*models.LetterTemplate, error) {
	return dbrepo.GetLetterTemplateByID(r.db, id)
}

func (r *sqlTemplatesRepository) CreateAndActivateLetterTemplate(input dbrepo.LetterTemplateCreateInput) error {
	return dbrepo.CreateAndActivateLetterTemplate(r.db, input)
}

func (r *sqlTemplatesRepository) UpdateLetterTemplate(input dbrepo.LetterTemplateUpdateInput) error {
	return dbrepo.UpdateLetterTemplate(r.db, input)
}

func (r *sqlTemplatesRepository) DeleteLetterTemplateByID(id int64) error {
	return dbrepo.DeleteLetterTemplateByID(r.db, id)
}

func SuperAdminTemplatesList(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	repo := newTemplatesRepository(db)
	pagination := handlers.ParsePagination(c, 20, 100)
	templates, _ := repo.ListLetterTemplatesPaged(pagination.Limit, pagination.Offset)
	totalTemplates, _ := repo.CountLetterTemplates()

	payload := make([]dto.LetterTemplateListItem, 0, len(templates))
	for _, t := range templates {
		payload = append(payload, buildTemplateListItem(c, db, &t))
	}

	c.JSON(http.StatusOK, gin.H{
		"templates":            payload,
		"pagination":           handlers.BuildPaginationMeta(pagination.Page, pagination.Limit, totalTemplates),
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
	repo := newTemplatesRepository(db)
	pagination := handlers.ParsePagination(c, 20, 100)
	templates, _ := repo.ListLetterTemplatesPaged(pagination.Limit, pagination.Offset)
	totalTemplates, _ := repo.CountLetterTemplates()
	payload := make([]dto.LetterTemplateListItem, 0, len(templates))
	for _, t := range templates {
		payload = append(payload, buildTemplateListItem(c, db, &t))
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
		"pagination":           handlers.BuildPaginationMeta(pagination.Page, pagination.Limit, totalTemplates),
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
	templateContent := normalizeTemplateEditorContent(c.PostForm("template_content"))
	handlers.ValidateFieldLength(validationErrors, "name", "Nama template", name, 120)
	handlers.ValidateFieldLength(validationErrors, "template_content", "Isi template", templateContent, 20000)
	handlers.ValidateFieldLength(validationErrors, "header_text", "Header template", headerText, 4000)
	handlers.ValidateFieldLength(validationErrors, "footer_text", "Footer template", footerText, 4000)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	templatePath := ""
	templateFileName := ""
	if _, err := c.FormFile("template_file"); err == nil {
		path, meta, saveErr := handlers.SaveUploadedFile(c, "template_file", "letter-templates")
		if saveErr != nil {
			handlers.ValidationErrors(c, handlers.FieldErrors{"template_file": "File template tidak dapat diproses."})
			return
		}
		templatePath = path
		templateFileName = meta.OriginalName
		if templateContent == "" {
			templateContent = resolveTemplateEditorContentFromStorage(c, templatePath)
		}
	}

	if templatePath == "" {
		if templateContent == "" {
			handlers.ValidationErrors(c, handlers.FieldErrors{"template_content": "Isi template wajib diisi."})
			return
		}

		path, fileName, genErr := generateTemplateFileFromContent(c, name, templateContent)
		if genErr != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal membuat file template")
			return
		}
		templatePath = path
		templateFileName = fileName
	}

	var logoPath *string
	if _, err := c.FormFile("logo_file"); err == nil {
		path, _, err := handlers.SaveUploadedFile(c, "logo_file", "letter-templates/logos")
		if err == nil {
			logoPath = &path
		}
	}

	db := middleware.GetDB(c)
	repo := newTemplatesRepository(db)
	now := time.Now()
	_ = repo.CreateAndActivateLetterTemplate(dbrepo.LetterTemplateCreateInput{
		Name:            name,
		FilePath:        templatePath,
		FileName:        templateFileName,
		TemplateContent: templateContent,
		HeaderText:      headerText,
		FooterText:      footerText,
		LogoPath:        logoPath,
		CreatedBy:       user.ID,
		Now:             now,
	})

	c.JSON(http.StatusOK, gin.H{"status": "Template berhasil disimpan dan diaktifkan."})
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
	repo := newTemplatesRepository(db)

	active, _ := repo.GetLetterTemplateIsActive(id)

	if !active {
		_ = repo.DeactivateAllLetterTemplates()
	}
	_ = repo.SetLetterTemplateActive(id, !active)

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
	repo := newTemplatesRepository(db)
	template, err := repo.GetLetterTemplateByID(id)
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
	templateContent := normalizeTemplateEditorContent(c.PostForm("template_content"))
	removeLogo := c.PostForm("remove_logo") == "true"
	validationErrors := handlers.FieldErrors{}
	handlers.ValidateFieldLength(validationErrors, "name", "Nama template", name, 120)
	handlers.ValidateFieldLength(validationErrors, "template_content", "Isi template", templateContent, 20000)
	handlers.ValidateFieldLength(validationErrors, "header_text", "Header template", headerText, 4000)
	handlers.ValidateFieldLength(validationErrors, "footer_text", "Footer template", footerText, 4000)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	db := middleware.GetDB(c)
	repo := newTemplatesRepository(db)
	template, err := repo.GetLetterTemplateByID(id)
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
	existingTemplateContent := normalizeTemplateEditorContent(handlers.FirstString(template.TemplateContent, ""))
	if templateContent == "" {
		templateContent = existingTemplateContent
	}
	if _, err := c.FormFile("template_file"); err == nil {
		path, meta, err := handlers.SaveUploadedFile(c, "template_file", "letter-templates")
		if err == nil {
			filePath = path
			fileName = meta.OriginalName
			if templateContent == "" {
				templateContent = resolveTemplateEditorContentFromStorage(c, filePath)
			}
		}
	} else if templateContent != "" && (templateContent != existingTemplateContent || filePath == "") {
		path, generatedFileName, genErr := generateTemplateFileFromContent(c, name, templateContent)
		if genErr != nil {
			handlers.JSONError(c, http.StatusInternalServerError, "Gagal memperbarui file template")
			return
		}
		filePath = path
		fileName = generatedFileName
	}

	if filePath == "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"template_content": "Isi template wajib diisi."})
		return
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

	_ = repo.UpdateLetterTemplate(dbrepo.LetterTemplateUpdateInput{
		ID:              id,
		Name:            name,
		FilePath:        filePath,
		FileName:        fileName,
		TemplateContent: templateContent,
		HeaderText:      headerText,
		FooterText:      footerText,
		LogoPath:        logoPath,
		UpdatedAt:       time.Now(),
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
	repo := newTemplatesRepository(db)

	template, _ := repo.GetLetterTemplateByID(id)
	_ = repo.DeleteLetterTemplateByID(id)

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

func buildTemplateListItem(c *gin.Context, db *sqlx.DB, template *models.LetterTemplate) dto.LetterTemplateListItem {
	return dto.LetterTemplateListItem{
		ID:              template.ID,
		Name:            template.Name,
		FileName:        template.FileName,
		TemplateContent: resolveTemplateEditorContent(c, template),
		HeaderText:      template.HeaderText,
		FooterText:      template.FooterText,
		LogoURL:         handlers.AttachmentURL(c, template.LogoPath),
		IsActive:        template.IsActive,
		CreatedBy:       handlers.LookupUserName(db, derefInt64(template.CreatedBy)),
		CreatedAt:       handlers.FormatDateTime(template.CreatedAt),
	}
}

func resolveTemplateEditorContent(c *gin.Context, template *models.LetterTemplate) *string {
	if template == nil {
		return nil
	}

	content := normalizeTemplateEditorContent(handlers.FirstString(template.TemplateContent, ""))
	if content == "" && template.FilePath != "" {
		content = resolveTemplateEditorContentFromStorage(c, template.FilePath)
	}
	if content == "" {
		return nil
	}

	return &content
}

func resolveTemplateEditorContentFromStorage(c *gin.Context, relPath string) string {
	normalizedTemplatePath := handlers.NormalizeAttachmentPath(relPath)
	templatePath, ok := resolveStorageFilePath(middleware.GetConfig(c).StoragePath, normalizedTemplatePath)
	if !ok {
		return ""
	}

	readTemplatePath, cleanupReadTemplate, prepErr := services.PrepareFileForRead(
		templatePath,
		middleware.GetConfig(c).StorageEncryptionKey,
	)
	if prepErr != nil {
		return ""
	}
	defer cleanupReadTemplate()

	content, err := services.ExtractDocxText(readTemplatePath)
	if err != nil {
		return ""
	}

	return cleanExtractedTemplateContent(content)
}

func cleanExtractedTemplateContent(content string) string {
	normalized := normalizeTemplateEditorContent(content)
	if normalized == "" {
		return ""
	}

	lines := strings.Split(normalized, "\n")
	cleaned := make([]string, 0, len(lines))
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		switch trimmed {
		case "${logo}", "{{logo}}", "${header}", "{{header}}", "${footer}", "{{footer}}":
			continue
		default:
			cleaned = append(cleaned, line)
		}
	}

	return strings.TrimSpace(strings.Join(cleaned, "\n"))
}

func generateTemplateFileFromContent(c *gin.Context, name string, templateContent string) (string, string, error) {
	cfg := middleware.GetConfig(c)
	safeName := sanitizeFilename(strings.TrimSpace(name))
	safeName = strings.TrimSuffix(safeName, ".docx")
	if safeName == "" {
		safeName = "template_surat"
	}

	displayFileName := safeName + ".docx"
	storedFileName := fmt.Sprintf("%s_%s", time.Now().Format("20060102_150405"), displayFileName)
	relPath := filepath.ToSlash(filepath.Join("letter-templates", storedFileName))
	absPath := filepath.Join(cfg.StoragePath, relPath)
	if err := os.MkdirAll(filepath.Dir(absPath), 0o755); err != nil {
		return "", "", err
	}

	tempFile, err := os.CreateTemp("", "letter_template_*.docx")
	if err != nil {
		return "", "", err
	}
	tempPath := tempFile.Name()
	tempFile.Close()
	defer os.Remove(tempPath)

	if err := services.GenerateSimpleDocx(services.BuildTemplateDocxLines(templateContent), tempPath); err != nil {
		return "", "", err
	}
	if err := copyFile(tempPath, absPath); err != nil {
		return "", "", err
	}
	if cfg.StorageEncryptUploads && cfg.StorageEncryptionKey != "" {
		if err := services.EncryptFileInPlace(absPath, cfg.StorageEncryptionKey); err != nil {
			_ = os.Remove(absPath)
			return "", "", err
		}
	}

	return relPath, displayFileName, nil
}

func normalizeTemplateEditorContent(value string) string {
	normalized := strings.ReplaceAll(value, "\r\n", "\n")
	normalized = strings.ReplaceAll(normalized, "\r", "\n")
	return strings.TrimSpace(normalized)
}
