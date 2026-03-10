package db

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type RecruitmentApplicationStatusState struct {
	ID              int64   `db:"id"`
	Status          string  `db:"status"`
	RejectionReason *string `db:"rejection_reason"`
	Position        string  `db:"position"`
	Division        *string `db:"division"`
}

type RecruitmentApplicationRejectState struct {
	Status          string  `db:"status"`
	RejectionReason *string `db:"rejection_reason"`
}

type RecruitmentInterviewScheduleState struct {
	InterviewDate   *time.Time `db:"interview_date"`
	InterviewTime   *string    `db:"interview_time"`
	InterviewEnd    *string    `db:"interview_end_time"`
	InterviewMode   *string    `db:"interview_mode"`
	InterviewerName *string    `db:"interviewer_name"`
	MeetingLink     *string    `db:"meeting_link"`
	InterviewNotes  *string    `db:"interview_notes"`
}

type RecruitmentApplicationSummary struct {
	ID       int64   `db:"id"`
	FullName string  `db:"full_name"`
	Position string  `db:"position"`
	Division *string `db:"division"`
	Status   string  `db:"status"`
}

type RecruitmentSLASettingRow struct {
	Stage      string `db:"stage"`
	TargetDays int    `db:"target_days"`
}

func ListRecruitmentApplications(db *sqlx.DB) ([]models.Application, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.Application{}
	err := db.Select(&rows, "SELECT * FROM applications ORDER BY submitted_at DESC")
	return rows, err
}

func UpsertRecruitmentSLASetting(db *sqlx.DB, stage string, targetDays int, now time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if now.IsZero() {
		now = time.Now()
	}
	_, err := db.Exec(`
		INSERT INTO recruitment_sla_settings (stage, target_days, created_at, updated_at)
		VALUES (?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE target_days = VALUES(target_days), updated_at = VALUES(updated_at)
	`, stage, targetDays, now, now)
	return err
}

func ListRecruitmentSLASettings(db *sqlx.DB) ([]RecruitmentSLASettingRow, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []RecruitmentSLASettingRow{}
	err := db.Select(&rows, "SELECT stage, target_days FROM recruitment_sla_settings")
	if err != nil {
		if strings.Contains(err.Error(), "doesn't exist") {
			return []RecruitmentSLASettingRow{}, nil
		}
		return nil, err
	}
	return rows, nil
}

func GetRecruitmentApplicationStatusState(db *sqlx.DB, id int64) (*RecruitmentApplicationStatusState, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var row RecruitmentApplicationStatusState
	err := db.Get(&row, "SELECT id, status, rejection_reason, position, division FROM applications WHERE id = ?", id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &row, nil
}

func UpdateRecruitmentApplicationStatus(db *sqlx.DB, id int64, status string, rejectionReason string, now time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if now.IsZero() {
		now = time.Now()
	}

	updateFields := []string{"status = ?", "updated_at = ?"}
	args := []any{status, now}

	switch status {
	case "Screening":
		updateFields = append(updateFields, "screening_at = IFNULL(screening_at, ?)")
		args = append(args, now)
	case "Interview":
		updateFields = append(updateFields, "interview_at = IFNULL(interview_at, ?)")
		args = append(args, now)
	case "Offering":
		updateFields = append(updateFields, "offering_at = IFNULL(offering_at, ?)")
		args = append(args, now)
	case "Hired":
		updateFields = append(updateFields, "hired_at = IFNULL(hired_at, ?)")
		args = append(args, now)
	case "Rejected":
		updateFields = append(updateFields, "rejection_reason = ?", "rejected_at = ?")
		args = append(args, rejectionReason, now)
	}

	if status != "Rejected" {
		updateFields = append(updateFields, "rejection_reason = NULL")
	}

	args = append(args, id)
	query := "UPDATE applications SET " + strings.Join(updateFields, ", ") + " WHERE id = ?"
	_, err := db.Exec(query, args...)
	return err
}

func GetRecruitmentApplicationRejectState(db *sqlx.DB, id int64) (*RecruitmentApplicationRejectState, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var row RecruitmentApplicationRejectState
	err := db.Get(&row, "SELECT status, rejection_reason FROM applications WHERE id = ?", id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &row, nil
}

func RejectRecruitmentApplication(db *sqlx.DB, id int64, rejectionReason string, now time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if now.IsZero() {
		now = time.Now()
	}
	_, err := db.Exec(
		"UPDATE applications SET status = 'Rejected', rejection_reason = ?, rejected_at = ?, updated_at = ? WHERE id = ?",
		rejectionReason,
		now,
		now,
		id,
	)
	return err
}

func GetRecruitmentInterviewScheduleState(db *sqlx.DB, id int64) (*RecruitmentInterviewScheduleState, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var row RecruitmentInterviewScheduleState
	err := db.Get(&row, "SELECT interview_date, interview_time, interview_end_time, interview_mode, interviewer_name, meeting_link, interview_notes FROM applications WHERE id = ?", id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &row, nil
}

func SetRecruitmentInterviewSchedule(
	db *sqlx.DB,
	id int64,
	date string,
	timeStart string,
	timeEnd string,
	mode string,
	interviewer string,
	meetingLink string,
	notes string,
	now time.Time,
) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if now.IsZero() {
		now = time.Now()
	}
	_, err := db.Exec(
		`UPDATE applications SET interview_date=?, interview_time=?, interview_end_time=?, interview_mode=?, interviewer_name=?, meeting_link=?, interview_notes=?, interview_at=?, status='Interview', updated_at=? WHERE id = ?`,
		date,
		timeStart,
		timeEnd,
		mode,
		interviewer,
		meetingLink,
		notes,
		now,
		now,
		id,
	)
	return err
}

func GetRecruitmentApplicationSummary(db *sqlx.DB, id int64) (*RecruitmentApplicationSummary, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var row RecruitmentApplicationSummary
	err := db.Get(&row, "SELECT id, full_name, position, division, status FROM applications WHERE id = ?", id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &row, nil
}

func DeleteRecruitmentApplication(db *sqlx.DB, id int64) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("DELETE FROM applications WHERE id = ?", id)
	return err
}

func UpsertOnboardingChecklist(db *sqlx.DB, applicationID int64, contract, inventory, training int) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec(`
		INSERT INTO onboarding_checklists (application_id, contract_signed, inventory_handover, training_orientation, created_at, updated_at)
		VALUES (?, ?, ?, ?, NOW(), NOW())
		ON DUPLICATE KEY UPDATE contract_signed=VALUES(contract_signed), inventory_handover=VALUES(inventory_handover), training_orientation=VALUES(training_orientation), updated_at=NOW()
	`, applicationID, contract, inventory, training)
	return err
}

func GetOnboardingChecklistByApplicationID(db *sqlx.DB, applicationID int64) (*models.OnboardingChecklist, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var checklist models.OnboardingChecklist
	err := db.Get(&checklist, "SELECT * FROM onboarding_checklists WHERE application_id = ?", applicationID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &checklist, nil
}

func GetUserRoleByID(db *sqlx.DB, userID int64) (string, error) {
	if db == nil {
		return "", errors.New("database tidak tersedia")
	}
	var role string
	err := db.Get(&role, "SELECT role FROM users WHERE id = ?", userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return role, nil
}

func ListInterviewApplicationsByDate(db *sqlx.DB, currentID int64, date string) ([]models.Application, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.Application{}
	err := db.Select(&rows, "SELECT * FROM applications WHERE id != ? AND interview_date = ? AND interview_time IS NOT NULL", currentID, date)
	return rows, err
}

func UpdateUserToStaff(db *sqlx.DB, userID int64, employeeCode string, division *string) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("UPDATE users SET role = ?, employee_code = ?, division = ? WHERE id = ?", models.RoleStaff, employeeCode, recruitNullableStringPtr(division), userID)
	return err
}

func UpsertStaffProfileFromApplicant(db *sqlx.DB, userID int64, religion, gender *string, educationLevel string) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec(`
		INSERT INTO staff_profiles (user_id, religion, gender, education_level, created_at, updated_at)
		VALUES (?, ?, ?, ?, NOW(), NOW())
		ON DUPLICATE KEY UPDATE religion=VALUES(religion), gender=VALUES(gender), education_level=VALUES(education_level), updated_at=NOW()
	`, userID, recruitNullableStringPtr(religion), recruitNullableStringPtr(gender), recruitNullableString(educationLevel))
	return err
}

func recruitNullableStringPtr(value *string) any {
	if value == nil {
		return nil
	}
	return recruitNullableString(*value)
}

func recruitNullableString(value string) any {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return trimmed
}
