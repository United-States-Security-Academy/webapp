import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { courses, enrollments, lessons, modules, payments, users } from '@/db/schema';
import type { Course, CourseCategory } from '@/features/courses/course-types';

const DAY_MS = 24 * 60 * 60 * 1000;
export const ENROLLMENT_TREND_DAYS = 90;

// Month and day boundaries are UTC — the server has no single "local" time zone for an admin.
function startOfUtcMonth(date: Date, monthOffset = 0): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthOffset, 1));
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export interface MonthOverMonth {
  thisMonth: number;
  lastMonth: number;
}

export interface RevenueSummary extends MonthOverMonth {
  currency: string;
  // True when payments exist in more than one currency; only the main one is summed above.
  hasOtherCurrencies: boolean;
}

export interface DailyEnrollmentCount {
  // UTC date as YYYY-MM-DD.
  date: string;
  count: number;
}

export interface AdminOverview {
  revenue: RevenueSummary;
  enrollments: MonthOverMonth;
  newUsers: MonthOverMonth;
  totalUsers: number;
  totalCourses: number;
  publishedCourses: number;
  dailyEnrollments: DailyEnrollmentCount[];
  enrollmentsByCategory: { category: CourseCategory; count: number }[];
}

function splitByMonth(timestamps: Date[], thisMonthStart: Date, lastMonthStart: Date): MonthOverMonth {
  let thisMonth = 0;
  let lastMonth = 0;
  for (const timestamp of timestamps) {
    if (timestamp >= thisMonthStart) thisMonth += 1;
    else if (timestamp >= lastMonthStart) lastMonth += 1;
  }
  return { thisMonth, lastMonth };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const now = new Date();
  const thisMonthStart = startOfUtcMonth(now);
  const lastMonthStart = startOfUtcMonth(now, -1);
  const trendStart = new Date(startOfUtcDay(now).getTime() - (ENROLLMENT_TREND_DAYS - 1) * DAY_MS);
  const windowStart = trendStart < lastMonthStart ? trendStart : lastMonthStart;

  const [paymentRows, enrollmentRows, newUserRows, userTotals, courseRows, categoryRows] = await Promise.all([
    db
      .select({ amountMinor: payments.amountMinor, currency: payments.currency, createdAt: payments.createdAt })
      .from(payments)
      .where(and(eq(payments.status, 'succeeded'), gte(payments.createdAt, lastMonthStart))),
    db.select({ enrolledAt: enrollments.enrolledAt }).from(enrollments).where(gte(enrollments.enrolledAt, windowStart)),
    db.select({ createdAt: users.createdAt }).from(users).where(gte(users.createdAt, lastMonthStart)),
    db.select({ total: count() }).from(users),
    db.select({ status: courses.status }).from(courses),
    db
      .select({ category: courses.category, count: count() })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .groupBy(courses.category)
      .orderBy(desc(count())),
  ]);

  const revenueByCurrency = new Map<string, MonthOverMonth>();
  for (const paymentRow of paymentRows) {
    const totals = revenueByCurrency.get(paymentRow.currency) ?? { thisMonth: 0, lastMonth: 0 };
    if (paymentRow.createdAt >= thisMonthStart) totals.thisMonth += paymentRow.amountMinor;
    else totals.lastMonth += paymentRow.amountMinor;
    revenueByCurrency.set(paymentRow.currency, totals);
  }
  const [mainCurrency, mainRevenue] = [...revenueByCurrency.entries()].sort(
    ([, a], [, b]) => b.thisMonth + b.lastMonth - (a.thisMonth + a.lastMonth),
  )[0] ?? ['USD', { thisMonth: 0, lastMonth: 0 }];

  const countsByDay = new Map<string, number>();
  for (const { enrolledAt } of enrollmentRows) {
    if (enrolledAt < trendStart) continue;
    const dayKey = startOfUtcDay(enrolledAt).toISOString().slice(0, 10);
    countsByDay.set(dayKey, (countsByDay.get(dayKey) ?? 0) + 1);
  }
  const dailyEnrollments = Array.from({ length: ENROLLMENT_TREND_DAYS }, (_, index) => {
    const date = new Date(trendStart.getTime() + index * DAY_MS).toISOString().slice(0, 10);
    return { date, count: countsByDay.get(date) ?? 0 };
  });

  return {
    revenue: { currency: mainCurrency, ...mainRevenue, hasOtherCurrencies: revenueByCurrency.size > 1 },
    enrollments: splitByMonth(
      enrollmentRows.map((row) => row.enrolledAt),
      thisMonthStart,
      lastMonthStart,
    ),
    newUsers: splitByMonth(
      newUserRows.map((row) => row.createdAt),
      thisMonthStart,
      lastMonthStart,
    ),
    totalUsers: userTotals[0]?.total ?? 0,
    totalCourses: courseRows.length,
    publishedCourses: courseRows.filter((courseRow) => courseRow.status === 'published').length,
    dailyEnrollments,
    enrollmentsByCategory: categoryRows,
  };
}

export interface TopCourseRow {
  course: Course;
  instructorName: string;
  enrollmentCount: number;
  lessonCount: number;
  revenueMinor: number;
}

export async function listTopCourses(limit = 8): Promise<TopCourseRow[]> {
  const enrollmentCount = sql<number>`(select count(*) from ${enrollments} where ${enrollments.courseId} = ${courses.id})`.mapWith(
    Number,
  );
  const lessonCount = sql<number>`(
    select count(*) from ${lessons}
    inner join ${modules} on ${modules.id} = ${lessons.moduleId}
    where ${modules.courseId} = ${courses.id}
  )`.mapWith(Number);
  const revenueMinor = sql<number>`(
    select coalesce(sum(${payments.amountMinor}), 0) from ${payments}
    where ${payments.courseId} = ${courses.id} and ${payments.status} = 'succeeded'
  )`.mapWith(Number);

  return db
    .select({ course: courses, instructorName: users.displayName, enrollmentCount, lessonCount, revenueMinor })
    .from(courses)
    .innerJoin(users, eq(users.id, courses.ownerId))
    .orderBy(desc(enrollmentCount), desc(courses.createdAt))
    .limit(limit);
}
