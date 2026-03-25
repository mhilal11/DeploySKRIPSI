package staffmodel

import (
	modeltypes "hris-backend/internal/models/types"
	"time"
)

type StaffProfile struct {
	ID               int64           `db:"id" json:"id"`
	UserID           int64           `db:"user_id" json:"user_id"`
	Phone            *string         `db:"phone" json:"phone"`
	DateOfBirth      *time.Time      `db:"date_of_birth" json:"date_of_birth"`
	Religion         *string         `db:"religion" json:"religion"`
	Gender           *string         `db:"gender" json:"gender"`
	Address          *string         `db:"address" json:"address"`
	DomicileAddress  *string         `db:"domicile_address" json:"domicile_address"`
	City             *string         `db:"city" json:"city"`
	Province         *string         `db:"province" json:"province"`
	EducationLevel   *string         `db:"education_level" json:"education_level"`
	Educations       modeltypes.JSON `db:"educations" json:"educations"`
	ProfilePhotoPath *string         `db:"profile_photo_path" json:"profile_photo_path"`
	CreatedAt        *time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt        *time.Time      `db:"updated_at" json:"updated_at"`
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
