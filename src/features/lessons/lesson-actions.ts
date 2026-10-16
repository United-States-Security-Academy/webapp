'use server';

import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { lessons } from '@/db/schema';
import { ApiError } from '@/api-response/api-error';
import { API_ERROR_CODE } from '@/api-response/api-error-codes';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { requireCourseOwnership } from '@/features/courses/require-course-ownership';
import { getModuleById } from '@/features/modules/module-queries';
import { slugify } from '@/slugify';
import { pickFields } from '@/pick-fields';
import { getLessonById } from './lesson-queries';

const LESSON_POSITION_GAP = 10;

type Lesson = typeof lessons.$inferSelect;

async function getCourseIdForModule(moduleId: string): Promise<string> {
  const moduleRecord = await getModuleById(moduleId);
  if (!moduleRecord) throw new ApiError(404, API_ERROR_CODE.MODULE_NOT_FOUND, 'Module not found.');
  return moduleRecord.courseId;
}

async function getNextLessonPosition(moduleId: string): Promise<number> {
  const [lastLesson] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.moduleId, moduleId))
    .orderBy(desc(lessons.position))
    .limit(1);
  return (lastLesson?.position ?? 0) + LESSON_POSITION_GAP;
}

type CreateLessonInput = { title: string; slug: string; isPreview: boolean; contentType: 'video' | 'pdf' };
type UpdateLessonInput = Partial<Pick<CreateLessonInput, 'title' | 'isPreview'>>;

// Only what the lesson forms send: a caller can't move a lesson to another course's module, or
// point it at another lesson's stored files.
const CREATE_LESSON_FIELDS = ['title', 'slug', 'isPreview', 'contentType'] as const;
const UPDATE_LESSON_FIELDS = ['title', 'isPreview'] as const;

export async function createLesson(moduleId: string, input: CreateLessonInput): Promise<ActionResult<Lesson>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    const courseId = await getCourseIdForModule(moduleId);
    await requireCourseOwnership(authenticatedUser, courseId);

    const position = await getNextLessonPosition(moduleId);
    const [createdLesson] = await db
      .insert(lessons)
      .values({ ...pickFields(input, CREATE_LESSON_FIELDS), slug: slugify(input.slug), moduleId, position })
      .returning();
    if (!createdLesson) return { success: false, error: 'Failed to add lesson.' };
    return { success: true, data: createdLesson };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

export async function updateLesson(lessonId: string, updates: UpdateLessonInput): Promise<ActionResult<Lesson>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();

    const lessonRecord = await getLessonById(lessonId);
    if (!lessonRecord) return { success: false, error: 'Lesson not found.' };

    const courseId = await getCourseIdForModule(lessonRecord.moduleId);
    await requireCourseOwnership(authenticatedUser, courseId);

    const lessonFields = pickFields(updates, UPDATE_LESSON_FIELDS);
    if (Object.keys(lessonFields).length === 0) return { success: true, data: lessonRecord };
    const [updatedLesson] = await db.update(lessons).set(lessonFields).where(eq(lessons.id, lessonId)).returning();
    if (!updatedLesson) return { success: false, error: 'Failed to update lesson.' };
    return { success: true, data: updatedLesson };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}
