import { and, desc, eq, notInArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { courses, enrollments, users } from '@/db/schema';
import { listEnrollmentsByUser } from '@/features/enrollments/enrollment-queries';
import { getCourseContentTrees, listLessonsInOrder } from '@/features/courses/course-content-queries';
import {
  computeCourseProgress,
  type CompletedLessonActivity,
  type CourseProgress,
} from '@/features/progress/course-progress-queries';
import { getRequiredAssessmentStatuses } from '@/features/assessments/assessment-queries';
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

// Two waves of set-based queries no matter how many courses the learner has: enrollments, then
// every course's content and assessment status at once. Progress is worked out from
// `completedLessons`, which the caller loads once and also uses for activity and streaks.
export async function listEnrolledCoursesWithProgress(
  userId: string,
  // A promise so the caller can start this query once, share it, and let it run in parallel.
  completedLessonsPromise: Promise<CompletedLessonActivity[]>,
): Promise<EnrolledCourseSummary[]> {
  const enrollmentRows = await listEnrollmentsByUser(userId);
  const courseIds = enrollmentRows.map(({ course }) => course.id);
  const [contentTrees, assessmentStatuses] = await Promise.all([
    getCourseContentTrees(courseIds),
    getRequiredAssessmentStatuses(userId, courseIds),
  ]);
  const completedLessons = await completedLessonsPromise;
  const completedAtByLessonId = new Map(completedLessons.map((row) => [row.lessonId, row.completedAt]));

  return enrollmentRows.map(({ enrollment, course }) => {
    const lessonsInOrder = listLessonsInOrder(contentTrees.get(course.id) ?? []);
    const nextLesson = lessonsInOrder.find((lesson) => !completedAtByLessonId.has(lesson.id)) ?? lessonsInOrder[0];
    return {
      course,
      progress: computeCourseProgress(
        lessonsInOrder.map((lesson) => lesson.id),
        completedAtByLessonId,
      ),
      enrolledAt: enrollment.enrolledAt,
      nextLessonSlug: nextLesson?.slug ?? null,
      hasPassedRequiredAssessment: assessmentStatuses.get(course.id)?.hasPassed ?? true,
    };
  });
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

// Pure — built from data the dashboard already loaded, so it adds no queries of its own.
export function buildRecentActivity(
  enrolledCourses: EnrolledCourseSummary[],
  completedLessons: CompletedLessonActivity[],
  limit = 15,
): ActivityEvent[] {
  const enrollmentEvents: ActivityEvent[] = enrolledCourses.map(({ enrolledAt, course }) => ({
    type: 'enrolled',
    timestamp: enrolledAt,
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

// Published courses the learner isn't enrolled in yet, newest first. Excludes enrollments with a
// subquery, so it doesn't have to wait for the enrollment list and can run alongside it.
export async function listRecommendedCourses(userId: string, limit = 4): Promise<RecommendedCourse[]> {
  const enrolledCourseIds = db.select({ courseId: enrollments.courseId }).from(enrollments).where(eq(enrollments.userId, userId));
  return db
    .select({ course: courses, instructorName: users.displayName })
    .from(courses)
    .innerJoin(users, eq(users.id, courses.ownerId))
    .where(and(eq(courses.status, 'published'), notInArray(courses.id, enrolledCourseIds)))
    .orderBy(desc(courses.createdAt))
    .limit(limit);
}
