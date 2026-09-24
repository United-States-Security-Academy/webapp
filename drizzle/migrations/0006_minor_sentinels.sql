CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'preferNotToSay');--> statement-breakpoint
CREATE TYPE "public"."government_id_type" AS ENUM('ssnLastFour', 'texasDriversLicense', 'texasIdCard');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"legal_name" text,
	"government_id_type" "government_id_type",
	"government_id_value" text,
	"gender" "gender",
	"date_of_birth" date,
	"phone_number" text,
	"country" text,
	"state" text,
	"city" text,
	"residential_address" text,
	"photo_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
