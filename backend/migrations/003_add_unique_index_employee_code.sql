UPDATE users
SET employee_code = TRIM(employee_code)
WHERE employee_code IS NOT NULL;

UPDATE users
SET employee_code = NULL
WHERE employee_code = '';

UPDATE users u
JOIN (
  SELECT employee_code, MIN(id) AS keep_id
  FROM users
  WHERE employee_code IS NOT NULL
  GROUP BY employee_code
  HAVING COUNT(*) > 1
) dup
  ON dup.employee_code = u.employee_code
SET u.employee_code = CONCAT(u.employee_code, '-', u.id)
WHERE u.id <> dup.keep_id;

SET @employee_code_unique_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND index_name = 'users_employee_code_unique'
);

SET @employee_code_unique_sql := IF(
  @employee_code_unique_exists = 0,
  'ALTER TABLE users ADD UNIQUE KEY users_employee_code_unique (employee_code)',
  'SELECT 1'
);

PREPARE employee_code_unique_stmt FROM @employee_code_unique_sql;
EXECUTE employee_code_unique_stmt;
DEALLOCATE PREPARE employee_code_unique_stmt;
