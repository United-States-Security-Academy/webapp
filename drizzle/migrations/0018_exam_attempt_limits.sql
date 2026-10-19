-- Exam attempt limits: an optional max_attempts on each course assessment (null = unlimited, so
-- existing exams are unchanged) and a table recording when an admin reset a learner's attempts.
-- Additive only.
CREATE TABLE IF NOT EXISTS "assessment_attempt_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reset_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reset_by" uuid
);
--> statement-breakpoint
ALTER TABLE "course_assessments" ADD COLUMN "max_attempts" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_attempt_resets" ADD CONSTRAINT "assessment_attempt_resets_assessment_id_course_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."course_assessments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_attempt_resets" ADD CONSTRAINT "assessment_attempt_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_attempt_resets" ADD CONSTRAINT "assessment_attempt_resets_reset_by_users_id_fk" FOREIGN KEY ("reset_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_attempt_resets_assessment_id_user_id_unique" ON "assessment_attempt_resets" USING btree ("assessment_id","user_id");--> statement-breakpoint
-- Like every app table, keep it closed to Supabase's public Data API (see 0012).
ALTER TABLE "assessment_attempt_resets" ENABLE ROW LEVEL SECURITY;
