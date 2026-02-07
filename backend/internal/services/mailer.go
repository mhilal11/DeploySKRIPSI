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
	if strings.TrimSpace(to) == "" {
		return fmt.Errorf("missing recipient")
	}

	if cfg.SMTPHost != "" {
		if err := sendSMTP(cfg, to, subject, body); err == nil {
			return nil
		} else {
			// fallback to outbox if SMTP fails
			_ = writeOutbox(cfg, to, subject, body)
			return nil
		}
	}

	return writeOutbox(cfg, to, subject, body)
}

func sendSMTP(cfg config.Config, to string, subject string, body string) error {
	from := strings.TrimSpace(cfg.SMTPFrom)
	if from == "" {
		from = "no-reply@localhost"
	}

	addr := fmt.Sprintf("%s:%d", cfg.SMTPHost, cfg.SMTPPort)
	message := buildMessage(from, to, subject, body)

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

func writeOutbox(cfg config.Config, to string, subject string, body string) error {
	outDir := filepath.Join(cfg.StoragePath, "mail_outbox")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return err
	}

	filename := fmt.Sprintf("%s_%s_%s.txt",
		time.Now().Format("20060102_150405"),
		sanitizeFilename(to),
		sanitizeFilename(subject),
	)
	fullPath := filepath.Join(outDir, filename)
	content := buildMessage(cfg.SMTPFrom, to, subject, body)
	return os.WriteFile(fullPath, []byte(content), 0o644)
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
