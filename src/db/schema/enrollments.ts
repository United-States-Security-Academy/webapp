import { pgTable, uuid, timestamp, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';
import { courses } from './courses';

export const enrollmentStatusEnum = pgEnum('enrollment_status', ['active']);

export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
    status: enrollmentStatusEnum('status').notNull().default('active'),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
    // The admin who gave this learner access from the admin console (null = enrolled themselves,
    // through checkout or a free course).
    grantedBy: uuid('granted_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    userIdCourseIdUnique: uniqueIndex('enrollments_user_id_course_id_unique').on(table.userId, table.courseId),
  }),
);

export type Enrollment = typeof enrollments.$inferSelect;
