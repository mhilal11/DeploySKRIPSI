package pelamar

import (
	"sync"

	"hris-backend/internal/config"

	"github.com/jmoiron/sqlx"
)

type recruitmentAIScreeningTriggerFn func(db *sqlx.DB, cfg config.Config, applicationID, actorUserID int64)

var (
	recruitmentAIScreeningTriggerMu sync.RWMutex
	recruitmentAIScreeningTrigger   recruitmentAIScreeningTriggerFn
)

func RegisterRecruitmentAIScreeningTrigger(trigger recruitmentAIScreeningTriggerFn) {
	recruitmentAIScreeningTriggerMu.Lock()
	recruitmentAIScreeningTrigger = trigger
	recruitmentAIScreeningTriggerMu.Unlock()
}

func triggerRecruitmentAIScreening(db *sqlx.DB, cfg config.Config, applicationID, actorUserID int64) {
	recruitmentAIScreeningTriggerMu.RLock()
	trigger := recruitmentAIScreeningTrigger
	recruitmentAIScreeningTriggerMu.RUnlock()
	if trigger == nil {
		return
	}
	trigger(db, cfg, applicationID, actorUserID)
}
