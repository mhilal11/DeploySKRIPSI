package handlers

import (
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/services"

	"github.com/gin-gonic/gin"
)

func ServeStorageFile(c *gin.Context) {
	cfg := middleware.GetConfig(c)
	requestPath := strings.TrimPrefix(c.Param("filepath"), "/")
	normalized := NormalizeAttachmentPath(requestPath)
	if normalized == "" {
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"message": "File tidak ditemukan"})
		return
	}

	absPath, ok := resolveStorageFilePath(cfg.StoragePath, normalized)
	if !ok {
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"message": "File tidak ditemukan"})
		return
	}

	content, _, err := services.ReadFileMaybeDecrypted(absPath, cfg.StorageEncryptionKey)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"message": "Gagal membaca file"})
		return
	}

	contentType := mime.TypeByExtension(strings.ToLower(filepath.Ext(normalized)))
	if contentType == "" {
		contentType = http.DetectContentType(content)
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	filename := filepath.Base(filepath.FromSlash(normalized))
	if c.Query("download") == "1" {
		c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")
	} else {
		c.Header("Content-Disposition", "inline; filename=\""+filename+"\"")
	}
	c.Data(http.StatusOK, contentType, content)
}

func resolveStorageFilePath(storageRoot, relativePath string) (string, bool) {
	trimmed := strings.TrimSpace(strings.ReplaceAll(relativePath, "\\", "/"))
	if trimmed == "" || strings.Contains(trimmed, "..") {
		return "", false
	}
	cleaned := path.Clean("/" + strings.TrimPrefix(trimmed, "/"))
	cleaned = strings.TrimPrefix(cleaned, "/")
	if cleaned == "" || strings.HasPrefix(cleaned, "../") {
		return "", false
	}

	absRoot, err := filepath.Abs(storageRoot)
	if err != nil {
		return "", false
	}
	absPath, err := filepath.Abs(filepath.Join(absRoot, filepath.FromSlash(cleaned)))
	if err != nil {
		return "", false
	}
	prefix := absRoot + string(filepath.Separator)
	if absPath != absRoot && !strings.HasPrefix(absPath, prefix) {
		return "", false
	}
	info, err := os.Stat(absPath)
	if err != nil || info.IsDir() {
		return "", false
	}
	return absPath, true
}
