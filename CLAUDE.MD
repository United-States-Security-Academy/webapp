## Structured courses (new feature)

Goal: admins upload course material as Word (.docx) files, and students see it as
interactive lessons instead of static PDFs. This replaces the PDF experience course
by course.

### Hard rules
- The app is live and students are taking PDF courses right now. The existing PDF
  course flow (admin upload, student viewer, progress) must keep working unchanged.
- All database changes are additive: new tables and new nullable columns or columns
  with safe defaults. Never drop, rename, or change existing tables, columns, or data.
- Reuse the existing tables for users, roles, courses and enrollments. Do not create
  duplicates of them.
- Each course has a delivery_format: 'pdf' (current behaviour) or 'structured' (new).
  Existing courses default to 'pdf'.
- Structured content is invisible to students until an admin publishes it.
- No AI or LLM is used to convert content. Parsing is deterministic, based on Word
  heading styles and the markers below.
- Final assessment grading happens only on the server. Correct answers for the final
  assessment are never sent to the browser.
- Follow the existing code style, folder structure, auth checks and UI components.
- Who can upload and publish: the course owner or an admin (requireCourseOwnership),
  the same rule as the rest of the course tools under /instructor.
- Existing courses stay on 'pdf'. Switching a course to 'structured' is a deliberate
  admin action, allowed only once every structured module has a published version.

### Authoring template (what admins upload)
- One .docx file = one module. Reject .doc files with the message:
  "Please open this file in Word, use File → Save As → Word Document (.docx), and upload again."
- Heading 1 = module title (exactly one per file).
- Heading 2 = lesson. Heading 3 = section within a lesson.
- Normal paragraph = text. Numbered list = steps. Bulleted list = points.
- Table = table. Image = image (uploaded to Supabase Storage). Images must be PNG,
  JPEG, GIF or WebP and at most 10 MB; others (e.g. EMF charts) are reported as errors.
- Everything after the Heading 1 must sit under a Heading 2; text before the first
  lesson is an error, not silently dropped.
- Paragraph starting with "Note:" or "Warning:" = callout.
- Optional quiz inside a lesson:
  [QUIZ]
  Q: Question text
  A) Option
  *B) Correct option (marked with *)
  C) Option
  Explain: Why the answer is correct
  [/QUIZ]
  One quiz block can contain several questions.
- Final assessment: structured courses use the existing course assessment (the
  course_assessments tables and the exam editor at /instructor/courses/[slug]/assessment).
  The organisation writes these exams; they are not generated from the course material.
  An import option (CSV or the [QUIZ] format) may be added later alongside the editor.

### Upload and publish flow
- The browser uploads the .docx to the private source bucket, then the
  server converts it. Each upload is a revision with status processing / ready /
  failed; a failed upload lists every problem, worded for a non-technical admin, and
  leaves the previous ready draft in place. Lesson identity across re-uploads is the
  slug of the lesson title, so learners keep progress on lessons that weren't renamed.
- Publishing points a module at the exact revision the admin previewed. A module can't
  be unpublished while its course is 'structured', and a module with student progress
  can't be deleted. Switching delivery_format never deletes PDF lessons or progress.
- The lesson player (src/features/structured-courses/player) is shared by the admin
  preview and the student page. Inline practice quizzes may send answers to the
  browser; the final assessment never does.
- Students: structured lessons live at /dashboard/courses/[slug]/learn/[moduleId]/[lessonKey]
  (and the same under /courses). A lesson is complete once the student reaches its end
  with every inline quiz answered; the server re-checks the answers before saving. Course
  progress for the exam, certificate, dashboard and admin pages comes from
  getLearnerCourseProgress / the structured outline when the course is 'structured'.
- Server Actions copy only the fields their form sends (pickFields in src/pick-fields.ts)
  before writing to the database; never pass an action's input object straight to
  insert/update.

### Block types
heading, text, steps, points, table, image, callout, quiz

### Libraries
mammoth (docx → html), cheerio (html → blocks), zod (validation),
framer-motion (animation; respect prefers-reduced-motion)