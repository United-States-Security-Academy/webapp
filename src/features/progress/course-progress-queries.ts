import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { courses, lessonProgress, lessons, modules } from '@/db/schema';

export interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
  // The moment the course became 100% complete (the last lesson's completedAt), or null if
  // it isn't fully complete yet. Derived, not stored — there is no separate "course completed" row.
  completedAt: Date | null;
}

// Progress from data the caller already has — the course's lessons and when the learner finished
// each — so pages that load the course content tree don't need separate progress queries.
export function computeCourseProgress(courseLessonIds: string[], completedAtByLessonId: Map<string, Date>): CourseProgress {
  const completedTimes = courseLessonIds.flatMap((lessonId) => {
    const completedAt = completedAtByLessonId.get(lessonId);
    return completedAt ? [completedAt] : [];
  });
  const isCourseComplete = courseLessonIds.length > 0 && completedTimes.length === courseLessonIds.length;
  const completedAt = isCourseComplete
    ? completedTimes.reduce((latest, time) => (time > latest ? time : latest))
    : null;
  return { totalLessons: courseLessonIds.length, completedLessons: completedTimes.length, completedAt };
}

// When the learner completed each lesson in the given courses, in one query.
export async function getCompletedLessonTimes(userId: string, courseIds: string[]): Promise<Map<string, Date>> {
  if (courseIds.length === 0) return new Map();
  const rows = await db
    .select({ lessonId: lessonProgress.lessonId, completedAt: lessonProgress.completedAt })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(and(eq(lessonProgress.userId, userId), inArray(modules.courseId, courseIds), isNotNull(lessonProgress.completedAt)));
  return new Map(rows.flatMap((row) => (row.completedAt ? [[row.lessonId, row.completedAt] as const] : [])));
}

export async function getCourseModuleProgress(userId: string, courseId: string): Promise<CourseProgress> {
  const courseLessons = await db
    .select({ lessonId: lessons.id })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(eq(modules.courseId, courseId));

  if (courseLessons.length === 0) return { totalLessons: 0, completedLessons: 0, completedAt: null };

  const completedRows = await db
    .select({ lessonId: lessonProgress.lessonId, completedAt: lessonProgress.completedAt })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(and(eq(lessonProgress.userId, userId), eq(modules.courseId, courseId), isNotNull(lessonProgress.completedAt)));

  const isCourseComplete = completedRows.length === courseLessons.length;
  const completedAt = isCourseComplete
    ? completedRows.reduce<Date | null>((latest, row) => {
        if (!row.completedAt) return latest;
        return !latest || row.completedAt > latest ? row.completedAt : latest;
      }, null)
    : null;

  return { totalLessons: courseLessons.length, completedLessons: completedRows.length, completedAt };
}

export interface CompletedLessonActivity {
  lessonId: string;
  courseId: string;
  lessonTitle: string;
  lessonSlug: string;
  courseTitle: string;
  courseSlug: string;
  completedAt: Date;
}

export async function listCompletedLessonsForUser(userId: string): Promise<CompletedLessonActivity[]> {
  const rows = await db
    .select({
      lessonId: lessons.id,
      courseId: courses.id,
      lessonTitle: lessons.title,
      lessonSlug: lessons.slug,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      completedAt: lessonProgress.completedAt,
    })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .innerJoin(courses, eq(courses.id, modules.courseId))
    .where(and(eq(lessonProgress.userId, userId), isNotNull(lessonProgress.completedAt)));

  return rows
    .filter((row): row is typeof row & { completedAt: Date } => row.completedAt !== null)
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
}

