import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getCourseBySlug } from '@/features/courses/course-queries';
import { getCourseContentTree } from '@/features/courses/course-content-queries';
import { getLessonBySlugInCourse } from '@/features/lessons/lesson-queries';
import { requireLessonAccess } from '@/features/lessons/require-lesson-access';
import { isUserEnrolledInCourse } from '@/features/enrollments/enrollment-queries';
import { getCourseModuleProgress, getCompletedLessonIds } from '@/features/progress/course-progress-queries';
import { createLessonPdfViewUrl } from '@/features/pdf/lesson-pdf-storage-client';
import { getLessonAudioTranscript } from '@/features/pdf/lesson-audio-transcript-queries';
import { getAssessmentByCourseId, hasPassedRequiredAssessment } from '@/features/assessments/assessment-queries';
import { ApiError } from '@/api-response/api-error';
import { PdfViewer } from '@/features/pdf/lesson-pdf-viewer-lazy';
import { PdfAudioPlayer } from '@/features/pdf/pdf-audio-player';
import { MarkDoneButton } from '@/features/progress/mark-done-button';
import { CourseContentSidebar } from '@/features/courses/course-content-sidebar';

interface LessonDetailContentProps {
  courseSlug: string;
  lessonSlug: string;
  // '/courses' for the public marketing catalog, '/dashboard/courses' for the signed-in app shell.
  basePath: string;
}

export async function LessonDetailContent({ courseSlug, lessonSlug, basePath }: LessonDetailContentProps) {
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');

  const courseRecord = await getCourseBySlug(courseSlug);
  if (!courseRecord) notFound();

  const lessonRecord = await getLessonBySlugInCourse(courseRecord.id, lessonSlug);
  if (!lessonRecord) notFound();

  try {
    await requireLessonAccess(authenticatedUser, lessonRecord, courseRecord.id);
  } catch (error) {
    if (error instanceof ApiError) redirect(`${basePath}/${courseRecord.slug}`);
    throw error;
  }

  const isOwnerOrAdmin = authenticatedUser.role === 'admin' || authenticatedUser.userId === courseRecord.ownerId;
  const isEnrolled = await isUserEnrolledInCourse(authenticatedUser.userId, courseRecord.id);
  const hasFullAccess = isOwnerOrAdmin || isEnrolled;

  const [modulesWithLessons, progress, completedLessonIds] = await Promise.all([
    getCourseContentTree(courseRecord.id),
    getCourseModuleProgress(authenticatedUser.userId, courseRecord.id),
    getCompletedLessonIds(authenticatedUser.userId, courseRecord.id),
  ]);
  const isCompleted = completedLessonIds.has(lessonRecord.id);
  const isCourseComplete = hasFullAccess && progress.completedAt !== null;
  const assessment = isCourseComplete ? await getAssessmentByCourseId(courseRecord.id) : null;
  const hasPassedAssessment = isCourseComplete ? await hasPassedRequiredAssessment(authenticatedUser.userId, courseRecord.id) : false;

  const pdfViewUrl =
    lessonRecord.contentType === 'pdf' && lessonRecord.pdfStoragePath ? await createLessonPdfViewUrl(lessonRecord.pdfStoragePath) : null;
  const cachedAudioPages = pdfViewUrl ? await getLessonAudioTranscript(lessonRecord.id) : null;

  return (
    <div className="mx-auto max-w-6xl px-4">
      <Link href={`${basePath}/${courseRecord.slug}`} className="text-xs font-semibold uppercase tracking-wide text-navy-800 hover:underline">
        &larr; {courseRecord.title}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[320px_1fr]">
        <CourseContentSidebar
          courseSlug={courseRecord.slug}
          basePath={basePath}
          modulesWithLessons={modulesWithLessons}
          completedLessonIds={completedLessonIds}
          hasFullAccess={hasFullAccess}
          currentLessonId={lessonRecord.id}
          progress={progress}
        />

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{lessonRecord.title}</h1>
            <MarkDoneButton lessonId={lessonRecord.id} isCompleted={isCompleted} />
          </div>

          {isCourseComplete && hasPassedAssessment && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gold-500/10 px-4 py-3">
              <p className="text-sm font-semibold text-navy-900">You&apos;ve passed the exam for this course.</p>
              <Link
                href={`/dashboard/certificates/${courseRecord.slug}`}
                className="inline-flex items-center gap-1 rounded-md bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950 hover:bg-gold-400"
              >
                View Certificate <span aria-hidden>&rarr;</span>
              </Link>
            </div>
          )}
          {isCourseComplete && !hasPassedAssessment && assessment && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gold-500/10 px-4 py-3">
              <p className="text-sm font-semibold text-navy-900">You&apos;ve completed every lesson in this course.</p>
              <Link
                href={`${basePath}/${courseRecord.slug}/assessment`}
                className="inline-flex items-center gap-1 rounded-md bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950 hover:bg-gold-400"
              >
                Take Exam <span aria-hidden>&rarr;</span>
              </Link>
            </div>
          )}

          <div className="mt-6">
            {lessonRecord.contentType === 'pdf' ? (
              pdfViewUrl ? (
                <div className="flex flex-col gap-4">
                  <PdfAudioPlayer fileUrl={pdfViewUrl} lessonId={lessonRecord.id} cachedPages={cachedAudioPages} />
                  <PdfViewer fileUrl={pdfViewUrl} />
                </div>
              ) : (
                <p className="text-sm text-slate-500">This lesson&apos;s document has not been uploaded yet.</p>
              )
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-lg bg-navy-950 text-sm text-slate-300">
                Video playback is coming soon.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
