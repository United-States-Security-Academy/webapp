'use server';

import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { modules } from '@/db/schema';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { API_ERROR_CODE } from '@/api-response/api-error-codes';
import { requireCourseOwnership } from '@/features/courses/require-course-ownership';
import { getModuleById } from './module-queries';

const MODULE_POSITION_GAP = 10;

type Module = typeof modules.$inferSelect;

async function getNextModulePosition(courseId: string): Promise<number> {
  const [lastModule] = await db
    .select()
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(desc(modules.position))
    .limit(1);
  return (lastModule?.position ?? 0) + MODULE_POSITION_GAP;
}

export async function createModule(courseId: string, title: string): Promise<ActionResult<Module>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    await requireCourseOwnership(authenticatedUser, courseId);

    const position = await getNextModulePosition(courseId);
    const [createdModule] = await db.insert(modules).values({ courseId, title, position }).returning();
    if (!createdModule) return { success: false, error: 'Failed to add module.' };
    return { success: true, data: createdModule };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

export async function updateModuleTitle(moduleId: string, title: string): Promise<ActionResult<Module>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    const moduleRecord = await getModuleById(moduleId);
    if (!moduleRecord) throw new ApiError(404, API_ERROR_CODE.MODULE_NOT_FOUND, 'Module not found.');
    await requireCourseOwnership(authenticatedUser, moduleRecord.courseId);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return { success: false, error: 'Module title cannot be empty.' };

    const [updatedModule] = await db
      .update(modules)
      .set({ title: trimmedTitle })
      .where(eq(modules.id, moduleId))
      .returning();
    if (!updatedModule) return { success: false, error: 'Module not found.' };
    return { success: true, data: updatedModule };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

export async function deleteModule(moduleId: string): Promise<ActionResult> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    const moduleRecord = await getModuleById(moduleId);
    if (!moduleRecord) throw new ApiError(404, API_ERROR_CODE.MODULE_NOT_FOUND, 'Module not found.');
    await requireCourseOwnership(authenticatedUser, moduleRecord.courseId);

    await db.delete(modules).where(eq(modules.id, moduleId));
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

// Moves a module to a new 1-based position within its course (e.g. module 3 to position 1),
// shifting the others along. The new order is worked out from the database rather than sent by
// the browser, so a stale page in another tab can't scramble the course.
export async function moveModule(moduleId: string, targetPosition: number): Promise<ActionResult> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    const moduleRecord = await getModuleById(moduleId);
    if (!moduleRecord) throw new ApiError(404, API_ERROR_CODE.MODULE_NOT_FOUND, 'Module not found.');
    await requireCourseOwnership(authenticatedUser, moduleRecord.courseId);

    const courseModules = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.courseId, moduleRecord.courseId))
      .orderBy(asc(modules.position), asc(modules.id));
    if (!Number.isInteger(targetPosition) || targetPosition < 1 || targetPosition > courseModules.length) {
      return { success: false, error: `Position must be between 1 and ${courseModules.length}.` };
    }

    const orderedIds = courseModules.map((courseModule) => courseModule.id).filter((id) => id !== moduleId);
    orderedIds.splice(targetPosition - 1, 0, moduleId);

    // Renumber every module in one transaction so the course never ends up half-reordered.
    await db.transaction(async (transaction) => {
      for (const [index, id] of orderedIds.entries()) {
        await transaction
          .update(modules)
          .set({ position: (index + 1) * MODULE_POSITION_GAP })
          .where(eq(modules.id, id));
      }
    });
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}
