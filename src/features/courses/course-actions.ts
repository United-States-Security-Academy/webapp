'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { courses } from '@/db/schema';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { requireRole } from '@/features/auth/require-role';
import { requireCourseOwnership } from './require-course-ownership';
import { slugify } from '@/slugify';
import type { Course, NewCourse } from './course-types';

type CreateCourseInput = Pick<NewCourse, 'slug' | 'title' | 'summary' | 'category' | 'priceAmountMinor' | 'currency'>;
type UpdateCourseInput = Partial<Pick<NewCourse, 'title' | 'summary' | 'category' | 'priceAmountMinor' | 'currency'>>;

// Each action below wraps its body in a try/catch that converts our own ApiError (an
// intentional, safe-to-show validation error) into a returned message — Next.js redacts thrown
// Error messages from Server Actions by default in production, so throwing would otherwise leave
// the client with nothing but a generic "error occurred" string. Anything that isn't an ApiError
// is a genuine bug and is left to throw/redact as normal.

export async function createCourse(input: CreateCourseInput): Promise<ActionResult<Course>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    requireRole(authenticatedUser, ['instructor', 'admin']);

    const [createdCourse] = await db
      .insert(courses)
      .values({ ...input, slug: slugify(input.slug), ownerId: authenticatedUser.userId })
      .returning();
    if (!createdCourse) return { success: false, error: 'Failed to create course.' };
    return { success: true, data: createdCourse };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

export async function updateCourse(courseId: string, updates: UpdateCourseInput): Promise<ActionResult<Course>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    await requireCourseOwnership(authenticatedUser, courseId);

    const [updatedCourse] = await db.update(courses).set(updates).where(eq(courses.id, courseId)).returning();
    if (!updatedCourse) return { success: false, error: 'Course not found.' };
    return { success: true, data: updatedCourse };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

export async function publishCourse(courseId: string): Promise<ActionResult<Course>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    await requireCourseOwnership(authenticatedUser, courseId);

    const [publishedCourse] = await db
      .update(courses)
      .set({ status: 'published', publishedAt: new Date() })
      .where(eq(courses.id, courseId))
      .returning();
    if (!publishedCourse) return { success: false, error: 'Course not found.' };
    return { success: true, data: publishedCourse };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

export async function unpublishCourse(courseId: string): Promise<ActionResult<Course>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    await requireCourseOwnership(authenticatedUser, courseId);

    const [unpublishedCourse] = await db.update(courses).set({ status: 'draft' }).where(eq(courses.id, courseId)).returning();
    if (!unpublishedCourse) return { success: false, error: 'Course not found.' };
    return { success: true, data: unpublishedCourse };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

export async function deleteCourse(courseId: string): Promise<ActionResult> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    await requireCourseOwnership(authenticatedUser, courseId);

    await db.delete(courses).where(eq(courses.id, courseId));
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}
