'use server';

import { asc, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { assessmentAttemptAnswers, assessmentAttempts, assessmentChoices, assessmentQuestions } from '@/db/schema';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { getCourseById } from '@/features/courses/course-queries';
import { requireCourseAssessmentAccess } from './require-course-assessment-access';
import { getAssessmentByCourseId } from './assessment-queries';
import { calculateAssessmentScore } from './calculate-assessment-score';
import type { AssessmentAttempt } from './assessment-types';

export interface SubmittedAnswer {
  questionId: string;
  selectedChoiceId: string;
}

// A single try/catch around the whole thing rather than converting every internal throw: this
// function has many validation branches, all of which should surface as a real message to the
// student (not Next.js's generic redacted one) — ApiError is our own "expected, safe to show"
// error type, so anything else is a genuine bug and is left to throw/redact as normal.
export async function submitAssessmentAttempt(courseId: string, answers: SubmittedAnswer[]): Promise<ActionResult<AssessmentAttempt>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();

    const courseRecord = await getCourseById(courseId);
    if (!courseRecord) return { success: false, error: 'Course not found.' };
    await requireCourseAssessmentAccess(authenticatedUser, courseRecord);

    const assessmentRecord = await getAssessmentByCourseId(courseId);
    if (!assessmentRecord) return { success: false, error: 'This course has no assessment.' };

    const questionRows = await db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, assessmentRecord.id))
      .orderBy(asc(assessmentQuestions.position));
    if (questionRows.length === 0) {
      return { success: false, error: 'This assessment has no questions yet.' };
    }

    const selectedChoiceIdByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer.selectedChoiceId]));
    if (questionRows.some((question) => !selectedChoiceIdByQuestionId.has(question.id))) {
      return { success: false, error: 'Answer every question before submitting.' };
    }

    const choiceRows = await db
      .select()
      .from(assessmentChoices)
      .where(
        inArray(
          assessmentChoices.questionId,
          questionRows.map((question) => question.id),
        ),
      );
    const correctChoiceIdByQuestionId = new Map(
      choiceRows.filter((choice) => choice.isCorrect).map((choice) => [choice.questionId, choice.id]),
    );

    let correctCount = 0;
    const answerRecords: { questionId: string; selectedChoiceId: string; isCorrect: boolean }[] = [];
    for (const question of questionRows) {
      const selectedChoiceId = selectedChoiceIdByQuestionId.get(question.id);
      const isValidChoice = choiceRows.some((choice) => choice.id === selectedChoiceId && choice.questionId === question.id);
      if (!isValidChoice) {
        return { success: false, error: 'One of the submitted answers is invalid.' };
      }
      const isCorrect = correctChoiceIdByQuestionId.get(question.id) === selectedChoiceId;
      if (isCorrect) correctCount += 1;
      answerRecords.push({ questionId: question.id, selectedChoiceId: selectedChoiceId!, isCorrect });
    }

    const totalQuestions = questionRows.length;
    const { scorePercentage, passed } = calculateAssessmentScore(correctCount, totalQuestions, assessmentRecord.passingScorePercentage);

    const [attempt] = await db
      .insert(assessmentAttempts)
      .values({
        assessmentId: assessmentRecord.id,
        userId: authenticatedUser.userId,
        correctCount,
        totalQuestions,
        scorePercentage,
        passed,
      })
      .returning();
    if (!attempt) return { success: false, error: 'Failed to record your attempt.' };

    await db.insert(assessmentAttemptAnswers).values(answerRecords.map((answer) => ({ ...answer, attemptId: attempt.id })));

    revalidatePath(`/dashboard/courses/${courseRecord.slug}/assessment`);
    return { success: true, data: attempt };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}
