package services

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// GenerateSimpleDocx creates a docx with plain text lines.
func GenerateSimpleDocx(lines []string, dest string) error {
	// Minimal docx by packaging a document.xml and required files.
	// For simplicity, we build a basic docx structure.
	contentTypes := `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

	rels := `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

	docXML := buildDocumentXML(lines)

	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)

	files := map[string]string{
		"[Content_Types].xml": contentTypes,
		"_rels/.rels":         rels,
		"word/document.xml":   docXML,
	}

	for name, body := range files {
		w, err := zw.Create(name)
		if err != nil {
			_ = zw.Close()
			return err
		}
		if _, err := w.Write([]byte(body)); err != nil {
			_ = zw.Close()
			return err
		}
	}

	if err := zw.Close(); err != nil {
		return err
	}

	return os.WriteFile(dest, buf.Bytes(), 0o644)
}

func buildDocumentXML(lines []string) string {
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`)
	b.WriteString(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>`)
	for _, line := range lines {
		safe := xmlEscape(line)
		b.WriteString(`<w:p><w:r><w:t>`)
		b.WriteString(safe)
		b.WriteString(`</w:t></w:r></w:p>`)
	}
	b.WriteString(`</w:body></w:document>`)
	return b.String()
}

func xmlEscape(s string) string {
	r := strings.NewReplacer(
		"&", "&amp;",
		"<", "&lt;",
		">", "&gt;",
		`"`, "&quot;",
		"'", "&apos;",
	)
	return r.Replace(s)
}

// ReplaceDocxPlaceholders replaces placeholders in all word/*.xml parts.
func ReplaceDocxPlaceholders(templatePath string, replacements map[string]string) (string, error) {
	tmpDir, err := os.MkdirTemp("", "docx_tpl_")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(tmpDir)

	zr, err := zip.OpenReader(templatePath)
	if err != nil {
		return "", err
	}
	defer zr.Close()

	for _, file := range zr.File {
		destPath := filepath.Join(tmpDir, file.Name)
		if file.FileInfo().IsDir() {
			if err := os.MkdirAll(destPath, 0o755); err != nil {
				return "", err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(destPath), 0o755); err != nil {
			return "", err
		}
		rc, err := file.Open()
		if err != nil {
			return "", err
		}
		data, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			return "", err
		}

		if strings.HasPrefix(file.Name, "word/") && strings.HasSuffix(file.Name, ".xml") {
			content := string(data)
			data = []byte(replaceDocxXML(content, replacements))
		}

		if err := os.WriteFile(destPath, data, file.Mode()); err != nil {
			return "", err
		}
	}

	outFile, err := os.CreateTemp("", "docx_out_*.docx")
	if err != nil {
		return "", err
	}
	outPath := outFile.Name()
	outFile.Close()

	if err := zipDir(tmpDir, outPath); err != nil {
		return "", err
	}

	return outPath, nil
}

var docxTextRe = regexp.MustCompile(`(?s)(<w:t[^>]*>)(.*?)(</w:t>)`)

func replaceDocxXML(content string, replacements map[string]string) string {
	matches := docxTextRe.FindAllStringSubmatchIndex(content, -1)
	if len(matches) == 0 {
		return replaceSimple(content, replacements)
	}

	texts := make([]string, len(matches))
	for i, match := range matches {
		if len(match) < 6 {
			continue
		}
		texts[i] = content[match[4]:match[5]]
	}

	for key, value := range replacements {
		if key == "" {
			continue
		}
		texts = replaceAcrossRuns(texts, key, xmlEscape(value))
	}

	var b strings.Builder
	last := 0
	for i, match := range matches {
		if len(match) < 6 {
			continue
		}
		b.WriteString(content[last:match[4]])
		if i < len(texts) {
			b.WriteString(texts[i])
		} else {
			b.WriteString(content[match[4]:match[5]])
		}
		b.WriteString(content[match[5]:match[1]])
		last = match[1]
	}
	b.WriteString(content[last:])
	return b.String()
}

func replaceSimple(content string, replacements map[string]string) string {
	for key, value := range replacements {
		content = strings.ReplaceAll(content, key, xmlEscape(value))
	}
	return content
}

func replaceAcrossRuns(texts []string, key, value string) []string {
	for {
		flat := strings.Join(texts, "")
		idx := strings.Index(flat, key)
		if idx == -1 {
			break
		}
		end := idx + len(key)
		startRun, startOffset := findRunOffset(texts, idx)
		endRun, endOffset := findRunOffset(texts, end)
		if startRun < 0 || endRun < 0 {
			break
		}
		if startRun == endRun {
			texts[startRun] = texts[startRun][:startOffset] + value + texts[startRun][endOffset:]
		} else {
			prefix := texts[startRun][:startOffset]
			suffix := texts[endRun][endOffset:]
			texts[startRun] = prefix + value + suffix
			for i := startRun + 1; i <= endRun; i++ {
				texts[i] = ""
			}
		}
	}
	return texts
}

func findRunOffset(texts []string, pos int) (int, int) {
	count := 0
	for i, text := range texts {
		next := count + len(text)
		if pos <= next {
			return i, pos - count
		}
		count = next
	}
	if len(texts) == 0 {
		return -1, 0
	}
	last := len(texts) - 1
	return last, len(texts[last])
}

func zipDir(dir string, outPath string) error {
	outFile, err := os.Create(outPath)
	if err != nil {
		return err
	}
	defer outFile.Close()

	zw := zip.NewWriter(outFile)
	defer zw.Close()

	return filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if path == dir {
			return nil
		}
		rel, err := filepath.Rel(dir, path)
		if err != nil {
			return err
		}
		rel = filepath.ToSlash(rel)
		if info.IsDir() {
			_, err := zw.Create(rel + "/")
			return err
		}
		w, err := zw.Create(rel)
		if err != nil {
			return err
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		_, err = w.Write(data)
		return err
	})
}

func BuildDispositionLines(data map[string]string) []string {
	lines := []string{
		"PT. LINTAS DAYA PRIMA",
		"Jl. Contoh Alamat No. 123, Jakarta",
		"",
		fmt.Sprintf("Nomor: %s", data["nomor_surat"]),
		fmt.Sprintf("Tanggal: %s", data["tanggal"]),
		fmt.Sprintf("Prioritas: %s", data["prioritas"]),
		"",
		"Kepada Yth.",
		data["penerima"],
		"Di Tempat",
		"",
		fmt.Sprintf("Perihal: %s", data["perihal"]),
		"",
		"Dengan hormat,",
		data["isi_surat"],
		"",
		fmt.Sprintf("Catatan Disposisi: %s", data["catatan_disposisi"]),
		fmt.Sprintf("Tanggal Disposisi: %s", data["tanggal_disposisi"]),
		fmt.Sprintf("Oleh: %s", data["oleh"]),
		"",
		"Dokumen ini telah didisposisi dan bersifat final. Tidak dapat dibalas.",
	}
	return lines
}
