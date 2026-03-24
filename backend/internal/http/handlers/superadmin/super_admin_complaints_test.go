package superadmin

import (
	"net/http/httptest"
	"testing"

	"hris-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func TestCollectComplaintCategories_SortsAndDeduplicates(t *testing.T) {
	rows := []models.Complaint{
		{Category: "Fasilitas"},
		{Category: "Relasi Kerja"},
		{Category: " Fasilitas "},
		{Category: ""},
		{Category: "Kompensasi"},
	}

	result := collectComplaintCategories(rows)

	expected := []string{"Fasilitas", "Kompensasi", "Relasi Kerja"}
	if len(result) != len(expected) {
		t.Fatalf("expected %d categories, got %d (%v)", len(expected), len(result), result)
	}
	for index, value := range expected {
		if result[index] != value {
			t.Fatalf("expected category[%d]=%q, got %q", index, value, result[index])
		}
	}
}

func TestBuildComplaintPaginationMeta_ComputesVisibleRange(t *testing.T) {
	meta := buildComplaintPaginationMeta(2, 20, 45)

	if meta["current_page"] != 2 {
		t.Fatalf("expected current_page=2, got %v", meta["current_page"])
	}
	if meta["last_page"] != 3 {
		t.Fatalf("expected last_page=3, got %v", meta["last_page"])
	}
	if meta["from"] != 21 {
		t.Fatalf("expected from=21, got %v", meta["from"])
	}
	if meta["to"] != 40 {
		t.Fatalf("expected to=40, got %v", meta["to"])
	}
}

func TestBuildComplaintPaginationLinks_PreservesFilters(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(
		"GET",
		"/super-admin/kelola-pengaduan?search=wifi&status=new",
		nil,
	)

	links := buildComplaintPaginationLinks(context, 2, 20, 45)
	if len(links) != 5 {
		t.Fatalf("expected 5 links (prev + 3 pages + next), got %d", len(links))
	}

	if links[0]["url"] != "/super-admin/kelola-pengaduan?search=wifi&status=new" {
		t.Fatalf("unexpected previous link url: %v", links[0]["url"])
	}
	if links[2]["active"] != true {
		t.Fatalf("expected page 2 to be active, got %v", links[2]["active"])
	}
	if links[4]["url"] != "/super-admin/kelola-pengaduan?page=3&search=wifi&status=new" {
		t.Fatalf("unexpected next link url: %v", links[4]["url"])
	}
}
