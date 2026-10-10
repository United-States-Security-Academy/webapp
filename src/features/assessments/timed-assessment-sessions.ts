import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { assessmentAttemptAnswers, assessmentAttempts, assessmentTimedSessions, type AssessmentTimedSession } from '@/db/schema';
import { calculateAssessmentScore } from './calculate-assessment-score';
import { gradeAssessmentAnswers, type GradingResult } from './grade-assessment-answers';
import type { AssessmentAttempt, AssessmentWithQuestions } from './assessment-types';

// Allowance for a submission sent right at the deadline that takes a moment to arrive. Answers
// arriving later than this are ignored in favour of the ones saved before time ran out, so the
// grace period can't be used to keep working.
export const SUBMISSION_GRACE_MS = 15_000;
// The browser's countdown may fire a few seconds early if its clock differs slightly from ours.
const EARLY_AUTO_SUBMIT_TOLERANCE_MS = 5_000;

export function hasTimeRunOut(session: AssessmentTimedSession, now = new Date()): boolean {
  return now.getTime() > session.deadlineAt.getTime() + SUBMISSION_GRACE_MS;
}

// From this point on, a submission may leave questions unanswered (they count as wrong).
export function isAtOrPastDeadline(session: AssessmentTimedSession, now = new Date()): boolean {
  return now.getTime() >= session.deadlineAt.getTime() - EARLY_AUTO_SUBMIT_TOLERANCE_MS;
}

export async function getTimedSession(assessmentId: string, userId: string): Promise<AssessmentTimedSession | null> {
  const [session] = await db
    .select()
    .from(assessmentTimedSessions)
    .where(and(eq(assessmentTimedSessions.assessmentId, assessmentId), eq(assessmentTimedSessions.userId, userId)));
  return session ?? null;
}

export async function startTimedSession(assessmentId: string, userId: string, timeLimitMinutes: number): Promise<void> {
  const deadlineAt = new Date(Date.now() + timeLimitMinutes * 60_000);
  // Only one session per learner per assessment: a second Start (another tab, a double click)
  // keeps the original clock rather than restarting it.
  await db.insert(assessmentTimedSessions).values({ assessmentId, userId, deadlineAt }).onConflictDoNothing();
}

export async function saveTimedSessionDraft(sessionId: string, draftAnswers: Record<string, string>): Promise<void> {
  await db.update(assessmentTimedSessions).set({ draftAnswers }).where(eq(assessmentTimedSessions.id, sessionId));
}

export async function getLatestAttempt(assessmentId: string, userId: string): Promise<AssessmentAttempt | null> {
  const [attempt] = await db
    .select()
    .from(assessmentAttempts)
    .where(and(eq(assessmentAttempts.assessmentId, assessmentId), eq(assessmentAttempts.userId, userId)))
    .orderBy(desc(assessmentAttempts.submittedAt))
    .limit(1);
  return attempt ?? null;
}

// Saves a graded attempt. For a timed attempt, its session is deleted in the same transaction and
// the attempt is only recorded if this call is the one that deleted it — so an auto-submit from
// the browser and a page reload that finalizes the same expired attempt can't both record it.
// Returns null when another request already recorded it.
export async function recordGradedAttempt(
  assessment: AssessmentWithQuestions,
  userId: string,
  grading: Extract<GradingResult, { success: true }>,
  timedSessionId: string | null,
): Promise<AssessmentAttempt | null> {
  const { scorePercentage, passed } = calculateAssessmentScore(
    grading.correctCount,
    grading.totalQuestions,
    assessment.passingScorePercentage,
  );

  return db.transaction(async (transaction) => {
    if (timedSessionId) {
      const [closedSession] = await transaction
        .delete(assessmentTimedSessions)
        .where(eq(assessmentTimedSessions.id, timedSessionId))
        .returning({ id: assessmentTimedSessions.id });
      if (!closedSession) return null;
    }

    const [attempt] = await transaction
      .insert(assessmentAttempts)
      .values({
        assessmentId: assessment.id,
        userId,
        correctCount: grading.correctCount,
        totalQuestions: grading.totalQuestions,
        scorePercentage,
        passed,
      })
      .returning();
    if (!attempt) throw new Error('Failed to record the assessment attempt.');

    await transaction.insert(assessmentAttemptAnswers).values(grading.answers.map((answer) => ({ ...answer, attemptId: attempt.id })));
    return attempt;
  });
}

// Keeps only saved answers that point at a real choice of that question — the draft is stored
// client-supplied data, so anything else is treated as unanswered rather than failing the grade.
export function validDraftAnswers(assessment: AssessmentWithQuestions, draftAnswers: Record<string, string>): Record<string, string> {
  const validAnswers: Record<string, string> = {};
  for (const question of assessment.questions) {
    const choiceId = draftAnswers[question.id];
    if (choiceId && question.choices.some((choice) => choice.id === choiceId)) validAnswers[question.id] = choiceId;
  }
  return validAnswers;
}

// Submits a timed attempt whose time ran out using the answers saved before the deadline — used
// when the learner's browser couldn't submit (tab closed, offline, device asleep).
export async function finalizeExpiredSession(
  assessment: AssessmentWithQuestions,
  session: AssessmentTimedSession,
  userId: string,
): Promise<AssessmentAttempt | null> {
  const grading = gradeAssessmentAnswers(assessment.questions, validDraftAnswers(assessment, session.draftAnswers), {
    allowUnanswered: true,
  });
  if (!grading.success) return null;
  return (await recordGradedAttempt(assessment, userId, grading, session.id)) ?? getLatestAttempt(assessment.id, userId);
}

