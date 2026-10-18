'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { courses } from '@/db/schema';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { requireCourseOwnership } from '@/features/courses/require-course-ownership';
import type { CourseDetailContentData } from '@/features/courses/course-types';
import { courseDetailContentSchema, normalizeCourseDetailContent } from './course-detail-content-schema';
import { COURSE_PAGE_FIELD_LABELS } from './course-page-field-labels';

// Saves the course page editor. Only the fields the schema knows are kept (the parse drops
// anything else), every field is length-checked, and blank lines/sections are removed.
export async function updateCourseDetailContent(courseId: string, content: unknown): Promise<ActionResult<CourseDetailContentData>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    await requireCourseOwnership(authenticatedUser, courseId);

    const parsed = courseDetailContentSchema.safeParse(content);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path[0];
      const fieldLabel = typeof field === 'string' ? COURSE_PAGE_FIELD_LABELS[field as keyof typeof COURSE_PAGE_FIELD_LABELS] : undefined;
      return { success: false, error: `${fieldLabel ? `${fieldLabel}: ` : ''}${issue?.message ?? 'Some content is not valid.'}` };
    }

    const detailContent = normalizeCourseDetailContent(parsed.data);
    const [updatedCourse] = await db
      .update(courses)
      .set({ detailContent: Object.keys(detailContent).length > 0 ? detailContent : null })
      .where(eq(courses.id, courseId))
      .returning({ slug: courses.slug });
    if (!updatedCourse) return { success: false, error: 'Course not found.' };

    revalidatePath(`/courses/${updatedCourse.slug}`);
    revalidatePath(`/dashboard/courses/${updatedCourse.slug}`);
    revalidatePath(`/instructor/courses/${updatedCourse.slug}/course-page`);
    return { success: true, data: detailContent };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}
