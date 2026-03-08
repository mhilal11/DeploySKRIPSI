package handlers

import (
	"hris-backend/internal/config"

	"github.com/jmoiron/sqlx"
)

// TriggerRecruitmentAIScreening is a hook registered by the superadmin package
// to decouple pelamar flow from superadmin handler package dependencies.
var TriggerRecruitmentAIScreening func(db *sqlx.DB, cfg config.Config, applicationID, actorUserID int64)
