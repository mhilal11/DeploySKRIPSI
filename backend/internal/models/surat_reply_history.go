package models

import "time"

type SuratReplyHistory struct {
	ID           int64      `db:"id" json:"id"`
	SuratID      int64      `db:"surat_id" json:"surat_id"`
	RepliedBy    *int64     `db:"replied_by" json:"replied_by"`
	FromDivision *string    `db:"from_division" json:"from_division"`
	ToDivision   *string    `db:"to_division" json:"to_division"`
	Note         string     `db:"note" json:"note"`
	RepliedAt    *time.Time `db:"replied_at" json:"replied_at"`
	CreatedAt    *time.Time `db:"created_at" json:"created_at"`
	UpdatedAt    *time.Time `db:"updated_at" json:"updated_at"`
}
