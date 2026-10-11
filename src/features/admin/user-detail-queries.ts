import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  assessmentAttempts,
  courseAssessments,
  courses,
  discountCodeRedemptions,
  discountCodes,
  enrollments,
  payments,
  studentProfiles,
  users,
} from '@/db/schema';
import { getCourseContentTrees, listLessonsInOrder } from '@/features/courses/course-content-queries';
import { computeCourseProgress, listCompletedLessonsForUser, type CourseProgress } from '@/features/progress/course-progress-queries';
import { getRequiredAssessmentStatuses } from '@/features/assessments/assessment-queries';
import type { Course } from '@/features/courses/course-types';

export type EnrolledCourseStatus = 'not_started' | 'in_progress' | 'exam_pending' | 'certified';

export interface AdminUserCourse {
  course: Course;
  enrolledAt: Date;
  progress: CourseProgress;
  status: EnrolledCourseStatus;
  examAttemptCount: number;
  bestExamScore: number | null;
}

// Everything an admin may need about one user, loaded in two parallel waves of queries.
export async function getUserDetail(userId: string) {
  const [userRows, profileRows, enrollmentRows, completedLessons, attemptRows, paymentRows, redemptionRows, ownedCourses] =
    await Promise.all([
      db.select().from(users).where(eq(users.id, userId)),
      db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)),
      db
        .select({ enrollment: enrollments, course: courses })
        .from(enrollments)
        .innerJoin(courses, eq(courses.id, enrollments.courseId))
        .where(eq(enrollments.userId, userId))
        .orderBy(desc(enrollments.enrolledAt)),
      listCompletedLessonsForUser(userId),
      db
        .select({ attempt: assessmentAttempts, courseId: courses.id, courseTitle: courses.title })
        .from(assessmentAttempts)
        .innerJoin(courseAssessments, eq(courseAssessments.id, assessmentAttempts.assessmentId))
        .innerJoin(courses, eq(courses.id, courseAssessments.courseId))
        .where(eq(assessmentAttempts.userId, userId))
        .orderBy(desc(assessmentAttempts.submittedAt)),
      db
        .select({ payment: payments, courseTitle: courses.title })
        .from(payments)
        .innerJoin(courses, eq(courses.id, payments.courseId))
        .where(eq(payments.userId, userId))
        .orderBy(desc(payments.createdAt)),
      db
        .select({ redeemedAt: discountCodeRedemptions.createdAt, code: discountCodes.code, percentOff: discountCodes.percentOff, courseTitle: courses.title })
        .from(discountCodeRedemptions)
        .innerJoin(discountCodes, eq(discountCodes.id, discountCodeRedemptions.discountCodeId))
        .innerJoin(courses, eq(courses.id, discountCodeRedemptions.courseId))
        .where(eq(discountCodeRedemptions.userId, userId))
        .orderBy(desc(discountCodeRedemptions.createdAt)),
      db.select().from(courses).where(eq(courses.ownerId, userId)).orderBy(desc(courses.createdAt)),
    ]);

  const user = userRows[0];
  if (!user) return null;

  const enrolledCourseIds = enrollmentRows.map(({ course }) => course.id);
  const [contentTrees, assessmentStatuses] = await Promise.all([
    getCourseContentTrees(enrolledCourseIds),
    getRequiredAssessmentStatuses(userId, enrolledCourseIds),
  ]);
  const completedAtByLessonId = new Map(completedLessons.map((row) => [row.lessonId, row.completedAt]));

  const enrolledCourses: AdminUserCourse[] = enrollmentRows.map(({ enrollment, course }) => {
    const lessonIds = listLessonsInOrder(contentTrees.get(course.id) ?? []).map((lesson) => lesson.id);
    const progress = computeCourseProgress(lessonIds, completedAtByLessonId);
    const courseAttempts = attemptRows.filter((row) => row.courseId === course.id);
    const hasPassedExam = assessmentStatuses.get(course.id)?.hasPassed ?? true;
    const status: EnrolledCourseStatus =
      progress.completedAt !== null
        ? hasPassedExam
          ? 'certified'
          : 'exam_pending'
        : progress.completedLessons > 0
          ? 'in_progress'
          : 'not_started';
    return {
      course,
      enrolledAt: enrollment.enrolledAt,
      progress,
      status,
      examAttemptCount: courseAttempts.length,
      bestExamScore: courseAttempts.length > 0 ? Math.max(...courseAttempts.map((row) => row.attempt.scorePercentage)) : null,
    };
  });

  const succeededPayments = paymentRows.filter(({ payment }) => payment.status === 'succeeded');
  const totalPaidByCurrency = new Map<string, number>();
  for (const { payment } of succeededPayments) {
    totalPaidByCurrency.set(payment.currency, (totalPaidByCurrency.get(payment.currency) ?? 0) + payment.amountMinor);
  }

  return {
    user,
    profile: profileRows[0] ?? null,
    enrolledCourses,
    completedLessons,
    examAttempts: attemptRows,
    payments: paymentRows,
    totalPaidByCurrency,
    discountRedemptions: redemptionRows,
    ownedCourses,
  };
}

export type AdminUserDetail = NonNullable<Awaited<ReturnType<typeof getUserDetail>>>;

// Only used when an admin clicks "Show" on a government ID, so the full number isn't sent with the page.
export async function getGovernmentIdValue(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ value: studentProfiles.governmentIdValue })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, userId));
  return row?.value ?? null;
}

