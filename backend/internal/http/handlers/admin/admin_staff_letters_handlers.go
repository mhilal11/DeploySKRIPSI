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
	"github.com/jmoiron/sqlx"
)

type adminLettersRepository interface {
	ListDivisionInboxLettersPaged(division *string, limit, offset int) ([]models.Surat, error)
	ListUserOutgoingLettersPaged(userID int64, limit, offset int) ([]models.Surat, error)
	ListDivisionArchiveLettersPaged(division *string, userID int64, limit, offset int) ([]models.Surat, error)
	CountDivisionInboxLetters(division *string) (int, error)
	CountUserOutboxLetters(userID int64) (int, error)
	CountDivisionPendingLetters(division *string) (int, error)
	CountDivisionArchiveLetters(division *string, userID int64) (int, error)
}

type sqlAdminLettersRepository struct {
	db *sqlx.DB
}

var adminLetterTypes = []string{"Permohonan", "Undangan", "Laporan", "Pemberitahuan", "Surat Tugas", "Surat Cuti", "Surat Peringatan", "Surat Kerjasama"}
var adminLetterCategories = []string{"Internal", "Eksternal", "Keuangan", "Operasional"}
var adminLetterPriorities = []string{"high", "medium", "low"}

func newAdminLettersRepository(db *sqlx.DB) adminLettersRepository {
	return &sqlAdminLettersRepository{db: db}
}

func (r *sqlAdminLettersRepository) ListDivisionInboxLettersPaged(division *string, limit, offset int) ([]models.Surat, error) {
	return dbrepo.ListDivisionInboxLettersPaged(r.db, division, limit, offset)
}

func (r *sqlAdminLettersRepository) ListUserOutgoingLettersPaged(userID int64, limit, offset int) ([]models.Surat, error) {
	return dbrepo.ListUserOutgoingLettersPaged(r.db, userID, limit, offset)
}

func (r *sqlAdminLettersRepository) ListDivisionArchiveLettersPaged(division *string, userID int64, limit, offset int) ([]models.Surat, error) {
	return dbrepo.ListDivisionArchiveLettersPaged(r.db, division, userID, limit, offset)
}

func (r *sqlAdminLettersRepository) CountDivisionInboxLetters(division *string) (int, error) {
	return dbrepo.CountDivisionInboxLetters(r.db, division)
}

func (r *sqlAdminLettersRepository) CountUserOutboxLetters(userID int64) (int, error) {
	return dbrepo.CountUserOutboxLetters(r.db, userID)
}

func (r *sqlAdminLettersRepository) CountDivisionPendingLetters(division *string) (int, error) {
	return dbrepo.CountDivisionPendingLetters(r.db, division)
}

func (r *sqlAdminLettersRepository) CountDivisionArchiveLetters(division *string, userID int64) (int, error) {
	return dbrepo.CountDivisionArchiveLetters(r.db, division, userID)
}

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
	repo := newAdminLettersRepository(db)
	pagination := handlers.ParsePagination(c, 20, 100)

	inbox, _ := repo.ListDivisionInboxLettersPaged(user.Division, pagination.Limit, pagination.Offset)
	outbox, _ := repo.ListUserOutgoingLettersPaged(user.ID, pagination.Limit, pagination.Offset)
	archive, _ := repo.ListDivisionArchiveLettersPaged(user.Division, user.ID, pagination.Limit, pagination.Offset)

	totalInbox, _ := repo.CountDivisionInboxLetters(user.Division)
	totalOutbox, _ := repo.CountUserOutboxLetters(user.ID)
	totalArchive, _ := repo.CountDivisionArchiveLetters(user.Division, user.ID)
	totalPending, _ := repo.CountDivisionPendingLetters(user.Division)

	stats := map[string]int{
		"inbox":    totalInbox,
		"outbox":   totalOutbox,
		"pending":  totalPending,
		"archived": totalArchive,
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
		"recruitments": recentRecruitments(db),
		"stats":        stats,
		"pagination": gin.H{
			"inbox":   handlers.BuildPaginationMeta(pagination.Page, pagination.Limit, totalInbox),
			"outbox":  handlers.BuildPaginationMeta(pagination.Page, pagination.Limit, totalOutbox),
			"archive": handlers.BuildPaginationMeta(pagination.Page, pagination.Limit, totalArchive),
		},
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
	prioritas := strings.ToLower(strings.TrimSpace(c.PostForm("prioritas")))
	penerima := strings.TrimSpace(c.PostForm("penerima"))

	targetDivisions := c.PostFormArray("target_divisions[]")
	if len(targetDivisions) == 0 {
		targetDivisions = c.PostFormArray("target_divisions")
	}
	if len(targetDivisions) == 0 {
		handlers.ValidationErrors(c, handlers.FieldErrors{"target_divisions": "Divisi tujuan tidak tersedia."})
		return
	}
	validationErrors := handlers.FieldErrors{}
	if strings.TrimSpace(jenisSurat) == "" {
		validationErrors["jenis_surat"] = "Jenis surat wajib diisi."
	}
	if strings.TrimSpace(perihal) == "" {
		validationErrors["perihal"] = "Perihal wajib diisi."
	}
	if strings.TrimSpace(isiSurat) == "" {
		validationErrors["isi_surat"] = "Isi surat wajib diisi."
	}
	if strings.TrimSpace(kategori) == "" {
		validationErrors["kategori"] = "Kategori wajib diisi."
	}
	if prioritas == "" {
		validationErrors["prioritas"] = "Prioritas wajib diisi."
	}
	handlers.ValidateFieldLength(validationErrors, "jenis_surat", "Jenis surat", jenisSurat, 80)
	handlers.ValidateFieldLength(validationErrors, "perihal", "Perihal", perihal, 220)
	handlers.ValidateFieldLength(validationErrors, "isi_surat", "Isi surat", isiSurat, 8000)
	handlers.ValidateFieldLength(validationErrors, "kategori", "Kategori", kategori, 80)
	handlers.ValidateFieldLength(validationErrors, "prioritas", "Prioritas", prioritas, 24)
	handlers.ValidateFieldLength(validationErrors, "penerima", "Penerima", penerima, 120)
	handlers.ValidateAllowedValue(validationErrors, "jenis_surat", "Jenis surat", jenisSurat, adminLetterTypes)
	handlers.ValidateAllowedValue(validationErrors, "kategori", "Kategori", kategori, adminLetterCategories)
	handlers.ValidateAllowedValue(validationErrors, "prioritas", "Prioritas", prioritas, adminLetterPriorities)
	if len(validationErrors) > 0 {
		handlers.ValidationErrors(c, validationErrors)
		return
	}

	departemenID := ensureDepartemen(db, user.Division)

	var attachmentPath *string
	var attachmentName *string
	var attachmentMime *string
	var attachmentSize *int64
	if _, err := c.FormFile("lampiran"); err != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"lampiran": "Lampiran wajib diunggah."})
		return
	}
	path, meta, err := handlers.SaveValidatedUploadedFile(c, "lampiran", "letters", handlers.DocumentUploadRules())
	if err != nil {
		handlers.ValidationErrors(c, handlers.FieldErrors{"lampiran": "Lampiran harus berupa PDF, DOC, atau DOCX dengan ukuran maksimal 5MB."})
		return
	}
	attachmentPath = &path
	attachmentName = &meta.OriginalName
	attachmentMime = &meta.Mime
	attachmentSize = &meta.Size

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
	replyNote = strings.TrimSpace(replyNote)
	if len([]rune(replyNote)) > 3000 {
		handlers.ValidationErrors(c, handlers.FieldErrors{"reply_note": "Balasan melebihi batas maksimum 3000 karakter."})
		return
	}

	var attachmentPath *string
	var attachmentName *string
	var attachmentMime *string
	var attachmentSize *int64
	if _, err := c.FormFile("lampiran"); err == nil {
		path, meta, saveErr := handlers.SaveValidatedUploadedFile(c, "lampiran", "letters", handlers.DocumentUploadRules())
		if saveErr != nil {
			handlers.ValidationErrors(c, handlers.FieldErrors{"lampiran": "Lampiran balasan harus berupa PDF, DOC, atau DOCX dengan ukuran maksimal 5MB."})
			return
		}
		attachmentPath = &path
		attachmentName = &meta.OriginalName
		attachmentMime = &meta.Mime
		attachmentSize = &meta.Size
	}

	originDivision := lookupDepartemenName(db, surat.DepartemenID, surat.UserID)
	currentDivision := handlers.FirstString(user.Division, handlers.FirstString(surat.TargetDivision, originDivision))
	nextTarget := surat.PreviousDivision
	if nextTarget == nil || *nextTarget == currentDivision {
		next := originDivision
		nextTarget = &next
	}

	now := time.Now()
	_ = dbrepo.ReplySuratToHRWithHistory(
		db,
		surat.SuratID,
		replyNote,
		user.ID,
		now,
		nextTarget,
		currentDivision,
		attachmentPath,
		attachmentName,
		attachmentMime,
		attachmentSize,
	)

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
	if !canArchiveLetterStatus(surat.StatusPersetujuan) {
		handlers.JSONError(c, http.StatusBadRequest, "Hanya surat yang sudah didisposisi yang dapat diarsipkan.")
		return
	}

	if err := dbrepo.ArchiveSuratByID(db, suratID); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal memindahkan surat ke arsip.")
		return
	}
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

	if err := dbrepo.UnarchiveSuratByID(db, suratID); err != nil {
		handlers.JSONError(c, http.StatusInternalServerError, "Gagal mengembalikan surat dari arsip.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "Surat dikembalikan ke daftar aktif."})
}

func canArchiveLetterStatus(status string) bool {
	switch strings.TrimSpace(status) {
	case "Didisposisi", "Disposisi Final", "Ditolak HR":
		return true
	default:
		return false
	}
}

func parseSuratID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		handlers.JSONError(c, http.StatusBadRequest, "ID surat tidak valid")
		return 0, false
	}
	return id, true
}
