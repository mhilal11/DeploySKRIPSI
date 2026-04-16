package superadmin

import (
	"bytes"
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
	"github.com/jung-kurt/gofpdf"
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
		"",
		"Nomor: ${nomor_surat}",
		"Tanggal: ${tanggal}",
		"Pengirim: ${pengirim}",
		"Divisi Pengirim: ${divisi_pengirim}",
		"",
		"Kepada Yth.",
		"${penerima}",
		"",
		"Perihal: ${perihal}",
		"Prioritas: ${prioritas}",
		"",
		"Dengan hormat,",
		"${isi_surat}",
		"",
		"Demikian disampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.",
		"",
		"Catatan Disposisi: ${catatan_disposisi}",
		"Tanggal Disposisi: ${tanggal_disposisi}",
		"Diproses oleh: ${oleh}",
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
		path, meta, saveErr := handlers.SaveValidatedUploadedFile(c, "template_file", "letter-templates", handlers.TemplateUploadRules())
		if saveErr != nil {
			handlers.ValidationErrors(c, handlers.FieldErrors{"template_file": "File template harus berupa DOCX dengan ukuran maksimal 5MB."})
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
		path, _, saveErr := handlers.SaveValidatedUploadedFile(c, "logo_file", "letter-templates/logos", handlers.ImageUploadRules())
		if saveErr != nil {
			handlers.ValidationErrors(c, handlers.FieldErrors{"logo_file": "Logo harus berupa PNG atau JPG/JPEG dengan ukuran maksimal 5MB."})
			return
		}
		logoPath = &path
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

func SuperAdminTemplatesPreviewPDF(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	templateID := int64(0)
	if rawID := strings.TrimSpace(c.PostForm("template_id")); rawID != "" {
		parsedID, err := strconv.ParseInt(rawID, 10, 64)
		if err != nil || parsedID <= 0 {
			handlers.JSONError(c, http.StatusBadRequest, "ID template tidak valid")
			return
		}
		templateID = parsedID
	}

	db := middleware.GetDB(c)
	repo := newTemplatesRepository(db)

	var existingTemplate *models.LetterTemplate
	if templateID > 0 {
		template, err := repo.GetLetterTemplateByID(templateID)
		if err != nil || template == nil {
			handlers.JSONError(c, http.StatusNotFound, "Template tidak ditemukan")
			return
		}
		existingTemplate = template
	}

	headerText := strings.TrimSpace(c.PostForm("header_text"))
	footerText := strings.TrimSpace(c.PostForm("footer_text"))
	templateContent := normalizeTemplateEditorContent(c.PostForm("template_content"))
	if headerText == "" && existingTemplate != nil {
		headerText = strings.TrimSpace(handlers.FirstString(existingTemplate.HeaderText, ""))
	}
	if footerText == "" && existingTemplate != nil {
		footerText = strings.TrimSpace(handlers.FirstString(existingTemplate.FooterText, ""))
	}
	if templateContent == "" && existingTemplate != nil {
		templateContent = strings.TrimSpace(handlers.FirstString(resolveTemplateEditorContent(c, existingTemplate), ""))
	}
	if templateContent == "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{
			"template_content": "Isi template wajib diisi sebelum preview PDF dibuat.",
		})
		return
	}

	logoPath, cleanupLogo, err := resolveTemplatePreviewLogo(c, existingTemplate)
	if err != nil {
		handlers.JSONError(c, http.StatusUnprocessableEntity, "Logo tidak dapat diproses untuk preview PDF.")
		return
	}
	if cleanupLogo != nil {
		defer cleanupLogo()
	}

	replacements := templatePreviewReplacements()
	previewData := buildModernLetterPreviewData(templateContent, headerText, footerText, replacements)

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(16, 16, 16)
	pdf.SetAutoPageBreak(true, 16)
	pdf.AddPage()

	drawModernLetterPDF(pdf, logoPath, previewData)

	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal membuat preview PDF template.")
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", `inline; filename="template-preview.pdf"`)
	c.Data(http.StatusOK, "application/pdf", out.Bytes())
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
		path, meta, saveErr := handlers.SaveValidatedUploadedFile(c, "template_file", "letter-templates", handlers.TemplateUploadRules())
		if saveErr != nil {
			handlers.ValidationErrors(c, handlers.FieldErrors{"template_file": "File template harus berupa DOCX dengan ukuran maksimal 5MB."})
			return
		}
		filePath = path
		fileName = meta.OriginalName
		if templateContent == "" {
			templateContent = resolveTemplateEditorContentFromStorage(c, filePath)
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
		path, _, saveErr := handlers.SaveValidatedUploadedFile(c, "logo_file", "letter-templates/logos", handlers.ImageUploadRules())
		if saveErr != nil {
			handlers.ValidationErrors(c, handlers.FieldErrors{"logo_file": "Logo harus berupa PNG atau JPG/JPEG dengan ukuran maksimal 5MB."})
			return
		}
		logoPath = &path
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

func templatePreviewReplacements() map[string]string {
	replacements := map[string]string{
		"{{nomor_surat}}":       "003/COR/2026",
		"{{tanggal}}":           "07 Februari 2026",
		"{{pengirim}}":          "Akbar",
		"{{divisi_pengirim}}":   "Corporate",
		"{{penerima}}":          "Government and Partner",
		"{{perihal}}":           "Undangan Kolaborasi",
		"{{isi_surat}}":         "Sehubungan dengan rencana sinergi antara PT. Lintas Data Prima dan pihak Government and Partner, kami mengundang Bapak/Ibu untuk mendiskusikan peluang kolaborasi, ruang lingkup kerja sama, serta rencana tindak lanjut yang dapat memberikan nilai tambah bagi kedua belah pihak.\n\nWaktu pelaksanaan dan detail agenda dapat disesuaikan dengan ketersediaan pihak terkait. Template ini dapat dipakai ulang untuk surat undangan, nota dinas, surat pengantar, maupun disposisi internal hanya dengan mengganti metadata dan isi utama surat.",
		"{{prioritas}}":         "High",
		"{{catatan_disposisi}}": "OK, lanjutkan ke Government and Partner untuk koordinasi agenda dan tindak lanjut awal.",
		"{{tanggal_disposisi}}": "-",
		"{{oleh}}":              "HR Admin",
	}

	for key, value := range replacements {
		replacements[strings.ReplaceAll(strings.ReplaceAll(key, "{{", "${"), "}}", "}")] = value
	}

	return replacements
}

func renderTemplatePreviewText(content string, replacements map[string]string) string {
	output := content
	for key, value := range replacements {
		output = strings.ReplaceAll(output, key, value)
	}
	return strings.TrimSpace(output)
}

func resolveTemplatePreviewLogo(c *gin.Context, template *models.LetterTemplate) (string, func(), error) {
	if removeLogo := c.PostForm("remove_logo") == "true"; removeLogo {
		return "", nil, nil
	}

	if _, err := c.FormFile("logo_file"); err == nil {
		return savePreviewUploadToTemp(c, "logo_file")
	}

	if template == nil || template.LogoPath == nil || strings.TrimSpace(*template.LogoPath) == "" {
		return "", nil, nil
	}

	normalizedLogoPath := handlers.NormalizeAttachmentPath(*template.LogoPath)
	logoPath, ok := resolveStorageFilePath(middleware.GetConfig(c).StoragePath, normalizedLogoPath)
	if !ok {
		return "", nil, nil
	}

	readPath, cleanup, err := services.PrepareFileForRead(
		logoPath,
		middleware.GetConfig(c).StorageEncryptionKey,
	)
	if err != nil {
		return "", nil, err
	}

	return readPath, cleanup, nil
}

func savePreviewUploadToTemp(c *gin.Context, field string) (string, func(), error) {
	fileHeader, err := c.FormFile(field)
	if err != nil {
		return "", nil, err
	}
	if _, err := handlers.ValidateUploadedFileHeader(fileHeader, handlers.ImageUploadRules()); err != nil {
		return "", nil, err
	}

	source, err := fileHeader.Open()
	if err != nil {
		return "", nil, err
	}
	defer source.Close()

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext == "" {
		ext = ".tmp"
	}

	tempFile, err := os.CreateTemp("", "template_preview_logo_*"+ext)
	if err != nil {
		return "", nil, err
	}
	tempPath := tempFile.Name()

	if _, err := tempFile.ReadFrom(source); err != nil {
		tempFile.Close()
		_ = os.Remove(tempPath)
		return "", nil, err
	}
	if err := tempFile.Close(); err != nil {
		_ = os.Remove(tempPath)
		return "", nil, err
	}

	return tempPath, func() {
		_ = os.Remove(tempPath)
	}, nil
}

type modernLetterPreviewData struct {
	BodyParagraphs  []string
	DispositionDate string
	DispositionNote string
	FooterLines     []string
	HeaderLines     []string
	NomorSurat      string
	Priority        string
	ProcessedBy     string
	Recipient       string
	Sender          string
	SenderDivision  string
	Subject         string
	Tanggal         string
}

func buildModernLetterPreviewData(content, headerText, footerText string, replacements map[string]string) modernLetterPreviewData {
	renderedContent := renderTemplatePreviewText(content, replacements)
	renderedHeader := renderTemplatePreviewText(headerText, replacements)
	renderedFooter := renderTemplatePreviewText(footerText, replacements)
	bodyParagraphs := extractModernLetterBodyParagraphs(renderedContent)
	if len(bodyParagraphs) == 0 {
		bodyParagraphs = normalizePreviewParagraphs(splitPreviewParagraphs(firstReplacementValue(replacements, "{{isi_surat}}", "${isi_surat}", "-")))
	}

	return modernLetterPreviewData{
		BodyParagraphs:  bodyParagraphs,
		DispositionDate: firstReplacementValue(replacements, "{{tanggal_disposisi}}", "${tanggal_disposisi}", "-"),
		DispositionNote: firstReplacementValue(replacements, "{{catatan_disposisi}}", "${catatan_disposisi}", "-"),
		FooterLines:     splitNonEmptyLines(renderedFooter),
		HeaderLines:     splitNonEmptyLines(renderedHeader),
		NomorSurat:      firstReplacementValue(replacements, "{{nomor_surat}}", "${nomor_surat}", "-"),
		Priority:        firstReplacementValue(replacements, "{{prioritas}}", "${prioritas}", "-"),
		ProcessedBy:     firstReplacementValue(replacements, "{{oleh}}", "${oleh}", "-"),
		Recipient:       firstReplacementValue(replacements, "{{penerima}}", "${penerima}", "-"),
		Sender:          firstReplacementValue(replacements, "{{pengirim}}", "${pengirim}", "-"),
		SenderDivision:  firstReplacementValue(replacements, "{{divisi_pengirim}}", "${divisi_pengirim}", "-"),
		Subject:         firstReplacementValue(replacements, "{{perihal}}", "${perihal}", "-"),
		Tanggal:         firstReplacementValue(replacements, "{{tanggal}}", "${tanggal}", "-"),
	}
}

func firstReplacementValue(replacements map[string]string, keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(replacements[key]); value != "" {
			return value
		}
	}
	return "-"
}

func splitNonEmptyLines(value string) []string {
	normalized := normalizeTemplateEditorContent(value)
	if normalized == "" {
		return nil
	}

	parts := strings.Split(normalized, "\n")
	lines := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			lines = append(lines, trimmed)
		}
	}
	return lines
}

func startsWithPreviewLabel(line, label string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(line)), strings.ToLower(label)+":")
}

func isKnownPreviewSectionLine(line string) bool {
	normalized := strings.ToLower(strings.TrimSpace(line))
	if normalized == "" {
		return false
	}

	return normalized == "kepada yth." ||
		normalized == "kepada yth" ||
		startsWithPreviewLabel(line, "Nomor") ||
		startsWithPreviewLabel(line, "Tanggal") ||
		startsWithPreviewLabel(line, "Pengirim") ||
		startsWithPreviewLabel(line, "Divisi Pengirim") ||
		startsWithPreviewLabel(line, "Perihal") ||
		startsWithPreviewLabel(line, "Prioritas") ||
		startsWithPreviewLabel(line, "Catatan Disposisi") ||
		startsWithPreviewLabel(line, "Tanggal Disposisi") ||
		startsWithPreviewLabel(line, "Diproses oleh") ||
		startsWithPreviewLabel(line, "Oleh")
}

func splitPreviewParagraphs(value string) []string {
	normalized := normalizeTemplateEditorContent(value)
	if normalized == "" {
		return nil
	}

	lines := strings.Split(normalized, "\n")
	paragraphs := make([]string, 0, len(lines))
	current := make([]string, 0, 2)
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			if len(current) > 0 {
				paragraphs = append(paragraphs, strings.Join(current, " "))
				current = current[:0]
			}
			continue
		}
		current = append(current, trimmed)
	}
	if len(current) > 0 {
		paragraphs = append(paragraphs, strings.Join(current, " "))
	}

	return paragraphs
}

func normalizePreviewParagraphs(paragraphs []string) []string {
	normalized := make([]string, 0, len(paragraphs))
	for _, paragraph := range paragraphs {
		trimmed := strings.TrimSpace(paragraph)
		lower := strings.ToLower(trimmed)
		opening := "dengan hormat,"
		if strings.HasPrefix(lower, opening) && len(trimmed) > len(opening) {
			normalized = append(normalized, "Dengan hormat,")
			remaining := strings.TrimSpace(trimmed[len(opening):])
			if remaining != "" {
				normalized = append(normalized, remaining)
			}
			continue
		}

		if trimmed != "" {
			normalized = append(normalized, trimmed)
		}
	}

	return normalized
}

func extractModernLetterBodyParagraphs(renderedContent string) []string {
	normalized := normalizeTemplateEditorContent(renderedContent)
	if normalized == "" {
		return nil
	}

	lines := strings.Split(normalized, "\n")
	bodyLines := make([]string, 0, len(lines))
	skipRecipientBlock := false
	skipDispositionBlock := false

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			if skipRecipientBlock || skipDispositionBlock {
				skipRecipientBlock = false
				skipDispositionBlock = false
			}
			bodyLines = append(bodyLines, "")
			continue
		}

		if skipRecipientBlock {
			if isKnownPreviewSectionLine(trimmed) {
				skipRecipientBlock = false
			} else {
				continue
			}
		}

		if skipDispositionBlock {
			if isKnownPreviewSectionLine(trimmed) {
				skipDispositionBlock = false
			} else {
				continue
			}
		}

		lower := strings.ToLower(trimmed)
		if lower == "kepada yth." || lower == "kepada yth" {
			skipRecipientBlock = true
			continue
		}

		if startsWithPreviewLabel(trimmed, "Catatan Disposisi") {
			parts := strings.SplitN(trimmed, ":", 2)
			if len(parts) < 2 || strings.TrimSpace(parts[1]) == "" {
				skipDispositionBlock = true
			}
			continue
		}

		if isKnownPreviewSectionLine(trimmed) {
			continue
		}

		bodyLines = append(bodyLines, trimmed)
	}

	return normalizePreviewParagraphs(splitPreviewParagraphs(strings.Join(bodyLines, "\n")))
}

func ensurePDFSpace(pdf *gofpdf.Fpdf, height float64) {
	_, pageHeight := pdf.GetPageSize()
	_, _, _, bottom := pdf.GetMargins()
	if pdf.GetY()+height > pageHeight-bottom {
		pdf.AddPage()
	}
}

func measurePDFTextHeight(pdf *gofpdf.Fpdf, text string, width, lineHeight float64) float64 {
	normalized := strings.ReplaceAll(text, "\r\n", "\n")
	normalized = strings.ReplaceAll(normalized, "\r", "\n")
	if strings.TrimSpace(normalized) == "" {
		return lineHeight
	}

	totalLines := 0
	for _, rawLine := range strings.Split(normalized, "\n") {
		line := strings.TrimSpace(rawLine)
		if line == "" {
			totalLines++
			continue
		}
		split := pdf.SplitLines([]byte(line), width)
		if len(split) == 0 {
			totalLines++
			continue
		}
		totalLines += len(split)
	}

	if totalLines == 0 {
		totalLines = 1
	}

	return float64(totalLines) * lineHeight
}

func drawMiniInfoBox(pdf *gofpdf.Fpdf, x, y, w, h float64, label, value string) {
	pdf.SetDrawColor(228, 234, 241)
	pdf.SetFillColor(251, 252, 254)
	pdf.Rect(x, y, w, h, "FD")
	pdf.SetXY(x+3, y+3)
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(102, 112, 133)
	pdf.MultiCell(w-6, 4, strings.ToUpper(label), "", "L", false)
	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(19, 34, 56)
	pdf.SetX(x + 3)
	pdf.MultiCell(w-6, 5, firstNonEmptyText(value, "-"), "", "L", false)
}

func drawModernLetterPDF(pdf *gofpdf.Fpdf, logoPath string, data modernLetterPreviewData) {
	left, top, right, _ := pdf.GetMargins()
	pageWidth, _ := pdf.GetPageSize()
	contentWidth := pageWidth - left - right

	pdf.SetFillColor(91, 59, 140)
	pdf.Rect(left, top, contentWidth*0.74, 4, "F")
	pdf.SetFillColor(240, 180, 0)
	pdf.Rect(left+contentWidth*0.74, top, contentWidth*0.26, 4, "F")
	pdf.SetY(top + 7)

	headerY := pdf.GetY()
	headerBottom := headerY
	if strings.TrimSpace(logoPath) != "" {
		options := gofpdf.ImageOptions{
			ImageType: strings.TrimPrefix(strings.ToUpper(filepath.Ext(logoPath)), "."),
			ReadDpi:   true,
		}
		pdf.SetDrawColor(231, 221, 243)
		pdf.SetFillColor(248, 245, 252)
		pdf.Rect(left, headerY, 18, 18, "FD")
		pdf.ImageOptions(logoPath, left+2.5, headerY+2.5, 13, 13, false, options, 0, "")
		headerBottom = headerY + 18
	} else {
		pdf.SetDrawColor(231, 221, 243)
		pdf.SetFillColor(248, 245, 252)
		pdf.Rect(left, headerY, 18, 18, "FD")
		pdf.SetXY(left, headerY+5)
		pdf.SetFont("Arial", "B", 15)
		pdf.SetTextColor(91, 59, 140)
		pdf.CellFormat(18, 6, "dp", "", 0, "C", false, 0, "")
		headerBottom = headerY + 18
	}

	headerTextX := left + 22
	chipWidth := 24.0
	headerTextWidth := contentWidth - 22 - chipWidth - 4
	if len(data.HeaderLines) > 0 {
		pdf.SetXY(headerTextX, headerY)
		pdf.SetFont("Arial", "B", 15)
		pdf.SetTextColor(19, 34, 56)
		pdf.MultiCell(headerTextWidth, 6, data.HeaderLines[0], "", "L", false)
		if len(data.HeaderLines) > 1 {
			pdf.SetFont("Arial", "", 8.8)
			pdf.SetTextColor(102, 112, 133)
			for _, line := range data.HeaderLines[1:] {
				pdf.SetX(headerTextX)
				pdf.MultiCell(headerTextWidth, 4.5, line, "", "L", false)
			}
		}
		if pdf.GetY() > headerBottom {
			headerBottom = pdf.GetY()
		}
	}

	pdf.SetDrawColor(231, 221, 243)
	pdf.SetFillColor(239, 233, 248)
	pdf.Rect(left+contentWidth-chipWidth, headerY+1, chipWidth, 8, "FD")
	pdf.SetXY(left+contentWidth-chipWidth, headerY+3)
	pdf.SetFont("Arial", "B", 8.5)
	pdf.SetTextColor(91, 59, 140)
	pdf.CellFormat(chipWidth, 3, "HRIS LDP", "", 0, "C", false, 0, "")
	if headerY+9 > headerBottom {
		headerBottom = headerY + 9
	}

	pdf.SetDrawColor(217, 224, 234)
	pdf.Line(left, headerBottom+3, pageWidth-right, headerBottom+3)
	pdf.SetY(headerBottom + 8)

	metaY := pdf.GetY()
	leftCardWidth := contentWidth * 0.6
	rightCardWidth := contentWidth - leftCardWidth - 4
	pdf.SetFont("Arial", "", 9.5)
	recipientHeight := measurePDFTextHeight(pdf, firstNonEmptyText(data.Recipient, "-"), rightCardWidth-12, 5)
	cardHeight := 33.0
	if calculated := 21.0 + recipientHeight; calculated > cardHeight {
		cardHeight = calculated
	}
	pdf.SetDrawColor(217, 224, 234)
	pdf.Rect(left, metaY, leftCardWidth, cardHeight, "D")
	pdf.SetFillColor(246, 248, 251)
	pdf.Rect(left+leftCardWidth+4, metaY, rightCardWidth, cardHeight, "FD")

	pdf.SetXY(left+4, metaY+4)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(102, 112, 133)
	pdf.CellFormat(leftCardWidth-8, 4, "INFORMASI SURAT", "", 0, "L", false, 0, "")

	infoRows := [][2]string{
		{"Nomor", data.NomorSurat},
		{"Tanggal", data.Tanggal},
		{"Pengirim", data.Sender},
		{"Divisi Pengirim", data.SenderDivision},
	}
	rowY := metaY + 10
	for _, row := range infoRows {
		pdf.SetXY(left+4, rowY)
		pdf.SetFont("Arial", "", 8.5)
		pdf.SetTextColor(102, 112, 133)
		pdf.CellFormat(28, 4.5, row[0], "", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "B", 9)
		pdf.SetTextColor(19, 34, 56)
		pdf.CellFormat(leftCardWidth-36, 4.5, ": "+firstNonEmptyText(row[1], "-"), "", 0, "L", false, 0, "")
		rowY += 5.2
	}

	rightX := left + leftCardWidth + 8
	pdf.SetXY(rightX, metaY+4)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(102, 112, 133)
	pdf.CellFormat(rightCardWidth-8, 4, "TUJUAN SURAT", "", 0, "L", false, 0, "")
	pdf.SetXY(rightX, metaY+11)
	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(19, 34, 56)
	pdf.CellFormat(rightCardWidth-8, 5, "Kepada Yth.", "", 0, "L", false, 0, "")
	pdf.SetXY(rightX, metaY+17)
	pdf.SetFont("Arial", "", 9.5)
	pdf.SetTextColor(36, 52, 71)
	pdf.MultiCell(rightCardWidth-12, 5, firstNonEmptyText(data.Recipient, "-"), "", "L", false)

	pdf.SetY(metaY + cardHeight + 5)
	subjectY := pdf.GetY()
	pdf.SetFont("Arial", "B", 13)
	subjectHeight := measurePDFTextHeight(pdf, firstNonEmptyText(data.Subject, "-"), contentWidth-48, 5.5) + 10
	if subjectHeight < 16 {
		subjectHeight = 16
	}
	pdf.SetDrawColor(231, 221, 243)
	pdf.SetFillColor(250, 247, 255)
	pdf.Rect(left, subjectY, contentWidth, subjectHeight, "FD")
	pdf.SetXY(left+4, subjectY+3)
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(102, 112, 133)
	pdf.CellFormat(50, 4, "PERIHAL", "", 0, "L", false, 0, "")
	pdf.SetXY(left+4, subjectY+7.5)
	pdf.SetFont("Arial", "B", 13)
	pdf.SetTextColor(23, 43, 77)
	pdf.MultiCell(contentWidth-40, 5.5, firstNonEmptyText(data.Subject, "-"), "", "L", false)

	pdf.SetFillColor(253, 236, 234)
	pdf.SetDrawColor(247, 197, 191)
	pdf.Rect(left+contentWidth-38, subjectY+3, 34, 8, "FD")
	pdf.SetXY(left+contentWidth-37, subjectY+5.5)
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetTextColor(180, 35, 24)
	pdf.CellFormat(32, 2.5, "PRIORITAS: "+strings.ToUpper(firstNonEmptyText(data.Priority, "-")), "", 0, "C", false, 0, "")

	pdf.SetY(subjectY + subjectHeight + 5)
	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(36, 52, 71)
	for index, paragraph := range data.BodyParagraphs {
		pdf.SetFont("Arial", "", 10)
		align := "J"
		if index == 0 || index == len(data.BodyParagraphs)-1 {
			align = "L"
			pdf.SetFont("Arial", "B", 10)
		}
		ensurePDFSpace(pdf, measurePDFTextHeight(pdf, paragraph, contentWidth, 6)+2)
		pdf.MultiCell(0, 6, paragraph, "", align, false)
		pdf.Ln(1)
	}

	noteWidth := contentWidth - 50
	pdf.SetFont("Arial", "", 9)
	noteTextHeight := measurePDFTextHeight(pdf, firstNonEmptyText(data.DispositionNote, "-"), noteWidth-8, 4.5)
	noteHeight := 13.0 + noteTextHeight
	if noteHeight < 22 {
		noteHeight = 22
	}

	signX := left + noteWidth + 6
	signWidth := contentWidth - noteWidth - 6
	pdf.SetFont("Arial", "", 8.8)
	signMetaHeight := measurePDFTextHeight(pdf, firstNonEmptyText(data.SenderDivision, "-")+" - PT. Lintas Data Prima", signWidth, 4.5)
	signHeight := 20.0 + signMetaHeight
	if signHeight < noteHeight {
		signHeight = noteHeight
	}

	ensurePDFSpace(pdf, signHeight+8)
	signatureY := pdf.GetY() + 2
	pdf.SetDrawColor(183, 235, 207)
	pdf.SetFillColor(236, 253, 243)
	pdf.Rect(left, signatureY, noteWidth, noteHeight, "FD")
	pdf.SetXY(left+4, signatureY+4)
	pdf.SetFont("Arial", "B", 9.5)
	pdf.SetTextColor(16, 91, 60)
	pdf.CellFormat(noteWidth-8, 4, "Catatan disposisi:", "", 0, "L", false, 0, "")
	pdf.SetXY(left+4, signatureY+9)
	pdf.SetFont("Arial", "", 9)
	pdf.MultiCell(noteWidth-8, 4.5, firstNonEmptyText(data.DispositionNote, "-"), "", "L", false)

	pdf.SetDrawColor(217, 224, 234)
	pdf.Line(signX, signatureY+16, signX+signWidth, signatureY+16)
	pdf.SetXY(signX, signatureY+17.5)
	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(19, 34, 56)
	pdf.CellFormat(signWidth, 4, firstNonEmptyText(data.Sender, "-"), "", 0, "L", false, 0, "")
	pdf.SetXY(signX, signatureY+22)
	pdf.SetFont("Arial", "", 8.8)
	pdf.SetTextColor(102, 112, 133)
	pdf.MultiCell(signWidth, 4.5, firstNonEmptyText(data.SenderDivision, "-")+" - PT. Lintas Data Prima", "", "L", false)

	signatureBottom := signatureY + noteHeight
	if signCandidate := signatureY + signHeight; signCandidate > signatureBottom {
		signatureBottom = signCandidate
	}

	pdf.SetY(signatureBottom + 6)
	leftDispWidth := contentWidth * 0.62
	pdf.SetFont("Arial", "", 9)
	dispositionTextHeight := measurePDFTextHeight(pdf, firstNonEmptyText(data.DispositionNote, "-"), leftDispWidth-14, 4.5)
	leftDispositionBoxHeight := 9.0 + dispositionTextHeight
	if leftDispositionBoxHeight < 21 {
		leftDispositionBoxHeight = 21
	}
	rightBoxHeight := 14.0
	rightColumnHeight := (rightBoxHeight * 3) + 5.0
	dispositionHeight := 16.0 + leftDispositionBoxHeight
	if calculated := 12.0 + rightColumnHeight; calculated > dispositionHeight {
		dispositionHeight = calculated
	}
	ensurePDFSpace(pdf, dispositionHeight+8)
	dispositionY := pdf.GetY()
	pdf.SetDrawColor(217, 224, 234)
	pdf.Rect(left, dispositionY, contentWidth, dispositionHeight, "D")
	pdf.SetFillColor(248, 250, 252)
	pdf.Rect(left, dispositionY, contentWidth, 9, "FD")
	pdf.SetXY(left+4, dispositionY+3)
	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(19, 34, 56)
	pdf.CellFormat(60, 3, "Catatan Disposisi", "", 0, "L", false, 0, "")
	pdf.SetFillColor(239, 233, 248)
	pdf.Rect(left+contentWidth-36, dispositionY+2, 32, 5, "FD")
	pdf.SetXY(left+contentWidth-36, dispositionY+3.5)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetTextColor(91, 59, 140)
	pdf.CellFormat(32, 2, "INTERNAL FOLLOW-UP", "", 0, "C", false, 0, "")

	contentY := dispositionY + 12
	pdf.SetXY(left+4, contentY)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(102, 112, 133)
	pdf.CellFormat(leftDispWidth-8, 4, "ARAHAN / TINDAK LANJUT", "", 0, "L", false, 0, "")
	pdf.SetDrawColor(200, 210, 223)
	pdf.SetFillColor(251, 252, 254)
	pdf.Rect(left+4, contentY+5, leftDispWidth-8, leftDispositionBoxHeight, "FD")
	pdf.SetXY(left+7, contentY+9)
	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(36, 52, 71)
	pdf.MultiCell(leftDispWidth-14, 4.5, firstNonEmptyText(data.DispositionNote, "-"), "", "L", false)

	boxX := left + leftDispWidth + 2
	boxWidth := contentWidth - leftDispWidth - 6
	drawMiniInfoBox(pdf, boxX, contentY, boxWidth, rightBoxHeight, "Tanggal Disposisi", data.DispositionDate)
	drawMiniInfoBox(pdf, boxX, contentY+rightBoxHeight+2.5, boxWidth, rightBoxHeight, "Diproses oleh", data.ProcessedBy)
	drawMiniInfoBox(pdf, boxX, contentY+(rightBoxHeight*2)+5, boxWidth, rightBoxHeight, "Prioritas", strings.ToUpper(firstNonEmptyText(data.Priority, "-")))

	pdf.SetY(dispositionY + dispositionHeight + 5)
	if len(data.FooterLines) > 0 {
		ensurePDFSpace(pdf, 12)
		pdf.SetDrawColor(217, 224, 234)
		pdf.Line(left, pdf.GetY(), pageWidth-right, pdf.GetY())
		pdf.Ln(4)
		pdf.SetFont("Arial", "B", 8.5)
		pdf.SetTextColor(52, 64, 84)
		pdf.CellFormat(contentWidth*0.62, 4, data.FooterLines[0], "", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "", 8.5)
		pdf.SetTextColor(102, 112, 133)
		remainingFooter := ""
		if len(data.FooterLines) > 1 {
			remainingFooter = strings.Join(data.FooterLines[1:], "\n")
		}
		pdf.MultiCell(contentWidth-(contentWidth*0.62), 4, remainingFooter, "", "R", false)
	}
}
