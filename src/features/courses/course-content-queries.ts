import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { lessons, modules } from '@/db/schema';

type Module = typeof modules.$inferSelect;
type Lesson = typeof lessons.$inferSelect;

export interface CourseContentModule {
  moduleRecord: Module;
  moduleLessons: Lesson[];
}

// Modules and their lessons for several courses in a single query (modules LEFT JOIN lessons),
// instead of one query per module. Courses with no modules are absent from the map.
export async function getCourseContentTrees(courseIds: string[]): Promise<Map<string, CourseContentModule[]>> {
  const treesByCourseId = new Map<string, CourseContentModule[]>();
  if (courseIds.length === 0) return treesByCourseId;

  const rows = await db
    .select({ moduleRecord: modules, lessonRecord: lessons })
    .from(modules)
    .leftJoin(lessons, eq(lessons.moduleId, modules.id))
    .where(inArray(modules.courseId, courseIds))
    .orderBy(asc(modules.courseId), asc(modules.position), asc(modules.id), asc(lessons.position));

  for (const { moduleRecord, lessonRecord } of rows) {
    const courseTree = treesByCourseId.get(moduleRecord.courseId) ?? [];
    treesByCourseId.set(moduleRecord.courseId, courseTree);
    let contentModule = courseTree[courseTree.length - 1];
    if (contentModule?.moduleRecord.id !== moduleRecord.id) {
      contentModule = { moduleRecord, moduleLessons: [] };
      courseTree.push(contentModule);
    }
    if (lessonRecord) contentModule.moduleLessons.push(lessonRecord);
  }
  return treesByCourseId;
}

export async function getCourseContentTree(courseId: string): Promise<CourseContentModule[]> {
  return (await getCourseContentTrees([courseId])).get(courseId) ?? [];
}

export function listLessonsInOrder(contentTree: CourseContentModule[]): Lesson[] {
  return contentTree.flatMap(({ moduleLessons }) => moduleLessons);
}
