import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getCourseBySlug } from '@/features/courses/course-queries';
import { getCourseContentTree } from '@/features/courses/course-content-queries';
import { isUserEnrolledInCourse } from '@/features/enrollments/enrollment-queries';
import { getCourseModuleProgress, getCompletedLessonIds } from '@/features/progress/course-progress-queries';
import { getAssessmentByCourseId, hasPassedRequiredAssessment } from '@/features/assessments/assessment-queries';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { EnrollButton } from '@/features/enrollments/enroll-button';
import { CheckoutButton } from '@/features/payments/checkout-button';

function formatCoursePrice(priceAmountMinor: number, currency: string): string {
  if (priceAmountMinor === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(priceAmountMinor / 100);
}

interface CourseDetailContentProps {
  courseSlug: string;
  // '/courses' for the public marketing catalog, '/dashboard/courses' for the signed-in app shell.
  basePath: string;
}

export async function CourseDetailContent({ courseSlug, basePath }: CourseDetailContentProps) {
  const authenticatedUser = await getAuthenticatedUserFromSession();

  const courseRecord = await getCourseBySlug(courseSlug);
  if (!courseRecord) notFound();

  const isOwnerOrAdmin =
    !!authenticatedUser && (authenticatedUser.role === 'admin' || authenticatedUser.userId === courseRecord.ownerId);
  if (courseRecord.status !== 'published' && !isOwnerOrAdmin) notFound();

  const modulesWithLessons = await getCourseContentTree(courseRecord.id);

  const isEnrolled = authenticatedUser ? await isUserEnrolledInCourse(authenticatedUser.userId, courseRecord.id) : false;
  const hasFullAccess = isOwnerOrAdmin || isEnrolled;

  const progress = authenticatedUser
    ? await getCourseModuleProgress(authenticatedUser.userId, courseRecord.id)
    : { totalLessons: 0, completedLessons: 0, completedAt: null };
  const completedLessonIds = authenticatedUser
    ? await getCompletedLessonIds(authenticatedUser.userId, courseRecord.id)
    : new Set<string>();

  const isFree = courseRecord.priceAmountMinor === 0;
  const isCourseComplete = hasFullAccess && progress.completedAt !== null;
  const assessment = isCourseComplete ? await getAssessmentByCourseId(courseRecord.id) : null;
  const hasPassedAssessment = isCourseComplete && authenticatedUser ? await hasPassedRequiredAssessment(authenticatedUser.userId, courseRecord.id) : false;

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 lg:grid-cols-[2fr_1fr]">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Course content</h2>
        <div className="mt-4 flex flex-col gap-4">
          {modulesWithLessons.map(({ moduleRecord, moduleLessons }) => (
            <Card key={moduleRecord.id}>
              <h3 className="font-semibold text-slate-900">{moduleRecord.title}</h3>
              <ul className="mt-3 flex flex-col gap-1">
                {moduleLessons.map((lessonRecord) => {
                  const canAccess = lessonRecord.isPreview || hasFullAccess;
                  const isCompleted = completedLessonIds.has(lessonRecord.id);
                  const actionLabel = lessonRecord.contentType === 'pdf' ? 'View PDF' : 'Watch video';

                  return (
                    <li
                      key={lessonRecord.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2">
                        <Icon
                          name={isCompleted ? 'checkCircle' : 'document'}
                          className={`h-4 w-4 shrink-0 ${isCompleted ? 'text-gold-600' : 'text-slate-400'}`}
                        />
                        <span className={canAccess ? '' : 'text-slate-400'}>{lessonRecord.title}</span>
                        {lessonRecord.isPreview && <Badge>preview</Badge>}
                        {!canAccess && <Badge>locked</Badge>}
                      </span>
                      {canAccess && (
                        <Link
                          href={`${basePath}/${courseRecord.slug}/lessons/${lessonRecord.slug}`}
                          className="inline-flex items-center gap-1 rounded-md border border-navy-800 px-3 py-1 text-xs font-bold text-navy-800 hover:bg-navy-900 hover:text-white"
                        >
                          {isCompleted ? 'Review' : actionLabel} <span aria-hidden>&rarr;</span>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
          {modulesWithLessons.length === 0 && <p className="text-sm text-slate-500">Course content is coming soon.</p>}
        </div>
      </div>

      <div>
        <Card>
          <p className="text-2xl font-bold text-slate-900">{formatCoursePrice(courseRecord.priceAmountMinor, courseRecord.currency)}</p>

          {authenticatedUser ? (
            hasFullAccess ? (
              <div className="mt-4">
                <ProgressBar completed={progress.completedLessons} total={progress.totalLessons} />
                {isCourseComplete && hasPassedAssessment && (
                  <Link
                    href={`/dashboard/certificates/${courseRecord.slug}`}
                    className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-navy-950 hover:bg-gold-400"
                  >
                    <Icon name="award" className="h-4 w-4" /> View Certificate
                  </Link>
                )}
                {isCourseComplete && !hasPassedAssessment && assessment && (
                  <Link
                    href={`${basePath}/${courseRecord.slug}/assessment`}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-navy-950 hover:bg-gold-400"
                  >
                    Take Exam
                  </Link>
                )}
              </div>
            ) : isFree ? (
              <div className="mt-4">
                <EnrollButton courseSlug={courseRecord.slug} />
              </div>
            ) : (
              <div className="mt-4">
                <CheckoutButton
                  courseSlug={courseRecord.slug}
                  priceLabel={formatCoursePrice(courseRecord.priceAmountMinor, courseRecord.currency)}
                />
              </div>
            )
          ) : (
            <Link
              href="/sign-in"
              className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-navy-950 hover:bg-gold-400"
            >
              Sign in to enroll
            </Link>
          )}
        </Card>
      </div>
    </div>
  );
}
