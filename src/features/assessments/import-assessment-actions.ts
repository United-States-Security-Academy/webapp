'use server';

import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { assessmentChoices, assessmentQuestions } from '@/db/schema';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { requireCourseOwnership } from '@/features/courses/require-course-ownership';
import { getCourseById } from '@/features/courses/course-queries';
import { getCourseIdByAssessmentId } from './assessment-queries';
import { parseAssessmentDocx, type ParsedAssessment } from './parse-assessment-docx';
import { MAX_ASSESSMENT_DOCX_BYTES, TOO_LARGE_MESSAGE, validateImportedQuestions } from './validate-imported-questions';

const QUESTION_POSITION_GAP = 10;
const CHOICE_POSITION_GAP = 10;

async function requireAssessmentOwnership(assessmentId: string): Promise<string | null> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  const courseId = await getCourseIdByAssessmentId(assessmentId);
  if (!courseId) return null;
  await requireCourseOwnership(authenticatedUser, courseId);
  return courseId;
}

// Reads the questions out of an uploaded Word file for the preview. Nothing is saved here.
export async function previewAssessmentDocx(assessmentId: string, formData: FormData): Promise<ActionResult<ParsedAssessment>> {
  const courseId = await requireAssessmentOwnership(assessmentId);
  if (!courseId) return { success: false, error: 'Assessment not found.' };

  const file = formData.get('file');
  if (!(file instanceof File)) return { success: false, error: 'Choose a Word file to upload.' };
  if (file.size > MAX_ASSESSMENT_DOCX_BYTES) return { success: false, error: TOO_LARGE_MESSAGE };

  const parsedAssessment = await parseAssessmentDocx(file.name, Buffer.from(await file.arrayBuffer()));
  return { success: true, data: parsedAssessment };
}

// Adds the previewed questions after the assessment's existing ones. Existing questions are never
// replaced, so learners' past attempts and their answers stay intact.
export async function importAssessmentQuestions(assessmentId: string, questions: unknown): Promise<ActionResult<{ importedCount: number }>> {
  const courseId = await requireAssessmentOwnership(assessmentId);
  if (!courseId) return { success: false, error: 'Assessment not found.' };

  const check = validateImportedQuestions(questions);
  if (!check.success) return check;

  await db.transaction(async (transaction) => {
    const [lastQuestion] = await transaction
      .select({ position: assessmentQuestions.position })
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, assessmentId))
      .orderBy(desc(assessmentQuestions.position))
      .limit(1);
    let position = lastQuestion?.position ?? 0;

    for (const question of check.questions) {
      position += QUESTION_POSITION_GAP;
      const [createdQuestion] = await transaction
        .insert(assessmentQuestions)
        .values({ assessmentId, questionText: question.questionText, position })
        .returning({ id: assessmentQuestions.id });
      await transaction.insert(assessmentChoices).values(
        question.choices.map((choiceText, choiceIndex) => ({
          questionId: createdQuestion!.id,
          choiceText,
          isCorrect: choiceIndex === question.correctChoiceIndex,
          position: (choiceIndex + 1) * CHOICE_POSITION_GAP,
        })),
      );
    }
  });

  const courseRecord = await getCourseById(courseId);
  if (courseRecord) revalidatePath(`/instructor/courses/${courseRecord.slug}/assessment`);
  return { success: true, data: { importedCount: check.questions.length } };
}
