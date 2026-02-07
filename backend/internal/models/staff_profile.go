package models

import "time"

type StaffProfile struct {
	ID             int64      `db:"id" json:"id"`
	UserID         int64      `db:"user_id" json:"user_id"`
	Religion       *string    `db:"religion" json:"religion"`
	Gender         *string    `db:"gender" json:"gender"`
	EducationLevel *string    `db:"education_level" json:"education_level"`
	CreatedAt      *time.Time `db:"created_at" json:"created_at"`
	UpdatedAt      *time.Time `db:"updated_at" json:"updated_at"`
}

var StaffReligions = []string{
	"Islam",
	"Kristen",
	"Katolik",
	"Hindu",
	"Buddha",
	"Kong Hu Chu",
	"Lainnya",
}

var StaffGenders = []string{
	"Laki-laki",
	"Perempuan",
}

var StaffEducationLevels = []string{
	"SMA/SMK",
	"D3",
	"S1",
	"S2",
	"S3",
	"Lainnya",
}
