-- Upload status for structured module revisions (processing / ready / failed) and the list of
-- problems shown to the admin when a file can't be converted. Only touches the new
-- structured_module_revisions table from 0014; content becomes nullable because a failed or
-- still-processing upload has none.
CREATE TYPE "public"."structured_revision_status" AS ENUM('processing', 'ready', 'failed');--> statement-breakpoint
ALTER TABLE "structured_module_revisions" ALTER COLUMN "content" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "structured_module_revisions" ADD COLUMN "status" "structured_revision_status" DEFAULT 'processing' NOT NULL;--> statement-breakpoint
ALTER TABLE "structured_module_revisions" ADD COLUMN "parse_errors" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "structured_module_revisions" ADD COLUMN "processed_at" timestamp with time zone;