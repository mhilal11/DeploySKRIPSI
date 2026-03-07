package services

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"rsc.io/pdf"
)

const maxExtractedCVTextChars = 30000

func ExtractCVText(filePath string) (string, error) {
	ext := strings.ToLower(strings.TrimSpace(filepath.Ext(filePath)))
	switch ext {
	case ".pdf":
		return extractTextFromPDF(filePath)
	case ".docx":
		return extractTextFromDOCX(filePath)
	case ".txt", ".md", ".rtf":
		return extractTextFromPlainFile(filePath)
	default:
		return extractTextFromPlainFile(filePath)
	}
}

func extractTextFromPlainFile(filePath string) (string, error) {
	raw, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return normalizeExtractedText(string(raw)), nil
}

func extractTextFromPDF(filePath string) (string, error) {
	reader, err := pdf.Open(filePath)
	if err != nil {
		return "", err
	}

	var builder strings.Builder
	for pageIndex := 1; pageIndex <= reader.NumPage(); pageIndex++ {
		page := reader.Page(pageIndex)
		if page.V.IsNull() {
			continue
		}
		content := page.Content()
		texts := content.Text
		sort.SliceStable(texts, func(i, j int) bool {
			if texts[i].Y == texts[j].Y {
				return texts[i].X < texts[j].X
			}
			return texts[i].Y > texts[j].Y
		})
		for _, text := range texts {
			part := strings.TrimSpace(text.S)
			if part == "" {
				continue
			}
			builder.WriteString(part)
			builder.WriteByte(' ')
		}
		builder.WriteString("\n\n")
	}

	normalized := normalizeExtractedText(builder.String())
	if normalized == "" {
		return "", errors.New("teks PDF tidak dapat diekstrak")
	}
	return normalized, nil
}

func extractTextFromDOCX(filePath string) (string, error) {
	archive, err := zip.OpenReader(filePath)
	if err != nil {
		return "", err
	}
	defer archive.Close()

	var documentXML []byte
	for _, file := range archive.File {
		if strings.EqualFold(file.Name, "word/document.xml") {
			reader, openErr := file.Open()
			if openErr != nil {
				return "", openErr
			}
			documentXML, err = io.ReadAll(reader)
			reader.Close()
			if err != nil {
				return "", err
			}
			break
		}
	}
	if len(documentXML) == 0 {
		return "", errors.New("dokumen DOCX tidak valid")
	}

	decoder := xml.NewDecoder(bytes.NewReader(documentXML))
	var builder strings.Builder
	for {
		token, tokenErr := decoder.Token()
		if tokenErr == io.EOF {
			break
		}
		if tokenErr != nil {
			return "", tokenErr
		}

		start, ok := token.(xml.StartElement)
		if !ok {
			continue
		}
		if start.Name.Local != "t" {
			continue
		}
		var value string
		if err := decoder.DecodeElement(&value, &start); err != nil {
			return "", err
		}
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		builder.WriteString(value)
		builder.WriteByte(' ')
	}

	normalized := normalizeExtractedText(builder.String())
	if normalized == "" {
		return "", errors.New("teks DOCX tidak dapat diekstrak")
	}
	return normalized, nil
}

func normalizeExtractedText(value string) string {
	normalized := strings.TrimSpace(strings.Join(strings.Fields(value), " "))
	if normalized == "" {
		return ""
	}
	runes := []rune(normalized)
	if len(runes) <= maxExtractedCVTextChars {
		return normalized
	}
	return string(runes[:maxExtractedCVTextChars]) + "..."
}
