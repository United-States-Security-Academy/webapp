-- Lock every app table away from Supabase's public Data API (the anon/authenticated keys that ship
-- in the browser). With RLS on and no policies, those keys can neither read nor write any row.
-- The app itself is unaffected: it connects directly as the table-owning `postgres` role, which
-- bypasses RLS. Any new table added later must also get ENABLE ROW LEVEL SECURITY.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "student_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "modules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lessons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lesson_audio_transcripts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lesson_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "enrollments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "course_assessments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assessment_questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assessment_choices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assessment_attempt_answers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_code_redemptions" ENABLE ROW LEVEL SECURITY;
