'use server';

import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { modules } from '@/db/schema';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { requireCourseOwnership } from '@/features/courses/require-course-ownership';

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

export async function reorderModules(courseId: string, orderedModuleIds: string[]) {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  await requireCourseOwnership(authenticatedUser, courseId);

  await Promise.all(
    orderedModuleIds.map((moduleId, index) =>
      db
        .update(modules)
        .set({ position: (index + 1) * MODULE_POSITION_GAP })
        .where(eq(modules.id, moduleId)),
    ),
  );
}
