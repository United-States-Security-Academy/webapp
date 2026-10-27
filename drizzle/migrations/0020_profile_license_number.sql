-- Optional license number on student profiles ("if applicable"). Nullable, existing rows stay
-- null, and it is not part of profile completeness. Additive only.
ALTER TABLE "student_profiles" ADD COLUMN "license_number" text;