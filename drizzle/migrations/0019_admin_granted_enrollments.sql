-- Admin-granted course access: a nullable granted_by on enrollments recording the admin who gave
-- a learner access from the admin console. Existing enrollments stay null. Additive only.
ALTER TABLE "enrollments" ADD COLUMN "granted_by" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
