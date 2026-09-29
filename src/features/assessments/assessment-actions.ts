'use server';

import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { assessmentChoices, assessmentQuestions, courseAssessments } from '@/db/schema';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { requireCourseOwnership } from '@/features/courses/require-course-ownership';
import { getCourseById } from '@/features/courses/course-queries';
import { getCourseIdByAssessmentId, getCourseIdByChoiceId, getCourseIdByQuestionId } from './assessment-queries';
import type { AssessmentChoice, AssessmentQuestion, CourseAssessment } from './assessment-types';

const QUESTION_POSITION_GAP = 10;
const CHOICE_POSITION_GAP = 10;

export async function createOrUpdateAssessment(
  courseId: string,
  input: { title: string; passingScorePercentage: number },
): Promise<ActionResult<CourseAssessment>> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  await requireCourseOwnership(authenticatedUser, courseId);

  const courseRecord = await getCourseById(courseId);
  if (!courseRecord) return { success: false, error: 'Course not found.' };

  const [existingAssessment] = await db.select().from(courseAssessments).where(eq(courseAssessments.courseId, courseId));
  const [savedAssessment] = existingAssessment
    ? await db.update(courseAssessments).set(input).where(eq(courseAssessments.id, existingAssessment.id)).returning()
    : await db.insert(courseAssessments).values({ courseId, ...input }).returning();
  if (!savedAssessment) return { success: false, error: 'Failed to save assessment.' };

  revalidatePath(`/instructor/courses/${courseRecord.slug}/assessment`);
  return { success: true, data: savedAssessment };
}

export async function deleteAssessment(assessmentId: string): Promise<ActionResult> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  const courseId = await getCourseIdByAssessmentId(assessmentId);
  if (!courseId) return { success: false, error: 'Assessment not found.' };
  await requireCourseOwnership(authenticatedUser, courseId);

  await db.delete(courseAssessments).where(eq(courseAssessments.id, assessmentId));
  return { success: true, data: undefined };
}

async function getNextQuestionPosition(assessmentId: string): Promise<number> {
  const [lastQuestion] = await db
    .select()
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessmentId))
    .orderBy(desc(assessmentQuestions.position))
    .limit(1);
  return (lastQuestion?.position ?? 0) + QUESTION_POSITION_GAP;
}

export async function addQuestion(assessmentId: string, questionText: string): Promise<ActionResult<AssessmentQuestion>> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  const courseId = await getCourseIdByAssessmentId(assessmentId);
  if (!courseId) return { success: false, error: 'Assessment not found.' };
  await requireCourseOwnership(authenticatedUser, courseId);

  const position = await getNextQuestionPosition(assessmentId);
  const [createdQuestion] = await db.insert(assessmentQuestions).values({ assessmentId, questionText, position }).returning();
  if (!createdQuestion) return { success: false, error: 'Failed to add question.' };
  return { success: true, data: createdQuestion };
}

export async function updateQuestionText(questionId: string, questionText: string): Promise<ActionResult<AssessmentQuestion>> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  const courseId = await getCourseIdByQuestionId(questionId);
  if (!courseId) return { success: false, error: 'Question not found.' };
  await requireCourseOwnership(authenticatedUser, courseId);

  const [updatedQuestion] = await db
    .update(assessmentQuestions)
    .set({ questionText })
    .where(eq(assessmentQuestions.id, questionId))
    .returning();
  if (!updatedQuestion) return { success: false, error: 'Failed to update question.' };
  return { success: true, data: updatedQuestion };
}

export async function deleteQuestion(questionId: string): Promise<ActionResult> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  const courseId = await getCourseIdByQuestionId(questionId);
  if (!courseId) return { success: false, error: 'Question not found.' };
  await requireCourseOwnership(authenticatedUser, courseId);

  await db.delete(assessmentQuestions).where(eq(assessmentQuestions.id, questionId));
  return { success: true, data: undefined };
}

async function getNextChoicePosition(questionId: string): Promise<number> {
  const [lastChoice] = await db
    .select()
    .from(assessmentChoices)
    .where(eq(assessmentChoices.questionId, questionId))
    .orderBy(desc(assessmentChoices.position))
    .limit(1);
  return (lastChoice?.position ?? 0) + CHOICE_POSITION_GAP;
}

export async function addChoice(questionId: string, choiceText: string): Promise<ActionResult<AssessmentChoice>> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  const courseId = await getCourseIdByQuestionId(questionId);
  if (!courseId) return { success: false, error: 'Question not found.' };
  await requireCourseOwnership(authenticatedUser, courseId);

  const position = await getNextChoicePosition(questionId);
  const [createdChoice] = await db.insert(assessmentChoices).values({ questionId, choiceText, position }).returning();
  if (!createdChoice) return { success: false, error: 'Failed to add choice.' };
  return { success: true, data: createdChoice };
}

export async function updateChoiceText(choiceId: string, choiceText: string): Promise<ActionResult<AssessmentChoice>> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  const courseId = await getCourseIdByChoiceId(choiceId);
  if (!courseId) return { success: false, error: 'Choice not found.' };
  await requireCourseOwnership(authenticatedUser, courseId);

  const [updatedChoice] = await db.update(assessmentChoices).set({ choiceText }).where(eq(assessmentChoices.id, choiceId)).returning();
  if (!updatedChoice) return { success: false, error: 'Failed to update choice.' };
  return { success: true, data: updatedChoice };
}

// A question is single-answer MCQ: marking one choice correct clears every other choice on
// that same question so exactly one correct answer can ever exist.
export async function setCorrectChoice(questionId: string, choiceId: string): Promise<ActionResult> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  const courseId = await getCourseIdByQuestionId(questionId);
  if (!courseId) return { success: false, error: 'Question not found.' };
  await requireCourseOwnership(authenticatedUser, courseId);

  await db.update(assessmentChoices).set({ isCorrect: false }).where(eq(assessmentChoices.questionId, questionId));
  await db.update(assessmentChoices).set({ isCorrect: true }).where(eq(assessmentChoices.id, choiceId));
  return { success: true, data: undefined };
}

export async function deleteChoice(choiceId: string): Promise<ActionResult> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  const courseId = await getCourseIdByChoiceId(choiceId);
  if (!courseId) return { success: false, error: 'Choice not found.' };
  await requireCourseOwnership(authenticatedUser, courseId);

  await db.delete(assessmentChoices).where(eq(assessmentChoices.id, choiceId));
  return { success: true, data: undefined };
}
