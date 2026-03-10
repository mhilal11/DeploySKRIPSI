package admin

import (
	"hris-backend/internal/http/handlers"
	superadmin "hris-backend/internal/http/handlers/superadmin"
	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"
	dbrepo "hris-backend/internal/repository"
	"hris-backend/internal/services"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func AdminStaffLettersIndex(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleAdmin {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	if user.IsHumanCapitalAdmin() {
		superadmin.SuperAdminLettersIndex(c)
		return
	}

	db := middleware.GetDB(c)

	inbox, _ := dbrepo.ListDivisionInboxLettersAll(db, user.Division)
	outbox, _ := dbrepo.ListUserOutgoingLettersAll(db, user.ID)
	archive, _ := dbrepo.ListDivisionArchiveLettersAll(db, user.Division, user.ID)

	stats := map[string]int{
		"inbox":    len(inbox),
		"outbox":   len(outbox),
		"pending":  countPending(inbox),
		"archived": len(archive),
	}

	letterOptions := map[string]any{
		"letterTypes": []string{"Permohonan", "Undangan", "Laporan", "Pemberitahuan", "Surat Tugas", "Surat Cuti", "Surat Peringatan", "Surat Kerjasama"},
		"categories":  []string{"Internal", "Eksternal", "Keuangan", "Operasional"},
		"priorities":  map[string]string{"high": "Tinggi", "medium": "Sedang", "low": "Rendah"},
		"divisions":   divisionOptions(db),
	}

	divisionCode := services.DivisionCodeFromName(handlers.FirstString(user.Division, ""))
	nextNumber, _ := services.GenerateNomorSurat(db, divisionCode, time.Now())

	c.JSON(http.StatusOK, gin.H{
		"letters": gin.H{
			"inbox":   transformLetters(c, db, inbox),
			"outbox":  transformLetters(c, db, outbox),
			"archive": transformLetters(c, db, archive),
		},
		"recruitments":     recentRecruitments(db),
		"stats":            stats,
		"options":          letterOptions,
		"nextLetterNumber": nextNumber,
	})
}

func AdminStaffLettersStore(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleAdmin || user.IsHumanCapitalAdmin() {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	jenisSurat := c.PostForm("jenis_surat")
	perihal := c.PostForm("perihal")
	isiSurat := c.PostForm("isi_surat")
	kategori := c.PostForm("kategori")
	prioritas := c.PostForm("prioritas")
	penerima := c.PostForm("penerima")

	targetDivisions := c.PostFormArray("target_divisions[]")
	if len(targetDivisions) == 0 {
		targetDivisions = c.PostFormArray("target_divisions")
	}
	if len(targetDivisions) == 0 {
		handlers.ValidationErrors(c, handlers.FieldErrors{"target_divisions": "Divisi tujuan tidak tersedia."})
		return
	}

	departemenID := ensureDepartemen(db, user.Division)

	var attachmentPath *string
	var attachmentName *string
	var attachmentMime *string
	var attachmentSize *int64
	if _, err := c.FormFile("lampiran"); err == nil {
		path, meta, err := handlers.SaveUploadedFile(c, "lampiran", "letters")
		if err == nil {
			attachmentPath = &path
			attachmentName = &meta.OriginalName
			attachmentMime = &meta.Mime
			attachmentSize = &meta.Size
		}
	}

	now := time.Now()
	for _, target := range targetDivisions {
		if user.Division != nil && target == *user.Division {
			continue
		}
		code := services.DivisionCodeFromName(handlers.FirstString(user.Division, ""))
		nomor, _ := services.GenerateNomorSurat(db, code, now)
		input := dbrepo.AdminStaffLetterCreateInput{
			UserID:           user.ID,
			DepartemenID:     departemenID,
			NomorSurat:       nomor,
			JenisSurat:       jenisSurat,
			TanggalSurat:     now,
			Perihal:          perihal,
			IsiSurat:         isiSurat,
			Kategori:         kategori,
			Prioritas:        prioritas,
			Penerima:         handlers.FirstString(&penerima, "Admin HR"),
			TargetDivision:   &target,
			PreviousDivision: user.Division,
			LampiranPath:     attachmentPath,
			LampiranNama:     attachmentName,
			LampiranMime:     attachmentMime,
			LampiranSize:     attachmentSize,
			Now:              now,
		}
		_ = dbrepo.InsertAdminStaffLetter(db, input)
	}

	c.JSON(http.StatusOK, gin.H{"status": "Surat berhasil dikirim dan menunggu disposisi HR."})
}

func AdminStaffLettersReply(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleAdmin || user.IsHumanCapitalAdmin() {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	suratID, ok := parseSuratID(c)
	if !ok {
		return
	}

	surat, err := dbrepo.GetSuratByID(db, suratID)
	if err != nil || surat == nil {
		handlers.JSONError(c, http.StatusNotFound, "Surat tidak ditemukan")
		return
	}

	belongsToDivision := false
	if user.Division != nil {
		if surat.TargetDivision != nil && *surat.TargetDivision == *user.Division {
			belongsToDivision = true
		}
		if surat.Penerima == *user.Division {
			belongsToDivision = true
		}
	}
	if surat.CurrentRecipient != "division" || !belongsToDivision {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	if surat.StatusPersetujuan == "Diarsipkan" {
		handlers.JSONError(c, http.StatusForbidden, "Surat sudah berada di arsip.")
		return
	}
	if surat.IsFinalized {
		handlers.JSONError(c, http.StatusForbidden, "Surat ini bersifat final dan tidak dapat dibalas.")
		return
	}

	replyNote := c.PostForm("reply_note")
	if strings.TrimSpace(replyNote) == "" {
		handlers.ValidationErrors(c, handlers.FieldErrors{"reply_note": "Balasan wajib diisi."})
		return
	}

	originDivision := lookupDepartemenName(db, surat.DepartemenID, surat.UserID)
	currentDivision := handlers.FirstString(user.Division, handlers.FirstString(surat.TargetDivision, originDivision))
	nextTarget := surat.PreviousDivision
	if nextTarget == nil || *nextTarget == currentDivision {
		next := originDivision
		nextTarget = &next
	}

	now := time.Now()
	_ = dbrepo.ReplySuratToHRWithHistory(db, surat.SuratID, replyNote, user.ID, now, nextTarget, currentDivision)

	c.JSON(http.StatusOK, gin.H{"status": "Balasan surat dikirim ke HR untuk diteruskan."})
}

func AdminStaffLettersArchive(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleAdmin || user.IsHumanCapitalAdmin() {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	suratID, ok := parseSuratID(c)
	if !ok {
		return
	}

	surat, err := dbrepo.GetSuratByID(db, suratID)
	if err != nil || surat == nil {
		handlers.JSONError(c, http.StatusNotFound, "Surat tidak ditemukan")
		return
	}

	belongsToDivision := false
	if user.Division != nil {
		if surat.TargetDivision != nil && *surat.TargetDivision == *user.Division {
			belongsToDivision = true
		}
		if surat.Penerima == *user.Division {
			belongsToDivision = true
		}
	}
	canArchiveInbox := surat.CurrentRecipient == "division" && belongsToDivision
	canArchiveOutbox := surat.UserID == user.ID
	if !canArchiveInbox && !canArchiveOutbox {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	if surat.StatusPersetujuan == "Diarsipkan" {
		c.JSON(http.StatusOK, gin.H{"status": "Surat sudah berada di arsip."})
		return
	}
	if surat.StatusPersetujuan != "Didisposisi" {
		handlers.JSONError(c, http.StatusBadRequest, "Hanya surat yang sudah didisposisi yang dapat diarsipkan.")
		return
	}

	_ = dbrepo.ArchiveSuratByID(db, suratID)
	c.JSON(http.StatusOK, gin.H{"status": "Surat berhasil dipindahkan ke arsip."})
}

func AdminStaffLettersUnarchive(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || user.Role != models.RoleAdmin || user.IsHumanCapitalAdmin() {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}
	db := middleware.GetDB(c)

	suratID, ok := parseSuratID(c)
	if !ok {
		return
	}

	surat, err := dbrepo.GetSuratByID(db, suratID)
	if err != nil || surat == nil {
		handlers.JSONError(c, http.StatusNotFound, "Surat tidak ditemukan")
		return
	}

	belongsToDivision := false
	if user.Division != nil {
		if surat.TargetDivision != nil && *surat.TargetDivision == *user.Division {
			belongsToDivision = true
		}
		if surat.Penerima == *user.Division {
			belongsToDivision = true
		}
	}
	canUnarchiveInbox := belongsToDivision
	canUnarchiveOutbox := surat.UserID == user.ID
	if !canUnarchiveInbox && !canUnarchiveOutbox {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	if surat.StatusPersetujuan != "Diarsipkan" {
		c.JSON(http.StatusOK, gin.H{"status": "Surat tidak berada di arsip."})
		return
	}

	_ = dbrepo.UnarchiveSuratByID(db, suratID)
	c.JSON(http.StatusOK, gin.H{"status": "Surat dikembalikan ke daftar aktif."})
}

func parseSuratID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID surat tidak valid")
		return 0, false
	}
	return id, true
}
