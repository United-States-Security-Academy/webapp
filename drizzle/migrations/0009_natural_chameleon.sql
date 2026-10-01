ALTER TABLE "student_profiles" DROP COLUMN IF EXISTS "gender";--> statement-breakpoint
ALTER TABLE "student_profiles" DROP COLUMN IF EXISTS "date_of_birth";--> statement-breakpoint
DROP TYPE "public"."gender";