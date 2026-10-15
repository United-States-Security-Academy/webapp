import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { structuredLessonProgress, structuredModuleRevisions, structuredModules } from '@/db/schema';
import type { StructuredLessonContent } from '@/db/schema/structured-courses';
import { structuredModuleContentSchema } from './structured-content-schema';
import type { StructuredOutlineModule } from './structured-course-progress';

// What students can reach in structured courses: only modules with a published revision, and
// only that revision's lessons. Drafts never appear here.

// The published modules of each course, in order, with their lesson titles (read from the
// published revision without loading every block) and, for a signed-in learner, when they
// completed each lesson.
export async function getStructuredCourseOutlines(courseIds: string[], userId: string | null): Promise<Map<string, StructuredOutlineModule[]>> {
  const outlines = new Map<string, StructuredOutlineModule[]>();
  if (courseIds.length === 0) return outlines;

  const moduleRows = await db
    .select({
      moduleId: structuredModules.id,
      courseId: structuredModules.courseId,
      title: sql<string | null>`${structuredModuleRevisions.content}->>'title'`,
      lessons: sql<{ key: string; title: string }[] | null>`(
        select jsonb_agg(jsonb_build_object('key', lesson_row.lesson->>'key', 'title', lesson_row.lesson->>'title') order by lesson_row.ordinality)
        from jsonb_array_elements(${structuredModuleRevisions.content}->'lessons') with ordinality as lesson_row(lesson, ordinality)
      )`,
    })
    .from(structuredModules)
    .innerJoin(structuredModuleRevisions, eq(structuredModuleRevisions.id, structuredModules.publishedRevisionId))
    .where(inArray(structuredModules.courseId, courseIds))
    .orderBy(asc(structuredModules.courseId), asc(structuredModules.position), asc(structuredModules.createdAt));

  const completedAtByLesson = new Map<string, Date>();
  if (userId && moduleRows.length > 0) {
    const progressRows = await db
      .select({ moduleId: structuredLessonProgress.moduleId, lessonKey: structuredLessonProgress.lessonKey, completedAt: structuredLessonProgress.completedAt })
      .from(structuredLessonProgress)
      .where(
        and(
          eq(structuredLessonProgress.userId, userId),
          inArray(
            structuredLessonProgress.moduleId,
            moduleRows.map((row) => row.moduleId),
          ),
          isNotNull(structuredLessonProgress.completedAt),
        ),
      );
    for (const row of progressRows) {
      if (row.completedAt) completedAtByLesson.set(`${row.moduleId}/${row.lessonKey}`, row.completedAt);
    }
  }

  for (const row of moduleRows) {
    const courseOutline = outlines.get(row.courseId) ?? [];
    courseOutline.push({
      moduleId: row.moduleId,
      title: row.title ?? 'Module',
      lessons: (row.lessons ?? []).map((lesson) => ({
        moduleId: row.moduleId,
        lessonKey: lesson.key,
        title: lesson.title,
        completedAt: completedAtByLesson.get(`${row.moduleId}/${lesson.key}`) ?? null,
      })),
    });
    outlines.set(row.courseId, courseOutline);
  }
  return outlines;
}

export interface PublishedStructuredLesson {
  courseId: string;
  moduleId: string;
  moduleTitle: string;
  revisionId: string;
  lesson: StructuredLessonContent;
}

// One lesson of a published module, with all its blocks. null when the module isn't published,
// or the published revision has no lesson with this key.
export async function getPublishedStructuredLesson(moduleId: string, lessonKey: string): Promise<PublishedStructuredLesson | null> {
  const [row] = await db
    .select({ courseId: structuredModules.courseId, revisionId: structuredModuleRevisions.id, content: structuredModuleRevisions.content })
    .from(structuredModules)
    .innerJoin(structuredModuleRevisions, eq(structuredModuleRevisions.id, structuredModules.publishedRevisionId))
    .where(eq(structuredModules.id, moduleId));
  if (!row) return null;

  const parsedContent = structuredModuleContentSchema.safeParse(row.content);
  if (!parsedContent.success) return null;
  const lesson = parsedContent.data.lessons.find((candidate) => candidate.key === lessonKey);
  if (!lesson) return null;

  return { courseId: row.courseId, moduleId, moduleTitle: parsedContent.data.title, revisionId: row.revisionId, lesson };
}

export async function getStructuredLessonProgressRecord(userId: string, moduleId: string, lessonKey: string) {
  const [progressRecord] = await db
    .select()
    .from(structuredLessonProgress)
    .where(
      and(
        eq(structuredLessonProgress.userId, userId),
        eq(structuredLessonProgress.moduleId, moduleId),
        eq(structuredLessonProgress.lessonKey, lessonKey),
      ),
    );
  return progressRecord ?? null;
}
