package handlers

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"hris-backend/internal/http/middleware"

	"github.com/gin-gonic/gin"
)

func saveUploadedFile(c *gin.Context, field string, subdir string) (string, *UploadMeta, error) {
	file, err := c.FormFile(field)
	if err != nil {
		return "", nil, err
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

	meta := &UploadMeta{
		OriginalName: file.Filename,
		Size:         file.Size,
		Mime:         file.Header.Get("Content-Type"),
	}

	return relPath, meta, nil
}

type UploadMeta struct {
	OriginalName string
	Size         int64
	Mime         string
}
