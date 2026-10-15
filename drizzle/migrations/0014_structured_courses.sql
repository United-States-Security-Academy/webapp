CREATE TYPE "public"."course_delivery_format" AS ENUM('pdf', 'structured');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "structured_lesson_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"lesson_key" text NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "structured_module_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"source_file_name" text NOT NULL,
	"source_storage_path" text NOT NULL,
	"content" jsonb NOT NULL,
	"parse_warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "structured_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"published_revision_id" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "delivery_format" "course_delivery_format" DEFAULT 'pdf' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "structured_lesson_progress" ADD CONSTRAINT "structured_lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "structured_lesson_progress" ADD CONSTRAINT "structured_lesson_progress_module_id_structured_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."structured_modules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "structured_module_revisions" ADD CONSTRAINT "structured_module_revisions_module_id_structured_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."structured_modules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "structured_module_revisions" ADD CONSTRAINT "structured_module_revisions_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "structured_modules" ADD CONSTRAINT "structured_modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "structured_modules" ADD CONSTRAINT "structured_modules_published_revision_id_structured_module_revisions_id_fk" FOREIGN KEY ("published_revision_id") REFERENCES "public"."structured_module_revisions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "structured_lesson_progress_user_id_module_id_lesson_key_unique" ON "structured_lesson_progress" USING btree ("user_id","module_id","lesson_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "structured_module_revisions_module_id_index" ON "structured_module_revisions" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "structured_modules_course_id_index" ON "structured_modules" USING btree ("course_id");--> statement-breakpoint
-- Like every app table, keep the new ones closed to Supabase's public Data API (see 0012).
ALTER TABLE "structured_modules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "structured_module_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "structured_lesson_progress" ENABLE ROW LEVEL SECURITY;
