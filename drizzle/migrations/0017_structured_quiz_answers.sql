-- Saves which published revision a student completed a structured lesson in, and their inline
-- quiz answers. Only touches the new structured_lesson_progress table from 0014.
ALTER TABLE "structured_lesson_progress" ADD COLUMN "revision_id" uuid;--> statement-breakpoint
ALTER TABLE "structured_lesson_progress" ADD COLUMN "quiz_answers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "structured_lesson_progress" ADD CONSTRAINT "structured_lesson_progress_revision_id_structured_module_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."structured_module_revisions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
