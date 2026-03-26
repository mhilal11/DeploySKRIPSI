package services

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"os"
	"path/filepath"
	"strings"
	"time"

	"hris-backend/internal/config"
)

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
