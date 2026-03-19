-- 011_onboarding_checklists_unique_application_id.sql
-- Bersihkan duplikasi checklist lama dan paksa 1 row per application.

DELETE old_row
FROM onboarding_checklists old_row
JOIN onboarding_checklists keep_row
  ON old_row.application_id = keep_row.application_id
 AND (
      COALESCE(old_row.updated_at, old_row.created_at, '1970-01-01 00:00:00') <
      COALESCE(keep_row.updated_at, keep_row.created_at, '1970-01-01 00:00:00')
   OR (
      COALESCE(old_row.updated_at, old_row.created_at, '1970-01-01 00:00:00') =
      COALESCE(keep_row.updated_at, keep_row.created_at, '1970-01-01 00:00:00')
      AND old_row.id < keep_row.id
   )
 );

ALTER TABLE onboarding_checklists
  ADD UNIQUE KEY onboarding_checklists_application_id_unique (application_id);
