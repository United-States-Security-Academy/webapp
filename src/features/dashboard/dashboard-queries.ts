import { and, desc, eq, notInArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { courses, users } from '@/db/schema';
import { listEnrollmentsByUser } from '@/features/enrollments/enrollment-queries';
import { getCourseContentTree } from '@/features/courses/course-content-queries';
import {
  getCourseModuleProgress,
  getCompletedLessonIds,
  listCompletedLessonsForUser,
  type CourseProgress,
} from '@/features/progress/course-progress-queries';
import { hasPassedRequiredAssessment } from '@/features/assessments/assessment-queries';
import type { Course } from '@/features/courses/course-types';

export interface EnrolledCourseSummary {
  course: Course;
  progress: CourseProgress;
  enrolledAt: Date;
  // The next lesson the learner hasn't completed yet, to power a "Continue" deep link.
  // Null only when the course has no lessons at all.
  nextLessonSlug: string | null;
  // True when the course has no published assessment, or the learner has a passing attempt on
  // it — a course finishing all its lessons isn't enough to certify if it also has an
  // assessment the learner hasn't passed yet.
  hasPassedRequiredAssessment: boolean;
}

export async function listEnrolledCoursesWithProgress(userId: string): Promise<EnrolledCourseSummary[]> {
  const enrollmentRows = await listEnrollmentsByUser(userId);

  return Promise.all(
    enrollmentRows.map(async ({ enrollment, course }) => {
      const [progress, completedLessonIds, contentTree, hasPassedAssessment] = await Promise.all([
        getCourseModuleProgress(userId, course.id),
        getCompletedLessonIds(userId, course.id),
        getCourseContentTree(course.id),
        hasPassedRequiredAssessment(userId, course.id),
      ]);

      const allLessonsInOrder = contentTree.flatMap(({ moduleLessons }) => moduleLessons);
      const nextLesson = allLessonsInOrder.find((lesson) => !completedLessonIds.has(lesson.id)) ?? allLessonsInOrder[0];

      return {
        course,
        progress,
        enrolledAt: enrollment.enrolledAt,
        nextLessonSlug: nextLesson?.slug ?? null,
        hasPassedRequiredAssessment: hasPassedAssessment,
      };
    }),
  );
}

export interface EarnedCertificate {
  course: Course;
  completedAt: Date;
}

// Pure — derives certificates from already-fetched enrollment/progress data instead of
// re-querying, since a course's certificate eligibility is just "100% complete".
export function selectEarnedCertificates(enrolledCourses: EnrolledCourseSummary[]): EarnedCertificate[] {
  return enrolledCourses
    .filter(
      (entry): entry is EnrolledCourseSummary & { progress: { completedAt: Date } } =>
        entry.progress.completedAt !== null && entry.hasPassedRequiredAssessment,
    )
    .map((entry) => ({ course: entry.course, completedAt: entry.progress.completedAt }))
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
}

export type ActivityEvent =
  | { type: 'enrolled'; timestamp: Date; courseTitle: string; courseSlug: string }
  | { type: 'lesson_completed'; timestamp: Date; courseTitle: string; courseSlug: string; lessonTitle: string; lessonSlug: string }
  | { type: 'certificate_earned'; timestamp: Date; courseTitle: string; courseSlug: string };

// `enrolledCourses` is passed in (rather than re-fetched) so the dashboard page's single
// listEnrolledCoursesWithProgress call is reused instead of duplicating that work here.
export async function getRecentActivity(
  userId: string,
  enrolledCourses: EnrolledCourseSummary[],
  limit = 15,
): Promise<ActivityEvent[]> {
  const [enrollmentRows, completedLessons] = await Promise.all([
    listEnrollmentsByUser(userId),
    listCompletedLessonsForUser(userId),
  ]);

  const enrollmentEvents: ActivityEvent[] = enrollmentRows.map(({ enrollment, course }) => ({
    type: 'enrolled',
    timestamp: enrollment.enrolledAt,
    courseTitle: course.title,
    courseSlug: course.slug,
  }));

  const lessonEvents: ActivityEvent[] = completedLessons.map((row) => ({
    type: 'lesson_completed',
    timestamp: row.completedAt,
    courseTitle: row.courseTitle,
    courseSlug: row.courseSlug,
    lessonTitle: row.lessonTitle,
    lessonSlug: row.lessonSlug,
  }));

  const certificateEvents: ActivityEvent[] = selectEarnedCertificates(enrolledCourses).map((certificate) => ({
    type: 'certificate_earned',
    timestamp: certificate.completedAt,
    courseTitle: certificate.course.title,
    courseSlug: certificate.course.slug,
  }));

  return [...enrollmentEvents, ...lessonEvents, ...certificateEvents]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

export interface RecommendedCourse {
  course: Course;
  instructorName: string;
}

// Published courses the learner isn't enrolled in yet, newest first.
export async function listRecommendedCourses(
  enrolledCourses: EnrolledCourseSummary[],
  limit = 4,
): Promise<RecommendedCourse[]> {
  const enrolledCourseIds = enrolledCourses.map((entry) => entry.course.id);
  const conditions = [eq(courses.status, 'published')];
  if (enrolledCourseIds.length > 0) conditions.push(notInArray(courses.id, enrolledCourseIds));

  const rows = await db
    .select({ course: courses, instructorName: users.displayName })
    .from(courses)
    .innerJoin(users, eq(users.id, courses.ownerId))
    .where(and(...conditions))
    .orderBy(desc(courses.createdAt))
    .limit(limit);
  return rows;
}
