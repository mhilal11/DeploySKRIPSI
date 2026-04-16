package handlers

import (
	"archive/zip"
	"bytes"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
)

const (
	MaxCommonUploadSizeBytes = 5 * 1024 * 1024
)

var (
	ErrUploadTooLarge     = errors.New("ukuran file melebihi batas maksimum")
	ErrUploadExtension    = errors.New("ekstensi file tidak diperbolehkan")
	ErrUploadMime         = errors.New("mime type file tidak diperbolehkan")
	ErrUploadSignature    = errors.New("signature file tidak valid")
	ErrUploadContent      = errors.New("konten file tidak valid")
	ErrUploadEmptyFile    = errors.New("file kosong")
	imageUploadRules      = UploadValidationOptions{MaxSizeBytes: MaxCommonUploadSizeBytes, AllowedExtensions: []string{".png", ".jpg", ".jpeg"}, AllowedMIMEs: []string{"image/png", "image/jpeg"}, AllowedKinds: []string{"png", "jpeg"}}
	documentUploadRules   = UploadValidationOptions{MaxSizeBytes: MaxCommonUploadSizeBytes, AllowedExtensions: []string{".pdf", ".doc", ".docx"}, AllowedMIMEs: []string{"application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"}, AllowedKinds: []string{"pdf", "doc", "docx"}}
	pdfUploadRules        = UploadValidationOptions{MaxSizeBytes: MaxCommonUploadSizeBytes, AllowedExtensions: []string{".pdf"}, AllowedMIMEs: []string{"application/pdf", "application/octet-stream"}, AllowedKinds: []string{"pdf"}}
	imageOrPDFUploadRules = UploadValidationOptions{MaxSizeBytes: MaxCommonUploadSizeBytes, AllowedExtensions: []string{".png", ".jpg", ".jpeg", ".pdf"}, AllowedMIMEs: []string{"image/png", "image/jpeg", "application/pdf", "application/octet-stream"}, AllowedKinds: []string{"png", "jpeg", "pdf"}}
	templateUploadRules   = UploadValidationOptions{MaxSizeBytes: MaxCommonUploadSizeBytes, AllowedExtensions: []string{".docx"}, AllowedMIMEs: []string{"application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"}, AllowedKinds: []string{"docx"}}
)

type UploadValidationOptions struct {
	MaxSizeBytes      int64
	AllowedExtensions []string
	AllowedMIMEs      []string
	AllowedKinds      []string
}

type validatedUpload struct {
	fileHeader *multipart.FileHeader
	meta       *UploadMeta
}

type SavedUpload struct {
	Path string
	Meta *UploadMeta
}

func ImageUploadRules() UploadValidationOptions {
	return imageUploadRules
}

func DocumentUploadRules() UploadValidationOptions {
	return documentUploadRules
}

func PDFUploadRules() UploadValidationOptions {
	return pdfUploadRules
}

func ImageOrPDFUploadRules() UploadValidationOptions {
	return imageOrPDFUploadRules
}

func TemplateUploadRules() UploadValidationOptions {
	return templateUploadRules
}

func SaveUploadedFile(c *gin.Context, field string, subdir string) (string, *UploadMeta, error) {
	file, err := c.FormFile(field)
	if err != nil {
		return "", nil, err
	}

	return saveUploadedFileHeader(c, file, subdir, &UploadMeta{
		OriginalName: file.Filename,
		Size:         file.Size,
		Mime:         normalizeMimeType(file.Header.Get("Content-Type")),
	})
}

func SaveValidatedUploadedFile(c *gin.Context, field string, subdir string, options UploadValidationOptions) (string, *UploadMeta, error) {
	validated, err := ValidateUploadedFormFile(c, field, options)
	if err != nil {
		return "", nil, err
	}
	return saveUploadedFileHeader(c, validated.fileHeader, subdir, validated.meta)
}

func SaveValidatedUploadedFiles(c *gin.Context, field string, subdir string, options UploadValidationOptions, maxFiles int, maxTotalSize int64) ([]SavedUpload, error) {
	validatedUploads, err := ValidateUploadedFormFiles(c, field, options, maxFiles, maxTotalSize)
	if err != nil {
		return nil, err
	}
	if len(validatedUploads) == 0 {
		return nil, nil
	}

	savedUploads := make([]SavedUpload, 0, len(validatedUploads))
	for _, validated := range validatedUploads {
		path, meta, saveErr := saveUploadedFileHeader(c, validated.fileHeader, subdir, validated.meta)
		if saveErr != nil {
			return nil, saveErr
		}
		savedUploads = append(savedUploads, SavedUpload{
			Path: path,
			Meta: meta,
		})
	}

	return savedUploads, nil
}

func ValidateUploadedFormFile(c *gin.Context, field string, options UploadValidationOptions) (*validatedUpload, error) {
	fileHeader, err := c.FormFile(field)
	if err != nil {
		return nil, err
	}
	meta, err := ValidateUploadedFileHeader(fileHeader, options)
	if err != nil {
		return nil, err
	}
	return &validatedUpload{fileHeader: fileHeader, meta: meta}, nil
}

func ValidateUploadedFormFiles(c *gin.Context, field string, options UploadValidationOptions, maxFiles int, maxTotalSize int64) ([]validatedUpload, error) {
	form, err := c.MultipartForm()
	if err != nil {
		return nil, err
	}

	fileHeaders := make([]*multipart.FileHeader, 0)
	if matches := form.File[field]; len(matches) > 0 {
		fileHeaders = append(fileHeaders, matches...)
	}
	arrayField := field + "[]"
	if arrayField != field {
		if matches := form.File[arrayField]; len(matches) > 0 {
			fileHeaders = append(fileHeaders, matches...)
		}
	}

	if len(fileHeaders) == 0 {
		return nil, nil
	}
	if maxFiles > 0 && len(fileHeaders) > maxFiles {
		return nil, ErrUploadContent
	}

	totalSize := int64(0)
	validatedUploads := make([]validatedUpload, 0, len(fileHeaders))
	for _, fileHeader := range fileHeaders {
		totalSize += fileHeader.Size
		if maxTotalSize > 0 && totalSize > maxTotalSize {
			return nil, ErrUploadTooLarge
		}
		meta, validateErr := ValidateUploadedFileHeader(fileHeader, options)
		if validateErr != nil {
			return nil, validateErr
		}
		validatedUploads = append(validatedUploads, validatedUpload{
			fileHeader: fileHeader,
			meta:       meta,
		})
	}

	return validatedUploads, nil
}

func ValidateUploadedFileHeader(file *multipart.FileHeader, options UploadValidationOptions) (*UploadMeta, error) {
	if file == nil {
		return nil, ErrUploadEmptyFile
	}
	if file.Size <= 0 {
		return nil, ErrUploadEmptyFile
	}
	if options.MaxSizeBytes > 0 && file.Size > options.MaxSizeBytes {
		return nil, ErrUploadTooLarge
	}

	extension := strings.ToLower(filepath.Ext(file.Filename))
	if len(options.AllowedExtensions) > 0 && !stringInSlice(extension, options.AllowedExtensions) {
		return nil, ErrUploadExtension
	}

	source, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer source.Close()

	header := make([]byte, 8192)
	n, readErr := io.ReadFull(source, header)
	if readErr != nil && !errors.Is(readErr, io.EOF) && !errors.Is(readErr, io.ErrUnexpectedEOF) {
		return nil, readErr
	}
	header = header[:n]
	if len(header) == 0 {
		return nil, ErrUploadEmptyFile
	}

	clientMime := normalizeMimeType(file.Header.Get("Content-Type"))
	if clientMime != "" && len(options.AllowedMIMEs) > 0 && !stringInSlice(clientMime, options.AllowedMIMEs) {
		return nil, ErrUploadMime
	}

	detectedKind, detectedMime, err := detectUploadKind(source, file.Size, header)
	if err != nil {
		return nil, err
	}
	if detectedKind == "" {
		return nil, ErrUploadSignature
	}
	if len(options.AllowedKinds) > 0 && !stringInSlice(detectedKind, options.AllowedKinds) {
		return nil, ErrUploadSignature
	}
	if len(options.AllowedExtensions) > 0 && !extensionMatchesDetectedKind(extension, detectedKind) {
		return nil, ErrUploadSignature
	}

	return &UploadMeta{
		OriginalName: file.Filename,
		Size:         file.Size,
		Mime:         detectedMime,
	}, nil
}

func saveUploadedFileHeader(c *gin.Context, file *multipart.FileHeader, subdir string, meta *UploadMeta) (string, *UploadMeta, error) {
	if meta == nil {
		meta = &UploadMeta{
			OriginalName: file.Filename,
			Size:         file.Size,
			Mime:         normalizeMimeType(file.Header.Get("Content-Type")),
		}
	}

	cfg := middleware.GetConfig(c)
	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("%s_%s", timestamp, filepath.Base(file.Filename))
	relPath := filepath.ToSlash(filepath.Join(subdir, filename))
	absPath := filepath.Join(cfg.StoragePath, relPath)

	if err := os.MkdirAll(filepath.Dir(absPath), 0o755); err != nil {
		return "", nil, err
	}
	if err := c.SaveUploadedFile(file, absPath); err != nil {
		return "", nil, err
	}
	if cfg.StorageEncryptUploads && cfg.StorageEncryptionKey != "" {
		if err := services.EncryptFileInPlace(absPath, cfg.StorageEncryptionKey); err != nil {
			_ = os.Remove(absPath)
			return "", nil, err
		}
	}

	return relPath, meta, nil
}

type UploadMeta struct {
	OriginalName string
	Size         int64
	Mime         string
}

func normalizeMimeType(value string) string {
	trimmed := strings.TrimSpace(strings.ToLower(value))
	if trimmed == "" {
		return ""
	}
	if idx := strings.Index(trimmed, ";"); idx >= 0 {
		return strings.TrimSpace(trimmed[:idx])
	}
	return trimmed
}

func stringInSlice(value string, items []string) bool {
	for _, item := range items {
		if strings.EqualFold(strings.TrimSpace(value), strings.TrimSpace(item)) {
			return true
		}
	}
	return false
}

func extensionMatchesDetectedKind(extension, kind string) bool {
	switch kind {
	case "png":
		return extension == ".png"
	case "jpeg":
		return extension == ".jpg" || extension == ".jpeg"
	case "pdf":
		return extension == ".pdf"
	case "doc":
		return extension == ".doc"
	case "docx":
		return extension == ".docx"
	default:
		return false
	}
}

func detectUploadKind(file multipart.File, size int64, header []byte) (string, string, error) {
	switch {
	case bytes.HasPrefix(header, []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}):
		return "png", "image/png", nil
	case len(header) >= 3 && header[0] == 0xff && header[1] == 0xd8 && header[2] == 0xff:
		return "jpeg", "image/jpeg", nil
	case bytes.HasPrefix(header, []byte("%PDF-")):
		return "pdf", "application/pdf", nil
	case bytes.HasPrefix(header, []byte{0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1}):
		return "doc", "application/msword", nil
	case isZIPHeader(header):
		if isDOCXFile(file, size) {
			return "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", nil
		}
		return "", "", ErrUploadSignature
	default:
		detectedMime := normalizeMimeType(http.DetectContentType(header))
		if detectedMime == "image/png" {
			return "png", detectedMime, nil
		}
		if detectedMime == "image/jpeg" {
			return "jpeg", detectedMime, nil
		}
		if detectedMime == "application/pdf" {
			return "pdf", detectedMime, nil
		}
		return "", "", ErrUploadSignature
	}
}

func isZIPHeader(header []byte) bool {
	return bytes.HasPrefix(header, []byte("PK\x03\x04")) ||
		bytes.HasPrefix(header, []byte("PK\x05\x06")) ||
		bytes.HasPrefix(header, []byte("PK\x07\x08"))
}

func isDOCXFile(file multipart.File, size int64) bool {
	if size <= 0 {
		return false
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return false
	}
	defer file.Seek(0, io.SeekStart)

	reader, err := zip.NewReader(file, size)
	if err != nil {
		return false
	}

	hasContentTypes := false
	hasWordDir := false
	for _, entry := range reader.File {
		switch {
		case entry.Name == "[Content_Types].xml":
			hasContentTypes = true
		case strings.HasPrefix(entry.Name, "word/"):
			hasWordDir = true
		}
		if hasContentTypes && hasWordDir {
			return true
		}
	}
	return false
}
