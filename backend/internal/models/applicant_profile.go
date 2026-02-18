package models

import "time"

type ApplicantProfile struct {
	ID               int64      `db:"id" json:"id"`
	UserID           int64      `db:"user_id" json:"user_id"`
	FullName         *string    `db:"full_name" json:"full_name"`
	Email            *string    `db:"email" json:"email"`
	Phone            *string    `db:"phone" json:"phone"`
	DateOfBirth      *time.Time `db:"date_of_birth" json:"date_of_birth"`
	Gender           *string    `db:"gender" json:"gender"`
	Religion         *string    `db:"religion" json:"religion"`
	Address          *string    `db:"address" json:"address"`
	DomicileAddress  *string    `db:"domicile_address" json:"domicile_address"`
	City             *string    `db:"city" json:"city"`
	Province         *string    `db:"province" json:"province"`
	ProfilePhotoPath *string    `db:"profile_photo_path" json:"profile_photo_path"`
	Educations       JSON       `db:"educations" json:"educations"`
	Experiences      JSON       `db:"experiences" json:"experiences"`
	Certifications   JSON       `db:"certifications" json:"certifications"`
	CompletedAt      *time.Time `db:"completed_at" json:"completed_at"`
	CreatedAt        *time.Time `db:"created_at" json:"created_at"`
	UpdatedAt        *time.Time `db:"updated_at" json:"updated_at"`
}
