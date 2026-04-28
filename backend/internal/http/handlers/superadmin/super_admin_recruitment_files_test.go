package superadmin

import (
	"os"
	"path/filepath"
	"testing"
)

func TestResolveStorageFilePath_FindsDirectStoragePath(t *testing.T) {
	storageRoot := t.TempDir()
	relativePath := filepath.ToSlash(filepath.Join("applications", "cv", "sample.pdf"))
	absolutePath := filepath.Join(storageRoot, filepath.FromSlash(relativePath))

	if err := os.MkdirAll(filepath.Dir(absolutePath), 0o755); err != nil {
		t.Fatalf("mkdir failed: %v", err)
	}
	if err := os.WriteFile(absolutePath, []byte("pdf"), 0o644); err != nil {
		t.Fatalf("write file failed: %v", err)
	}

	resolved, ok := resolveStorageFilePath(storageRoot, relativePath)
	if !ok {
		t.Fatalf("expected resolver to find file %s", relativePath)
	}
	if filepath.Clean(resolved) != filepath.Clean(absolutePath) {
		t.Fatalf("unexpected resolved path: %s", resolved)
	}
}

func TestResolveStorageFilePath_RejectsTraversal(t *testing.T) {
	if resolved, ok := resolveStorageFilePath("./storage", "../secret.pdf"); ok || resolved != "" {
		t.Fatalf("expected traversal path to be rejected, got ok=%v path=%q", ok, resolved)
	}
}

func TestRecruitmentCVDisplayFilename_UsesApplicantNameAndOriginalExtension(t *testing.T) {
	got := recruitmentCVDisplayFilename("Hilal Ramadhan", "applications/cv/20260427_upload.PDF", "")
	want := "CV_Hilal_Ramadhan.pdf"

	if got != want {
		t.Fatalf("unexpected CV filename: got %q want %q", got, want)
	}
}

func TestRecruitmentCVDisplayFilename_FallsBackWhenApplicantNameEmpty(t *testing.T) {
	got := recruitmentCVDisplayFilename(" / ", "applications/cv/resume.docx", "")
	want := "CV_Pelamar.docx"

	if got != want {
		t.Fatalf("unexpected fallback CV filename: got %q want %q", got, want)
	}
}

func TestRecruitmentCVDisplayFilename_UsesPreferredDisplayNameWhenProvided(t *testing.T) {
	got := recruitmentCVDisplayFilename("", "applications/cv/resume.pdf", "Hilal")
	want := "CV_Hilal.pdf"

	if got != want {
		t.Fatalf("unexpected preferred-name CV filename: got %q want %q", got, want)
	}
}

func TestRecruitmentPreferredDisplayNameFromPath(t *testing.T) {
	got := recruitmentPreferredDisplayNameFromPath("CV_Rizky_Maulana_Putra.pdf")
	want := "Rizky Maulana Putra"

	if got != want {
		t.Fatalf("unexpected parsed display name: got %q want %q", got, want)
	}
}
