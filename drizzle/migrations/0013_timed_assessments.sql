CREATE TABLE IF NOT EXISTS "assessment_timed_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"draft_answers" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_assessments" ADD COLUMN "time_limit_minutes" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_timed_sessions" ADD CONSTRAINT "assessment_timed_sessions_assessment_id_course_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."course_assessments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_timed_sessions" ADD CONSTRAINT "assessment_timed_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_timed_sessions_assessment_id_user_id_unique" ON "assessment_timed_sessions" USING btree ("assessment_id","user_id");--> statement-breakpoint
-- Like every app table, keep the new one closed to Supabase's public Data API (see 0012).
ALTER TABLE "assessment_timed_sessions" ENABLE ROW LEVEL SECURITY;
