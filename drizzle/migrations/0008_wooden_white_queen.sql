ALTER TABLE "public"."payments" ALTER COLUMN "provider" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."payment_provider";--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('stripe');--> statement-breakpoint
ALTER TABLE "public"."payments" ALTER COLUMN "provider" SET DATA TYPE "public"."payment_provider" USING "provider"::"public"."payment_provider";