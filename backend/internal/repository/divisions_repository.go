package db

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"hris-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type CreateDivisionProfileInput struct {
	Name        string
	Description *string
	ManagerName *string
	Capacity    int
	Now         time.Time
}

type UpdateDivisionProfileInput struct {
	ID          int64
	Description *string
	ManagerName *string
	Capacity    int
	UpdatedAt   time.Time
}

type DivisionJobMutationInput struct {
	ID                int64
	DivisionProfileID int64
	JobTitle          string
	JobDescription    string
	JobRequirements   string
	JobEligibility    string
	Now               time.Time
}

func CountActiveDivisionUsers(db *sqlx.DB, divisionName string) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM users WHERE division = ? AND role IN (?, ?)", divisionName, models.RoleAdmin, models.RoleStaff)
	return count, wrapRepoErr("count active division users", err)
}

func UpdateDivisionProfileCapacity(db *sqlx.DB, id int64, capacity int, updatedAt time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if updatedAt.IsZero() {
		updatedAt = time.Now()
	}
	_, err := db.Exec("UPDATE division_profiles SET capacity = ?, updated_at = ? WHERE id = ?", capacity, updatedAt, id)
	return wrapRepoErr("update division profile capacity", err)
}

func FindDivisionProfileIDByName(db *sqlx.DB, name string) (*int64, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var id int64
	err := db.Get(&id, "SELECT id FROM division_profiles WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1", name)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("find division profile id by name", err)
	}
	return &id, nil
}

func CreateDivisionProfile(db *sqlx.DB, input CreateDivisionProfileInput) (int64, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	if input.Now.IsZero() {
		input.Now = time.Now()
	}
	result, err := db.Exec(
		"INSERT INTO division_profiles (name, description, manager_name, capacity, is_hiring, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)",
		input.Name,
		input.Description,
		input.ManagerName,
		input.Capacity,
		input.Now,
		input.Now,
	)
	if err != nil {
		return 0, wrapRepoErr("create division profile insert", err)
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, wrapRepoErr("create division profile last insert id", err)
	}
	return id, nil
}

func CountDepartemenByName(db *sqlx.DB, name string) (int, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM departemen WHERE LOWER(TRIM(nama)) = LOWER(TRIM(?))", name)
	return count, wrapRepoErr("count departemen by name", err)
}

func CreateDepartemen(db *sqlx.DB, name, code string, now time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if now.IsZero() {
		now = time.Now()
	}
	_, err := db.Exec("INSERT INTO departemen (nama, kode, created_at, updated_at) VALUES (?, ?, ?, ?)", name, code, now, now)
	return wrapRepoErr("create departemen", err)
}

func GetDivisionProfileByID(db *sqlx.DB, id int64) (*models.DivisionProfile, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var row models.DivisionProfile
	err := db.Get(&row, "SELECT * FROM division_profiles WHERE id = ?", id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("get division profile by id", err)
	}
	return &row, nil
}

func UpdateDivisionProfile(db *sqlx.DB, input UpdateDivisionProfileInput) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if input.UpdatedAt.IsZero() {
		input.UpdatedAt = time.Now()
	}
	_, err := db.Exec(
		"UPDATE division_profiles SET description = ?, manager_name = ?, capacity = ?, updated_at = ? WHERE id = ?",
		input.Description,
		input.ManagerName,
		input.Capacity,
		input.UpdatedAt,
		input.ID,
	)
	return wrapRepoErr("update division profile", err)
}

func DeleteDivisionProfileByID(db *sqlx.DB, id int64) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	_, err := db.Exec("DELETE FROM division_profiles WHERE id = ?", id)
	return wrapRepoErr("delete division profile by id", err)
}

func GetActiveDivisionJobByID(db *sqlx.DB, jobID, divisionID int64) (*models.DivisionJob, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var row models.DivisionJob
	err := db.Get(&row, "SELECT * FROM division_jobs WHERE id = ? AND division_profile_id = ? AND is_active = 1 LIMIT 1", jobID, divisionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("get active division job by id", err)
	}
	return &row, nil
}

func GetDivisionJobByID(db *sqlx.DB, jobID, divisionID int64) (*models.DivisionJob, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var row models.DivisionJob
	err := db.Get(&row, "SELECT * FROM division_jobs WHERE id = ? AND division_profile_id = ? LIMIT 1", jobID, divisionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("get division job by id", err)
	}
	return &row, nil
}

func UpdateDivisionJob(db *sqlx.DB, input DivisionJobMutationInput) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if input.Now.IsZero() {
		input.Now = time.Now()
	}
	_, err := db.Exec(
		`UPDATE division_jobs
		 SET job_title = ?, job_description = ?, job_requirements = ?, job_eligibility_criteria = ?, updated_at = ?
		 WHERE id = ? AND division_profile_id = ?`,
		input.JobTitle,
		input.JobDescription,
		input.JobRequirements,
		input.JobEligibility,
		input.Now,
		input.ID,
		input.DivisionProfileID,
	)
	return wrapRepoErr("update division job", err)
}

func CreateDivisionJob(db *sqlx.DB, input DivisionJobMutationInput) (int64, error) {
	if db == nil {
		return 0, errors.New("database tidak tersedia")
	}
	if input.Now.IsZero() {
		input.Now = time.Now()
	}
	result, err := db.Exec(
		`INSERT INTO division_jobs (division_profile_id, job_title, job_description, job_requirements, job_eligibility_criteria, is_active, opened_at, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
		input.DivisionProfileID,
		input.JobTitle,
		input.JobDescription,
		input.JobRequirements,
		input.JobEligibility,
		input.Now,
		input.Now,
		input.Now,
	)
	if err != nil {
		return 0, wrapRepoErr("create division job insert", err)
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, wrapRepoErr("create division job last insert id", err)
	}
	return id, nil
}

func DeactivateDivisionJob(db *sqlx.DB, divisionID, jobID int64, at time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if at.IsZero() {
		at = time.Now()
	}
	_, err := db.Exec(
		"UPDATE division_jobs SET is_active = 0, closed_at = ?, updated_at = ? WHERE id = ? AND division_profile_id = ?",
		at,
		at,
		jobID,
		divisionID,
	)
	return wrapRepoErr("deactivate division job", err)
}

func DeactivateAllDivisionJobs(db *sqlx.DB, divisionID int64, at time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if at.IsZero() {
		at = time.Now()
	}
	_, err := db.Exec(
		"UPDATE division_jobs SET is_active = 0, closed_at = ?, updated_at = ? WHERE division_profile_id = ? AND is_active = 1",
		at,
		at,
		divisionID,
	)
	return wrapRepoErr("deactivate all division jobs", err)
}

func ReactivateDivisionJob(db *sqlx.DB, divisionID, jobID int64, at time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if at.IsZero() {
		at = time.Now()
	}
	_, err := db.Exec(
		"UPDATE division_jobs SET is_active = 1, opened_at = ?, closed_at = NULL, updated_at = ? WHERE id = ? AND division_profile_id = ?",
		at,
		at,
		jobID,
		divisionID,
	)
	return wrapRepoErr("reactivate division job", err)
}

func ListActiveDivisionJobs(db *sqlx.DB) ([]models.DivisionJob, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	rows := []models.DivisionJob{}
	err := db.Select(&rows, "SELECT * FROM division_jobs WHERE is_active = 1 ORDER BY opened_at DESC, id DESC")
	if err != nil {
		if strings.Contains(err.Error(), "doesn't exist") {
			return []models.DivisionJob{}, nil
		}
		return nil, wrapRepoErr("list active division jobs", err)
	}
	return rows, nil
}

func ListActiveDivisionJobsByDivisionIDs(db *sqlx.DB, divisionIDs []int64) ([]models.DivisionJob, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if len(divisionIDs) == 0 {
		return []models.DivisionJob{}, nil
	}

	query, args, err := sqlx.In(
		"SELECT * FROM division_jobs WHERE is_active = 1 AND division_profile_id IN (?) ORDER BY opened_at DESC, id DESC",
		divisionIDs,
	)
	if err != nil {
		return nil, wrapRepoErr("list active division jobs by division ids build query", err)
	}

	query = db.Rebind(query)
	rows := []models.DivisionJob{}
	err = db.Select(&rows, query, args...)
	if err != nil {
		if strings.Contains(err.Error(), "doesn't exist") {
			return []models.DivisionJob{}, nil
		}
		return nil, wrapRepoErr("list active division jobs by division ids", err)
	}
	return rows, nil
}

func ListDivisionJobsByDivisionIDs(db *sqlx.DB, divisionIDs []int64) ([]models.DivisionJob, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	if len(divisionIDs) == 0 {
		return []models.DivisionJob{}, nil
	}

	query, args, err := sqlx.In(
		"SELECT * FROM division_jobs WHERE division_profile_id IN (?) ORDER BY division_profile_id ASC, is_active DESC, COALESCE(opened_at, created_at) DESC, id DESC",
		divisionIDs,
	)
	if err != nil {
		return nil, wrapRepoErr("list division jobs by division ids build query", err)
	}

	query = db.Rebind(query)
	rows := []models.DivisionJob{}
	err = db.Select(&rows, query, args...)
	if err != nil {
		if strings.Contains(err.Error(), "doesn't exist") {
			return []models.DivisionJob{}, nil
		}
		return nil, wrapRepoErr("list division jobs by division ids", err)
	}
	return rows, nil
}

func GetPrimaryActiveDivisionJob(db *sqlx.DB, divisionID int64) (*models.DivisionJob, error) {
	if db == nil {
		return nil, errors.New("database tidak tersedia")
	}
	var row models.DivisionJob
	err := db.Get(&row, "SELECT * FROM division_jobs WHERE division_profile_id = ? AND is_active = 1 ORDER BY opened_at DESC, id DESC LIMIT 1", divisionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, wrapRepoErr("get primary active division job", err)
	}
	return &row, nil
}

func ClearDivisionProfilePrimaryJob(db *sqlx.DB, divisionID int64, updatedAt time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if updatedAt.IsZero() {
		updatedAt = time.Now()
	}
	_, err := db.Exec(
		`UPDATE division_profiles
		 SET is_hiring = 0,
		     job_title = NULL,
		     job_description = NULL,
		     job_requirements = NULL,
		     job_eligibility_criteria = NULL,
		     hiring_opened_at = NULL,
		     updated_at = ?
		 WHERE id = ?`,
		updatedAt,
		divisionID,
	)
	return wrapRepoErr("clear division profile primary job", err)
}

func SetDivisionProfilePrimaryJob(db *sqlx.DB, divisionID int64, job models.DivisionJob, updatedAt time.Time) error {
	if db == nil {
		return errors.New("database tidak tersedia")
	}
	if updatedAt.IsZero() {
		updatedAt = time.Now()
	}
	openedAt := job.OpenedAt
	if openedAt == nil {
		openedAt = &updatedAt
	}
	_, err := db.Exec(
		`UPDATE division_profiles
		 SET is_hiring = 1,
		     job_title = ?,
		     job_description = ?,
		     job_requirements = ?,
		     job_eligibility_criteria = ?,
		     hiring_opened_at = ?,
		     updated_at = ?
		 WHERE id = ?`,
		job.JobTitle,
		job.JobDescription,
		job.JobRequirements,
		job.JobEligibility,
		openedAt,
		updatedAt,
		divisionID,
	)
	return wrapRepoErr("set division profile primary job", err)
}
