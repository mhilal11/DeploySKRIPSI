package services

import (
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"net/smtp"
	"os"
	"path/filepath"
	"strings"
	"time"

	"hris-backend/internal/config"
)

type InlineAsset struct {
	CID         string
	ContentType string
	Data        []byte
	Filename    string
}

func SendEmail(cfg config.Config, to string, subject string, body string) error {
	message := buildMessage(resolveFrom(cfg), to, subject, body)
	return sendMessage(cfg, to, subject, message)
}

func SendEmailMultipart(cfg config.Config, to string, subject string, textBody string, htmlBody string) error {
	if strings.TrimSpace(htmlBody) == "" {
		return SendEmail(cfg, to, subject, textBody)
	}

	message := buildMultipartAlternativeMessage(
		resolveFrom(cfg),
		to,
		subject,
		textBody,
		htmlBody,
	)
	return sendMessage(cfg, to, subject, message)
}

func SendEmailMultipartWithInline(cfg config.Config, to string, subject string, textBody string, htmlBody string, inlineAssets []InlineAsset) error {
	if strings.TrimSpace(htmlBody) == "" {
		return SendEmail(cfg, to, subject, textBody)
	}
	if len(inlineAssets) == 0 {
		return SendEmailMultipart(cfg, to, subject, textBody, htmlBody)
	}

	message := buildMultipartRelatedMessage(
		resolveFrom(cfg),
		to,
		subject,
		textBody,
		htmlBody,
		inlineAssets,
	)
	return sendMessage(cfg, to, subject, message)
}

func sendMessage(cfg config.Config, to string, subject string, message string) error {
	if strings.TrimSpace(to) == "" {
		return fmt.Errorf("missing recipient")
	}

	if cfg.SMTPHost != "" {
		if err := sendSMTPMessage(cfg, to, message); err == nil {
			return nil
		} else {
			// fallback to outbox if SMTP fails
			_ = writeOutboxRaw(cfg, to, subject, message)
			return nil
		}
	}

	return writeOutboxRaw(cfg, to, subject, message)
}

func resolveFrom(cfg config.Config) string {
	from := strings.TrimSpace(cfg.SMTPFrom)
	if from != "" {
		return from
	}
	return "no-reply@localhost"
}

func sendSMTPMessage(cfg config.Config, to string, message string) error {
	from := resolveFrom(cfg)
	addr := fmt.Sprintf("%s:%d", cfg.SMTPHost, cfg.SMTPPort)

	var auth smtp.Auth
	if cfg.SMTPUser != "" {
		auth = smtp.PlainAuth("", cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPHost)
	}

	if cfg.SMTPTLS {
		tlsConfig := &tls.Config{ServerName: cfg.SMTPHost}
		conn, err := tls.Dial("tcp", addr, tlsConfig)
		if err != nil {
			return err
		}
		defer conn.Close()

		client, err := smtp.NewClient(conn, cfg.SMTPHost)
		if err != nil {
			return err
		}
		defer client.Close()

		if auth != nil {
			if err := client.Auth(auth); err != nil {
				return err
			}
		}
		if err := client.Mail(from); err != nil {
			return err
		}
		if err := client.Rcpt(to); err != nil {
			return err
		}
		writer, err := client.Data()
		if err != nil {
			return err
		}
		if _, err := writer.Write([]byte(message)); err != nil {
			_ = writer.Close()
			return err
		}
		if err := writer.Close(); err != nil {
			return err
		}
		return client.Quit()
	}

	return smtp.SendMail(addr, auth, from, []string{to}, []byte(message))
}

func buildMessage(from string, to string, subject string, body string) string {
	cleanBody := strings.ReplaceAll(body, "\r\n", "\n")
	return strings.Join([]string{
		"From: " + from,
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		cleanBody,
		"",
	}, "\r\n")
}

func buildMultipartAlternativeMessage(from string, to string, subject string, textBody string, htmlBody string) string {
	cleanText := strings.ReplaceAll(textBody, "\r\n", "\n")
	cleanHTML := strings.ReplaceAll(htmlBody, "\r\n", "\n")
	boundary := fmt.Sprintf("hris-boundary-%d", time.Now().UnixNano())

	return strings.Join([]string{
		"From: " + from,
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		fmt.Sprintf("Content-Type: multipart/alternative; boundary=%q", boundary),
		"",
		"--" + boundary,
		"Content-Type: text/plain; charset=UTF-8",
		"Content-Transfer-Encoding: 8bit",
		"",
		cleanText,
		"",
		"--" + boundary,
		"Content-Type: text/html; charset=UTF-8",
		"Content-Transfer-Encoding: 8bit",
		"",
		cleanHTML,
		"",
		"--" + boundary + "--",
		"",
	}, "\r\n")
}

func buildMultipartRelatedMessage(from string, to string, subject string, textBody string, htmlBody string, inlineAssets []InlineAsset) string {
	cleanText := strings.ReplaceAll(textBody, "\r\n", "\n")
	cleanHTML := strings.ReplaceAll(htmlBody, "\r\n", "\n")
	relatedBoundary := fmt.Sprintf("hris-related-%d", time.Now().UnixNano())
	alternativeBoundary := fmt.Sprintf("hris-alt-%d", time.Now().UnixNano())

	lines := []string{
		"From: " + from,
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		fmt.Sprintf("Content-Type: multipart/related; boundary=%q", relatedBoundary),
		"",
		"--" + relatedBoundary,
		fmt.Sprintf("Content-Type: multipart/alternative; boundary=%q", alternativeBoundary),
		"",
		"--" + alternativeBoundary,
		"Content-Type: text/plain; charset=UTF-8",
		"Content-Transfer-Encoding: 8bit",
		"",
		cleanText,
		"",
		"--" + alternativeBoundary,
		"Content-Type: text/html; charset=UTF-8",
		"Content-Transfer-Encoding: 8bit",
		"",
		cleanHTML,
		"",
		"--" + alternativeBoundary + "--",
	}

	for _, asset := range inlineAssets {
		if strings.TrimSpace(asset.CID) == "" || len(asset.Data) == 0 {
			continue
		}

		contentType := strings.TrimSpace(asset.ContentType)
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		filename := strings.TrimSpace(asset.Filename)
		if filename == "" {
			filename = asset.CID
		}

		lines = append(lines,
			"",
			"--"+relatedBoundary,
			fmt.Sprintf("Content-Type: %s; name=%q", contentType, filename),
			"Content-Transfer-Encoding: base64",
			fmt.Sprintf("Content-ID: <%s>", asset.CID),
			fmt.Sprintf("Content-Disposition: inline; filename=%q", filename),
			"",
		)
		lines = append(lines, wrapBase64Lines(asset.Data)...)
	}

	lines = append(lines,
		"",
		"--"+relatedBoundary+"--",
		"",
	)

	return strings.Join(lines, "\r\n")
}

func wrapBase64Lines(data []byte) []string {
	if len(data) == 0 {
		return []string{""}
	}

	encoded := base64.StdEncoding.EncodeToString(data)
	lines := make([]string, 0, (len(encoded)/76)+1)
	for len(encoded) > 76 {
		lines = append(lines, encoded[:76])
		encoded = encoded[76:]
	}
	lines = append(lines, encoded)
	return lines
}

func writeOutboxRaw(cfg config.Config, to string, subject string, message string) error {
	outDir := filepath.Join(cfg.StoragePath, "mail_outbox")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return err
	}

	filename := fmt.Sprintf("%s_%s_%s.eml",
		time.Now().Format("20060102_150405"),
		sanitizeFilename(to),
		sanitizeFilename(subject),
	)
	fullPath := filepath.Join(outDir, filename)
	return os.WriteFile(fullPath, []byte(message), 0o644)
}

func sanitizeFilename(name string) string {
	name = strings.ReplaceAll(name, "@", "_")
	name = strings.ReplaceAll(name, " ", "_")
	name = strings.ReplaceAll(name, "/", "-")
	name = strings.ReplaceAll(name, "\\", "-")
	if name == "" {
		return "message"
	}
	return name
}
