ALTER TABLE staff_profiles
  ADD COLUMN profile_photo_path VARCHAR(255) NULL AFTER educations;

UPDATE staff_profiles sp
JOIN applicant_profiles ap ON ap.user_id = sp.user_id
SET sp.profile_photo_path = COALESCE(sp.profile_photo_path, ap.profile_photo_path);
