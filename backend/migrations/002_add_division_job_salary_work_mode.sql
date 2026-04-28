ALTER TABLE division_profiles
  ADD COLUMN job_salary_min INT NULL AFTER job_eligibility_criteria,
  ADD COLUMN job_work_mode VARCHAR(32) NULL AFTER job_salary_min;

ALTER TABLE division_jobs
  ADD COLUMN job_salary_min INT NULL AFTER job_eligibility_criteria,
  ADD COLUMN job_work_mode VARCHAR(32) NULL AFTER job_salary_min;
