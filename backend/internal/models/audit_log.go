package models

import "time"

type AuditLog struct {
	ID          int64      `db:"id" json:"id"`
	UserID      *int64     `db:"user_id" json:"user_id"`
	UserName    *string    `db:"user_name" json:"user_name"`
	UserEmail   *string    `db:"user_email" json:"user_email"`
	UserRole    *string    `db:"user_role" json:"user_role"`
	Module      string     `db:"module" json:"module"`
	Action      string     `db:"action" json:"action"`
	EntityType  *string    `db:"entity_type" json:"entity_type"`
	EntityID    *string    `db:"entity_id" json:"entity_id"`
	Description *string    `db:"description" json:"description"`
	OldValues   JSON       `db:"old_values" json:"old_values"`
	NewValues   JSON       `db:"new_values" json:"new_values"`
	IPAddress   *string    `db:"ip_address" json:"ip_address"`
	UserAgent   *string    `db:"user_agent" json:"user_agent"`
	CreatedAt   *time.Time `db:"created_at" json:"created_at"`
}
