import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { assessmentChoices, assessmentAttempts, assessmentQuestions, courseAssessments } from '@/db/schema';
import type { AssessmentAttempt, AssessmentForLearner, AssessmentWithQuestions } from './assessment-types';
import type { CourseExamSummary } from '@/features/courses/course-page/course-page-facts';

export async function getAssessmentByCourseId(courseId: string) {
  const [assessmentRecord] = await db.select().from(courseAssessments).where(eq(courseAssessments.courseId, courseId));
  return assessmentRecord ?? null;
}

export interface RequiredAssessmentStatus {
  assessment: typeof courseAssessments.$inferSelect | null;
  // Same rule as hasPassedRequiredAssessment: true when there's no assessment, it has no
  // questions yet, or the learner has a passing attempt.
  hasPassed: boolean;
}

// Assessment status for several courses in one query, instead of up to three per course.
export async function getRequiredAssessmentStatuses(userId: string, courseIds: string[]): Promise<Map<string, RequiredAssessmentStatus>> {
  const statuses = new Map<string, RequiredAssessmentStatus>(courseIds.map((courseId) => [courseId, { assessment: null, hasPassed: true }]));
  if (courseIds.length === 0) return statuses;

  // Joins (not correlated subqueries) so every column is table-qualified: Drizzle drops table
  // names from single-table queries, which made a correlated `id` resolve to the inner table.
  const assessmentsWithQuestions = db
    .selectDistinct({ assessmentId: assessmentQuestions.assessmentId })
    .from(assessmentQuestions)
    .as('assessments_with_questions');
  const passedAssessments = db
    .selectDistinct({ assessmentId: assessmentAttempts.assessmentId })
    .from(assessmentAttempts)
    .where(and(eq(assessmentAttempts.userId, userId), eq(assessmentAttempts.passed, true)))
    .as('passed_assessments');

  const rows = await db
    .select({
      assessment: courseAssessments,
      questionsFor: assessmentsWithQuestions.assessmentId,
      passedFor: passedAssessments.assessmentId,
    })
    .from(courseAssessments)
    .leftJoin(assessmentsWithQuestions, eq(assessmentsWithQuestions.assessmentId, courseAssessments.id))
    .leftJoin(passedAssessments, eq(passedAssessments.assessmentId, courseAssessments.id))
    .where(inArray(courseAssessments.courseId, courseIds));

  for (const { assessment, questionsFor, passedFor } of rows) {
    statuses.set(assessment.courseId, { assessment, hasPassed: questionsFor === null || passedFor !== null });
  }
  return statuses;
}

// The exam rules shown on the course page. Null when there's no exam or it has no questions yet
// (an exam still being written isn't required for certificates, so it isn't advertised either).
export async function getCourseExamSummary(courseId: string): Promise<CourseExamSummary | null> {
  const [row] = await db
    .select({
      passingScorePercentage: courseAssessments.passingScorePercentage,
      timeLimitMinutes: courseAssessments.timeLimitMinutes,
      maxAttempts: courseAssessments.maxAttempts,
      questionCount: count(assessmentQuestions.id),
    })
    .from(courseAssessments)
    .leftJoin(assessmentQuestions, eq(assessmentQuestions.assessmentId, courseAssessments.id))
    .where(eq(courseAssessments.courseId, courseId))
    .groupBy(courseAssessments.id);
  return row && row.questionCount > 0 ? row : null;
}

export async function getAssessmentWithQuestions(courseId: string): Promise<AssessmentWithQuestions | null> {
  const assessmentRecord = await getAssessmentByCourseId(courseId);
  if (!assessmentRecord) return null;

  const questionRows = await db
    .select()
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessmentRecord.id))
    .orderBy(asc(assessmentQuestions.position));

  // Every question's choices in one query (not one per question — a 99-question exam was 100 queries).
  const choiceRows =
    questionRows.length === 0
      ? []
      : await db
          .select()
          .from(assessmentChoices)
          .where(
            inArray(
              assessmentChoices.questionId,
              questionRows.map((questionRow) => questionRow.id),
            ),
          )
          .orderBy(asc(assessmentChoices.position));
  const questions = questionRows.map((questionRow) => ({
    ...questionRow,
    choices: choiceRows.filter((choice) => choice.questionId === questionRow.id),
  }));

  return { ...assessmentRecord, questions };
}

// Strips `isCorrect` before the assessment is ever sent to a learner-facing page.
export function toLearnerView(assessment: AssessmentWithQuestions): AssessmentForLearner {
  return {
    id: assessment.id,
    title: assessment.title,
    passingScorePercentage: assessment.passingScorePercentage,
    timeLimitMinutes: assessment.timeLimitMinutes,
    questions: assessment.questions.map((question) => ({
      id: question.id,
      questionText: question.questionText,
      choices: question.choices.map((choice) => ({ id: choice.id, choiceText: choice.choiceText })),
    })),
  };
}

export async function listAttemptsForUser(assessmentId: string, userId: string): Promise<AssessmentAttempt[]> {
  return db
    .select()
    .from(assessmentAttempts)
    .where(and(eq(assessmentAttempts.assessmentId, assessmentId), eq(assessmentAttempts.userId, userId)))
    .orderBy(desc(assessmentAttempts.submittedAt));
}

// A course only requires passing its assessment if one has actually been published (has at
// least one question) — an empty assessment shell an instructor is still building shouldn't
// block certificates for a course that otherwise has none configured yet.
export async function hasPassedRequiredAssessment(userId: string, courseId: string): Promise<boolean> {
  const assessment = await getAssessmentByCourseId(courseId);
  if (!assessment) return true;

  const [firstQuestion] = await db
    .select({ id: assessmentQuestions.id })
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessment.id))
    .limit(1);
  if (!firstQuestion) return true;

  const [passingAttempt] = await db
    .select({ id: assessmentAttempts.id })
    .from(assessmentAttempts)
    .where(and(eq(assessmentAttempts.assessmentId, assessment.id), eq(assessmentAttempts.userId, userId), eq(assessmentAttempts.passed, true)))
    .limit(1);
  return !!passingAttempt;
}

export async function getAttemptById(attemptId: string) {
  const [attempt] = await db.select().from(assessmentAttempts).where(eq(assessmentAttempts.id, attemptId));
  return attempt ?? null;
}

export async function getCourseIdByAssessmentId(assessmentId: string): Promise<string | null> {
  const [row] = await db.select({ courseId: courseAssessments.courseId }).from(courseAssessments).where(eq(courseAssessments.id, assessmentId));
  return row?.courseId ?? null;
}

export async function getCourseIdByQuestionId(questionId: string): Promise<string | null> {
  const [row] = await db
    .select({ courseId: courseAssessments.courseId })
    .from(assessmentQuestions)
    .innerJoin(courseAssessments, eq(courseAssessments.id, assessmentQuestions.assessmentId))
    .where(eq(assessmentQuestions.id, questionId));
  return row?.courseId ?? null;
}

export async function getCourseIdByChoiceId(choiceId: string): Promise<string | null> {
  const [row] = await db
    .select({ courseId: courseAssessments.courseId })
    .from(assessmentChoices)
    .innerJoin(assessmentQuestions, eq(assessmentQuestions.id, assessmentChoices.questionId))
    .innerJoin(courseAssessments, eq(courseAssessments.id, assessmentQuestions.assessmentId))
    .where(eq(assessmentChoices.id, choiceId));
  return row?.courseId ?? null;
}
