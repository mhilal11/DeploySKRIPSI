package organizationmodel

import "time"

type Departemen struct {
	ID        int64      `db:"id" json:"id"`
	Nama      string     `db:"nama" json:"nama"`
	Kode      string     `db:"kode" json:"kode"`
	CreatedAt *time.Time `db:"created_at" json:"created_at"`
	UpdatedAt *time.Time `db:"updated_at" json:"updated_at"`
}
