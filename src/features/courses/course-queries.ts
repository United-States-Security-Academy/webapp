import { and, asc, eq, ilike, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { courses } from '@/db/schema';
import type { CourseCategory } from './course-types';

export async function getCourseBySlug(courseSlug: string) {
  const [courseRecord] = await db.select().from(courses).where(eq(courses.slug, courseSlug));
  return courseRecord ?? null;
}

export async function getCourseById(courseId: string) {
  const [courseRecord] = await db.select().from(courses).where(eq(courses.id, courseId));
  return courseRecord ?? null;
}

export async function listPublishedCourses(searchQuery?: string, category?: CourseCategory) {
  const conditions = [eq(courses.status, 'published')];
  if (searchQuery) conditions.push(ilike(courses.title, `%${searchQuery}%`));
  if (category) conditions.push(eq(courses.category, category));
  return db.select().from(courses).where(and(...conditions));
}

// Published courses for the given slugs, in the order the slugs are listed. Unknown or unpublished
// slugs are skipped, so a related-course link to a course that was unpublished just disappears.
export async function listPublishedCoursesBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [];
  const rows = await db
    .select()
    .from(courses)
    .where(and(eq(courses.status, 'published'), inArray(courses.slug, slugs)));
  return slugs.flatMap((slug) => rows.filter((row) => row.slug === slug));
}

export async function listCoursesByOwner(ownerId: string) {
  return db.select().from(courses).where(eq(courses.ownerId, ownerId));
}

// Every course's slug, title and status, for pickers (e.g. linking related courses).
export async function listCourseOptions() {
  return db.select({ slug: courses.slug, title: courses.title, status: courses.status }).from(courses).orderBy(asc(courses.title));
}
