package communicationmodel

import "time"

type Surat struct {
	SuratID                 int64      `db:"surat_id" json:"surat_id"`
	UserID                  int64      `db:"user_id" json:"user_id"`
	DepartemenID            *int64     `db:"departemen_id" json:"departemen_id"`
	NomorSurat              string     `db:"nomor_surat" json:"nomor_surat"`
	TipeSurat               string     `db:"tipe_surat" json:"tipe_surat"`
	JenisSurat              string     `db:"jenis_surat" json:"jenis_surat"`
	TanggalSurat            *time.Time `db:"tanggal_surat" json:"tanggal_surat"`
	Perihal                 string     `db:"perihal" json:"perihal"`
	IsiSurat                string     `db:"isi_surat" json:"isi_surat"`
	StatusPersetujuan       string     `db:"status_persetujuan" json:"status_persetujuan"`
	TanggalPersetujuan      *time.Time `db:"tanggal_persetujuan" json:"tanggal_persetujuan"`
	Kategori                string     `db:"kategori" json:"kategori"`
	Prioritas               string     `db:"prioritas" json:"prioritas"`
	Penerima                string     `db:"penerima" json:"penerima"`
	TargetDivision          *string    `db:"target_division" json:"target_division"`
	PreviousDivision        *string    `db:"previous_division" json:"previous_division"`
	CurrentRecipient        string     `db:"current_recipient" json:"current_recipient"`
	DisposedBy              *int64     `db:"disposed_by" json:"disposed_by"`
	DisposedAt              *time.Time `db:"disposed_at" json:"disposed_at"`
	DispositionNote         *string    `db:"disposition_note" json:"disposition_note"`
	IsFinalized             bool       `db:"is_finalized" json:"is_finalized"`
	DispositionDocumentPath *string    `db:"disposition_document_path" json:"disposition_document_path"`
	DispositionDocumentName *string    `db:"disposition_document_name" json:"disposition_document_name"`
	ReplyNote               *string    `db:"reply_note" json:"reply_note"`
	ReplyBy                 *int64     `db:"reply_by" json:"reply_by"`
	ReplyAt                 *time.Time `db:"reply_at" json:"reply_at"`
	AlamatPengirim          *string    `db:"alamat_pengirim" json:"alamat_pengirim"`
	LampiranPath            *string    `db:"lampiran_path" json:"lampiran_path"`
	LampiranNama            *string    `db:"lampiran_nama" json:"lampiran_nama"`
	LampiranMime            *string    `db:"lampiran_mime" json:"lampiran_mime"`
	LampiranSize            *int64     `db:"lampiran_size" json:"lampiran_size"`
	CreatedAt               *time.Time `db:"created_at" json:"created_at"`
	UpdatedAt               *time.Time `db:"updated_at" json:"updated_at"`
}
