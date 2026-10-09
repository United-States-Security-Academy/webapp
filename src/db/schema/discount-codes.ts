import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';
import { courses } from './courses';

export const discountCodes = pgTable('discount_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Stored uppercase so lookups are case-insensitive for learners typing the code.
  code: text('code').notNull().unique(),
  percentOff: integer('percent_off').notNull(),
  // Null means the code applies to every course.
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  // Lowercased emails allowed to use the code; an empty list means anyone with the code.
  allowedEmails: text('allowed_emails').array().notNull().default([]),
  maxRedemptions: integer('max_redemptions'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const discountCodeRedemptions = pgTable(
  'discount_code_redemptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    discountCodeId: uuid('discount_code_id')
      .notNull()
      .references(() => discountCodes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    discountCodeIdUserIdUnique: uniqueIndex('discount_code_redemptions_discount_code_id_user_id_unique').on(
      table.discountCodeId,
      table.userId,
    ),
  }),
);

export type DiscountCode = typeof discountCodes.$inferSelect;
