import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getCourseBySlug } from '@/features/courses/course-queries';
import { getAssessmentAccessStatus } from '@/features/assessments/require-course-assessment-access';
import { getAssessmentWithQuestions, listAttemptsForUser, toLearnerView } from '@/features/assessments/assessment-queries';
import { AssessmentAttemptForm } from '@/features/assessments/assessment-attempt-form';
import { StartTimedAssessment } from '@/features/assessments/start-timed-assessment';
import { finalizeExpiredSession, getTimedSession, hasTimeRunOut } from '@/features/assessments/timed-assessment-sessions';
import { Card } from '@/components/ui/card';
import { attemptsExhaustedMessage, getAttemptAllowance } from '@/features/assessments/attempt-limits';
import { SITE_CONTACT, phoneHref } from '@/features/site/site-contact';

export default async function DashboardCourseAssessmentPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');

  const course = await getCourseBySlug(courseSlug);
  if (!course) notFound();

  const accessStatus = await getAssessmentAccessStatus(authenticatedUser, course);
  const assessment = await getAssessmentWithQuestions(course.id);
  const isAssessmentLive = accessStatus === 'ok' && !!assessment && assessment.questions.length > 0;

  // A timed attempt whose time ran out while the learner was away (tab closed, offline) is
  // submitted now with the answers saved before the deadline, and they're taken to the result.
  const timedSession =
    isAssessmentLive && assessment.timeLimitMinutes ? await getTimedSession(assessment.id, authenticatedUser.userId) : null;
  if (isAssessmentLive && timedSession && hasTimeRunOut(timedSession)) {
    const attempt = await finalizeExpiredSession(assessment, timedSession, authenticatedUser.userId);
    if (attempt) redirect(`/dashboard/courses/${course.slug}/assessment/results/${attempt.id}?timeUp=1`);
  }
  const activeTimedSession = timedSession && !hasTimeRunOut(timedSession) ? timedSession : null;

  const [pastAttempts, attemptAllowance] = assessment
    ? await Promise.all([listAttemptsForUser(assessment.id, authenticatedUser.userId), getAttemptAllowance(assessment, authenticatedUser.userId)])
    : [[], null];
  // An attempt already running can always be finished; only starting a new one needs an attempt left.
  const canStartNewAttempt = !!activeTimedSession || (attemptAllowance?.hasAttemptsLeft ?? true);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href={`/dashboard/courses/${course.slug}`} className="text-xs font-semibold text-slate-500 hover:text-navy-800">
        &larr; Back to {course.title}
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-wide text-navy-900">{assessment?.title ?? 'Course Assessment'}</h1>

      {accessStatus === 'not_enrolled' && (
        <div className="mt-6">
          <Card>
            <p className="text-sm text-slate-600">Enroll in this course to take its assessment.</p>
          </Card>
        </div>
      )}

      {accessStatus === 'course_incomplete' && (
        <div className="mt-6">
          <Card>
            <p className="text-sm text-slate-600">Complete every lesson in this course to unlock the assessment.</p>
          </Card>
        </div>
      )}

      {accessStatus === 'ok' && !isAssessmentLive && (
        <div className="mt-6">
          <Card>
            <p className="text-sm text-slate-600">No assessment has been published for this course yet. Check back soon.</p>
          </Card>
        </div>
      )}

      {isAssessmentLive && assessment && (
        <>
          {pastAttempts.length > 0 && (
            <section className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Your attempts</h2>
              <div className="mt-2 flex flex-col gap-2">
                {pastAttempts.map((attempt) => (
                  <Link
                    key={attempt.id}
                    href={`/dashboard/courses/${course.slug}/assessment/results/${attempt.id}`}
                    className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm hover:border-navy-800"
                  >
                    <span className="text-slate-700">
                      {attempt.correctCount}/{attempt.totalQuestions} correct &middot; {attempt.scorePercentage}%
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        attempt.passed ? 'bg-gold-500/10 text-gold-600' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {attempt.passed ? 'Passed' : 'Not passed'}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              {!canStartNewAttempt ? 'No attempts left' : pastAttempts.length > 0 ? 'Retake the assessment' : 'Take the assessment'}
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              Passing score: {assessment.passingScorePercentage}%
              {assessment.timeLimitMinutes && <> &middot; Time limit: {assessment.timeLimitMinutes} minutes</>}
              {attemptAllowance?.maxAttempts && (
                <>
                  {' '}
                  &middot; Attempts used: {Math.min(attemptAllowance.attemptsUsed, attemptAllowance.maxAttempts)} of {attemptAllowance.maxAttempts}
                </>
              )}
            </p>
            {!canStartNewAttempt && attemptAllowance?.maxAttempts ? (
              <Card>
                <p className="text-sm font-semibold text-slate-900">{attemptsExhaustedMessage(attemptAllowance.maxAttempts)}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Call{' '}
                  <a href={phoneHref(SITE_CONTACT.mainPhone)} className="font-semibold text-navy-800 hover:underline">
                    {SITE_CONTACT.mainPhone}
                  </a>{' '}
                  or email{' '}
                  <a href={`mailto:${SITE_CONTACT.email}`} className="font-semibold text-navy-800 hover:underline">
                    {SITE_CONTACT.email}
                  </a>
                  .
                </p>
              </Card>
            ) : assessment.timeLimitMinutes && !activeTimedSession ? (
              <StartTimedAssessment
                courseId={course.id}
                timeLimitMinutes={assessment.timeLimitMinutes}
                questionCount={assessment.questions.length}
              />
            ) : (
              <AssessmentAttemptForm
                courseId={course.id}
                courseSlug={course.slug}
                assessment={toLearnerView(assessment)}
                timer={activeTimedSession ? { remainingMsAtLoad: Math.max(0, activeTimedSession.deadlineAt.getTime() - Date.now()) } : undefined}
                initialAnswers={activeTimedSession?.draftAnswers}
              />
            )}
          </section>
        </>
      )}
    </main>
  );
}
