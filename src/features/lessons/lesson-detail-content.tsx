import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getCourseBySlug } from '@/features/courses/course-queries';
import { getCourseContentTree, listLessonsInOrder } from '@/features/courses/course-content-queries';
import { hasLessonAccess } from '@/features/lessons/require-lesson-access';
import { isUserEnrolledInCourse } from '@/features/enrollments/enrollment-queries';
import { computeCourseProgress, getCompletedLessonTimes } from '@/features/progress/course-progress-queries';
import { createLessonPdfViewUrl, getLessonPdfVersion } from '@/features/pdf/lesson-pdf-storage-client';
import { getLessonAudioTranscript } from '@/features/pdf/lesson-audio-transcript-queries';
import { getRequiredAssessmentStatuses } from '@/features/assessments/assessment-queries';
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

  // Everything else about the course for this learner, in one parallel wave of queries.
  const [modulesWithLessons, isEnrolled, completedAtByLessonId, assessmentStatuses] = await Promise.all([
    getCourseContentTree(courseRecord.id),
    isUserEnrolledInCourse(authenticatedUser.userId, courseRecord.id),
    getCompletedLessonTimes(authenticatedUser.userId, [courseRecord.id]),
    getRequiredAssessmentStatuses(authenticatedUser.userId, [courseRecord.id]),
  ]);

  const lessonsInOrder = listLessonsInOrder(modulesWithLessons);
  const lessonRecord = lessonsInOrder.find((lesson) => lesson.slug === lessonSlug);
  if (!lessonRecord) notFound();
  if (!hasLessonAccess(authenticatedUser, lessonRecord, courseRecord.ownerId, isEnrolled)) redirect(`${basePath}/${courseRecord.slug}`);

  const isOwnerOrAdmin = authenticatedUser.role === 'admin' || authenticatedUser.userId === courseRecord.ownerId;
  const hasFullAccess = isOwnerOrAdmin || isEnrolled;

  const progress = computeCourseProgress(
    lessonsInOrder.map((lesson) => lesson.id),
    completedAtByLessonId,
  );
  const completedLessonIds = new Set(completedAtByLessonId.keys());
  const isCompleted = completedLessonIds.has(lessonRecord.id);
  const isCourseComplete = hasFullAccess && progress.completedAt !== null;
  const assessmentStatus = assessmentStatuses.get(courseRecord.id);
  const assessment = isCourseComplete ? (assessmentStatus?.assessment ?? null) : null;
  const hasPassedAssessment = isCourseComplete ? (assessmentStatus?.hasPassed ?? true) : false;

  const pdfStoragePath = lessonRecord.contentType === 'pdf' ? lessonRecord.pdfStoragePath : null;
  const [pdfViewUrl, pdfVersion, cachedAudioPages] = pdfStoragePath
    ? await Promise.all([
        createLessonPdfViewUrl(pdfStoragePath),
        getLessonPdfVersion(pdfStoragePath),
        getLessonAudioTranscript(lessonRecord.id),
      ])
    : [null, null, null];

  return (
    <div className="mx-auto max-w-6xl px-4">
      <Link href={`${basePath}/${courseRecord.slug}`} className="text-xs font-semibold uppercase tracking-wide text-navy-800 hover:underline">
        &larr; {courseRecord.title}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
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
                  <PdfAudioPlayer
                    fileUrl={pdfViewUrl}
                    pdfVersion={pdfVersion ?? 'unknown'}
                    lessonId={lessonRecord.id}
                    cachedPages={cachedAudioPages}
                  />
                  <PdfViewer fileUrl={pdfViewUrl} lessonId={lessonRecord.id} pdfVersion={pdfVersion ?? 'unknown'} />
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
