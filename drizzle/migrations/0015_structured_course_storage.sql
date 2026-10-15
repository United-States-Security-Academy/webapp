-- Private Storage buckets for structured courses: the uploaded .docx source of each module
-- revision, and the images extracted from it. Same model as lesson-pdfs: no storage.objects
-- policies are added, so the browser's anon/authenticated keys can neither list, read nor write
-- these files. The server uploads and reads them with the service role and hands students
-- short-lived signed URLs only for content they are allowed to see.
-- ON CONFLICT DO NOTHING keeps this safe to run where a bucket was already made in the dashboard.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'structured-course-sources',
  'structured-course-sources',
  false,
  26214400,
  ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'structured-lesson-images',
  'structured-lesson-images',
  false,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
