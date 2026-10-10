import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getCourseBySlug } from '@/features/courses/course-queries';
import { getAttemptById, getCourseIdByAssessmentId } from '@/features/assessments/assessment-queries';
import { Icon } from '@/components/ui/icon';

export default async function AssessmentResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseSlug: string; attemptId: string }>;
  searchParams: Promise<{ timeUp?: string }>;
}) {
  const { courseSlug, attemptId } = await params;
  const { timeUp } = await searchParams;
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');

  const course = await getCourseBySlug(courseSlug);
  if (!course) notFound();

  const attempt = await getAttemptById(attemptId);
  if (!attempt) notFound();
  if (attempt.userId !== authenticatedUser.userId && authenticatedUser.role !== 'admin') notFound();

  const attemptCourseId = await getCourseIdByAssessmentId(attempt.assessmentId);
  if (attemptCourseId !== course.id) notFound();

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <Link
        href={`/dashboard/courses/${course.slug}/assessment`}
        className="text-xs font-semibold text-slate-500 hover:text-navy-800"
      >
        &larr; Back to assessment
      </Link>

      {timeUp && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Icon name="clock" className="h-4 w-4 shrink-0" />
          Time ran out, so your answers were submitted automatically. Unanswered questions were marked incorrect.
        </p>
      )}

      <div className="mt-4 flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-full ${
            attempt.passed ? 'bg-gold-500/10 text-gold-600' : 'bg-red-50 text-red-600'
          }`}
        >
          <Icon name={attempt.passed ? 'award' : 'close'} className="h-8 w-8" />
        </span>

        <h1 className="mt-4 text-3xl font-extrabold text-navy-900">{attempt.scorePercentage}%</h1>
        <p className="mt-1 text-sm text-slate-500">
          {attempt.correctCount} of {attempt.totalQuestions} questions correct
        </p>

        <p
          className={`mt-4 rounded-full px-4 py-1.5 text-sm font-bold ${
            attempt.passed ? 'bg-gold-500/10 text-gold-600' : 'bg-red-50 text-red-600'
          }`}
        >
          {attempt.passed ? 'Passed' : 'Not passed'}
        </p>

        {attempt.passed ? (
          <>
            <p className="mt-4 max-w-sm text-sm text-slate-600">
              Congratulations — you passed the assessment for {course.title}. Your certificate is ready.
            </p>
            <Link
              href={`/dashboard/certificates/${course.slug}`}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-gold-500 px-6 py-2.5 text-sm font-bold text-navy-950 hover:bg-gold-400"
            >
              View certificate
            </Link>
          </>
        ) : (
          <>
            <p className="mt-4 max-w-sm text-sm text-slate-600">
              You didn&apos;t reach the passing score for {course.title} this time. Review the course material and try again.
            </p>
            <Link
              href={`/dashboard/courses/${course.slug}/assessment`}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-navy-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-navy-800"
            >
              Take the assessment again
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
