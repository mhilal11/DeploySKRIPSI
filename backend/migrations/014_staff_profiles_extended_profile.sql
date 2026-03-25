-- 014_staff_profiles_extended_profile.sql
ALTER TABLE staff_profiles
  ADD COLUMN phone VARCHAR(255) NULL AFTER user_id,
  ADD COLUMN date_of_birth DATE NULL AFTER phone,
  ADD COLUMN address TEXT NULL AFTER gender,
  ADD COLUMN domicile_address TEXT NULL AFTER address,
  ADD COLUMN city VARCHAR(255) NULL AFTER domicile_address,
  ADD COLUMN province VARCHAR(255) NULL AFTER city,
  ADD COLUMN educations JSON NULL AFTER education_level;

-- Sinkronisasi awal dari data pelamar (jika user staff berasal dari onboarding pelamar)
UPDATE staff_profiles sp
JOIN applicant_profiles ap ON ap.user_id = sp.user_id
SET
  sp.phone = COALESCE(sp.phone, ap.phone),
  sp.date_of_birth = COALESCE(sp.date_of_birth, ap.date_of_birth),
  sp.religion = COALESCE(sp.religion, ap.religion),
  sp.gender = COALESCE(sp.gender, ap.gender),
  sp.address = COALESCE(sp.address, ap.address),
  sp.domicile_address = COALESCE(sp.domicile_address, ap.domicile_address),
  sp.city = COALESCE(sp.city, ap.city),
  sp.province = COALESCE(sp.province, ap.province),
  sp.educations = COALESCE(sp.educations, ap.educations);
