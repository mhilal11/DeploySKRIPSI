package models

import "time"

type OnboardingChecklist struct {
	ID                  int64      `db:"id" json:"id"`
	ApplicationID       int64      `db:"application_id" json:"application_id"`
	ContractSigned      bool       `db:"contract_signed" json:"contract_signed"`
	InventoryHandover   bool       `db:"inventory_handover" json:"inventory_handover"`
	TrainingOrientation bool       `db:"training_orientation" json:"training_orientation"`
	CreatedAt           *time.Time `db:"created_at" json:"created_at"`
	UpdatedAt           *time.Time `db:"updated_at" json:"updated_at"`
}
