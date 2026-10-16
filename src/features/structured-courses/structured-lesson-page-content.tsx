import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getCourseBySlug } from '@/features/courses/course-queries';
import { isUserEnrolledInCourse } from '@/features/enrollments/enrollment-queries';
import { ProgressBar } from '@/components/ui/progress-bar';
import { getPublishedStructuredLesson, getStructuredCourseOutlines } from './structured-course-outline-queries';
import { buildStructuredLessonHref, computeStructuredCourseProgress, findLessonPosition } from './structured-course-progress';
import { hasStructuredCourseAccess, isUuid } from './structured-lesson-access';
import { collectImageStoragePaths } from './structured-module-queries';
import { createLessonImageViewUrls } from './structured-course-storage-client';
import { StructuredLessonView } from './structured-lesson-view';

interface StructuredLessonPageContentProps {
  courseSlug: string;
  moduleId: string;
  lessonKey: string;
  // '/courses' for the public catalog, '/dashboard/courses' for the signed-in app shell.
  basePath: string;
}

// A structured lesson for a student. Every check happens here on the server before anything is
// rendered: signed in, course delivered as structured lessons, enrolled (or owner/admin), and the
// lesson part of a published module of this course.
export async function StructuredLessonPageContent({ courseSlug, moduleId, lessonKey, basePath }: StructuredLessonPageContentProps) {
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');

  const courseRecord = await getCourseBySlug(courseSlug);
  if (!courseRecord) notFound();
  const courseHref = `${basePath}/${courseRecord.slug}`;
  if (courseRecord.deliveryFormat !== 'structured') redirect(courseHref);
  if (!isUuid(moduleId)) notFound();

  const isEnrolled = await isUserEnrolledInCourse(authenticatedUser.userId, courseRecord.id);
  if (!hasStructuredCourseAccess(authenticatedUser, courseRecord, isEnrolled)) redirect(courseHref);

  const [publishedLesson, outlines] = await Promise.all([
    getPublishedStructuredLesson(moduleId, lessonKey),
    getStructuredCourseOutlines([courseRecord.id], authenticatedUser.userId),
  ]);
  if (!publishedLesson || publishedLesson.courseId !== courseRecord.id) notFound();

  const outline = outlines.get(courseRecord.id) ?? [];
  const position = findLessonPosition(outline, moduleId, lessonKey);
  if (!position) notFound();
  const progress = computeStructuredCourseProgress(outline);
  const imageUrls = Object.fromEntries(
    await createLessonImageViewUrls(collectImageStoragePaths({ title: publishedLesson.moduleTitle, lessons: [publishedLesson.lesson] })),
  );

  return (
    <div>
      {/* Stays at the top while scrolling, so the student always sees where they are. */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <Link href={courseHref} className="min-w-0 truncate font-semibold uppercase tracking-wide text-navy-800 hover:underline">
              &larr; {courseRecord.title}
            </Link>
            <span className="shrink-0 text-slate-500">
              Lesson {position.number} of {position.total}
            </span>
          </div>
          <ProgressBar completed={progress.completedLessons} total={progress.totalLessons} />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{publishedLesson.moduleTitle}</p>
        <StructuredLessonView
          key={`${moduleId}/${lessonKey}`}
          moduleId={moduleId}
          lesson={publishedLesson.lesson}
          imageUrls={imageUrls}
          isCompleted={position.lesson.completedAt !== null}
        />

        {progress.completedAt && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gold-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-navy-900">You&apos;ve completed every lesson in this course.</p>
            <Link
              href={courseHref}
              className="inline-flex items-center gap-1 rounded-md bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950 hover:bg-gold-400"
            >
              Go to the exam and certificate <span aria-hidden>&rarr;</span>
            </Link>
          </div>
        )}

        <nav aria-label="Lesson navigation" className="mt-8 grid grid-cols-2 gap-3 border-t border-slate-200 pt-6">
          {position.previous ? (
            <Link
              href={buildStructuredLessonHref(basePath, courseRecord.slug, position.previous)}
              className="flex min-h-[3.5rem] flex-col justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-navy-800"
            >
              <span className="text-xs text-slate-500">&larr; Previous</span>
              <span className="line-clamp-2 text-sm font-medium text-slate-900">{position.previous.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {position.next ? (
            <Link
              href={buildStructuredLessonHref(basePath, courseRecord.slug, position.next)}
              className="flex min-h-[3.5rem] flex-col items-end justify-center rounded-lg border border-navy-800 bg-navy-900 px-3 py-2 text-right text-white hover:bg-navy-800"
            >
              <span className="text-xs text-slate-300">Next &rarr;</span>
              <span className="line-clamp-2 text-sm font-medium">{position.next.title}</span>
            </Link>
          ) : (
            <Link
              href={courseHref}
              className="flex min-h-[3.5rem] flex-col items-end justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-right hover:border-navy-800"
            >
              <span className="text-xs text-slate-500">Finished</span>
              <span className="text-sm font-medium text-slate-900">Back to the course</span>
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
