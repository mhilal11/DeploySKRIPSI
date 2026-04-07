package services

import (
	"strings"
	"testing"
)

func TestBuildMultipartRelatedMessage_IncludesInlineAsset(t *testing.T) {
	message := buildMultipartRelatedMessage(
		"no-reply@example.com",
		"user@example.com",
		"Subject",
		"plain body",
		`<html><body><img src="cid:ldp-logo" alt="Logo" /></body></html>`,
		[]InlineAsset{
			{
				CID:         "ldp-logo",
				ContentType: "image/png",
				Filename:    "LogoLDP.png",
				Data:        []byte("png-binary"),
			},
		},
	)

	assertContains := func(fragment string) {
		t.Helper()
		if !strings.Contains(message, fragment) {
			t.Fatalf("expected message to contain %q", fragment)
		}
	}

	assertContains(`Content-Type: multipart/related; boundary=`)
	assertContains(`Content-Type: multipart/alternative; boundary=`)
	assertContains(`Content-ID: <ldp-logo>`)
	assertContains(`Content-Disposition: inline; filename="LogoLDP.png"`)
	assertContains(`Content-Type: image/png; name="LogoLDP.png"`)
	assertContains(`cid:ldp-logo`)
}
