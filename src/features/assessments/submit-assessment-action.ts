'use server';

import { revalidatePath } from 'next/cache';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import type { AuthenticatedUser } from '@/features/auth/auth-types';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { getCourseById } from '@/features/courses/course-queries';
import type { Course } from '@/features/courses/course-types';
import { requireCourseAssessmentAccess } from './require-course-assessment-access';
import { getAssessmentByCourseId, getAssessmentWithQuestions } from './assessment-queries';
import { gradeAssessmentAnswers } from './grade-assessment-answers';
import { attemptsExhaustedMessage, getAttemptAllowance } from './attempt-limits';
import {
  finalizeExpiredSession,
  getLatestAttempt,
  getTimedSession,
  hasTimeRunOut,
  isAtOrPastDeadline,
  recordGradedAttempt,
  saveTimedSessionDraft,
  startTimedSession,
  validDraftAnswers,
} from './timed-assessment-sessions';
import type { AssessmentAttempt, AssessmentWithQuestions } from './assessment-types';

export interface SubmittedAnswer {
  questionId: string;
  selectedChoiceId: string;
}

type LoadedAssessment = { authenticatedUser: AuthenticatedUser; courseRecord: Course; assessment: AssessmentWithQuestions };

// Shared by every learner action: signed in, allowed to take this course's assessment, and the
// assessment exists. Throws ApiError (shown to the learner) otherwise.
async function loadAssessmentForLearner(courseId: string): Promise<LoadedAssessment | { error: string }> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  const courseRecord = await getCourseById(courseId);
  if (!courseRecord) return { error: 'Course not found.' };
  await requireCourseAssessmentAccess(authenticatedUser, courseRecord);

  const assessment = await getAssessmentWithQuestions(courseId);
  if (!assessment) return { error: 'This course has no assessment.' };
  if (assessment.questions.length === 0) return { error: 'This assessment has no questions yet.' };
  return { authenticatedUser, courseRecord, assessment };
}

// Every action wraps its body in a try/catch that turns our own ApiError (an expected, safe-to-show
// message) into a returned error — Next.js hides thrown Server Action messages in production.

export async function startTimedAssessment(courseId: string): Promise<ActionResult> {
  try {
    const loaded = await loadAssessmentForLearner(courseId);
    if ('error' in loaded) return { success: false, error: loaded.error };
    const { authenticatedUser, assessment } = loaded;
    if (!assessment.timeLimitMinutes) return { success: false, error: 'This assessment is not timed.' };

    // An earlier attempt whose time ran out while the learner was away is submitted first.
    const existingSession = await getTimedSession(assessment.id, authenticatedUser.userId);
    const hasActiveSession = !!existingSession && !hasTimeRunOut(existingSession);
    if (existingSession && !hasActiveSession) {
      await finalizeExpiredSession(assessment, existingSession, authenticatedUser.userId);
    }
    // A new attempt needs one left; resuming the one already running doesn't.
    if (!hasActiveSession && assessment.maxAttempts !== null) {
      const allowance = await getAttemptAllowance(assessment, authenticatedUser.userId);
      if (!allowance.hasAttemptsLeft) return { success: false, error: attemptsExhaustedMessage(assessment.maxAttempts) };
    }
    await startTimedSession(assessment.id, authenticatedUser.userId, assessment.timeLimitMinutes);
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

// Called as the learner picks answers, so a timed attempt can still be graded on what they had if
// time runs out after they've closed the tab. Kept light because it runs on every pick: a session
// only exists if the learner passed the access check when starting, and the saved answers are
// validated against the question set when the attempt is graded.
const MAX_DRAFT_ANSWERS = 1000;
export async function saveTimedAssessmentDraft(courseId: string, answers: Record<string, string>): Promise<ActionResult> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    const assessmentRecord = await getAssessmentByCourseId(courseId);
    if (!assessmentRecord) return { success: false, error: 'This course has no assessment.' };

    const session = await getTimedSession(assessmentRecord.id, authenticatedUser.userId);
    if (!session || hasTimeRunOut(session)) return { success: false, error: 'Time is up for this attempt.' };

    const draftAnswers = Object.fromEntries(
      Object.entries(answers)
        .filter(([questionId, choiceId]) => typeof questionId === 'string' && typeof choiceId === 'string')
        .slice(0, MAX_DRAFT_ANSWERS),
    );
    await saveTimedSessionDraft(session.id, draftAnswers);
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

export async function submitAssessmentAttempt(courseId: string, answers: SubmittedAnswer[]): Promise<ActionResult<AssessmentAttempt>> {
  try {
    const loaded = await loadAssessmentForLearner(courseId);
    if ('error' in loaded) return { success: false, error: loaded.error };
    const { authenticatedUser, courseRecord, assessment } = loaded;
    const submittedAnswers = Object.fromEntries(answers.map((answer) => [answer.questionId, answer.selectedChoiceId]));

    let selectedAnswers = submittedAnswers;
    let allowUnanswered = false;
    let timedSessionId: string | null = null;

    if (assessment.timeLimitMinutes) {
      const session = await getTimedSession(assessment.id, authenticatedUser.userId);
      if (!session) {
        // Already submitted (e.g. auto-submitted from another tab) — show that result.
        const latestAttempt = await getLatestAttempt(assessment.id, authenticatedUser.userId);
        if (latestAttempt) return { success: true, data: latestAttempt };
        return { success: false, error: 'Start the assessment before submitting.' };
      }
      timedSessionId = session.id;
      allowUnanswered = isAtOrPastDeadline(session);
      // Arrived well after the deadline: grade only what was saved in time, not answers changed since.
      if (hasTimeRunOut(session)) selectedAnswers = validDraftAnswers(assessment, session.draftAnswers);
    }

    const grading = gradeAssessmentAnswers(assessment.questions, selectedAnswers, { allowUnanswered });
    if (!grading.success) return { success: false, error: grading.error };

    const attempt =
      (await recordGradedAttempt(assessment, authenticatedUser.userId, grading, timedSessionId)) ??
      (await getLatestAttempt(assessment.id, authenticatedUser.userId));
    if (!attempt) return { success: false, error: 'Failed to record your attempt.' };

    revalidatePath(`/dashboard/courses/${courseRecord.slug}/assessment`);
    return { success: true, data: attempt };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}
