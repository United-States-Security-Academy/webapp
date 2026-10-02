import { pgTable, uuid, text, integer, timestamp, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

// Rich, self-contained content for a course's public description page. Every field is optional
// except the ones needed to render a coherent page at all — courses without this filled in simply
// don't show the extended description section, so this is additive and never a required part of
// creating a course.
export interface CourseDetailContentData {
  courseCode?: string;
  tagline?: string;
  quickFacts?: { label: string; value: string }[];
  overview?: string[];
  importantNotice?: string;
  keyInfo?: { label: string; value: string }[];
  deliveryOptions?: { title: string; points: string[] }[];
  prerequisites?: string[];
  objectives?: string[];
  curriculumTopics?: { title: string; description: string }[];
  examInfo?: { label: string; value: string }[];
  completionRequirements?: string[];
  outcomes?: string[];
  whoShouldTakeThis?: string[];
  licensingNotice?: string;
  relatedCourses?: { title: string; description: string }[];
  tuitionIncludes?: string[];
  paymentNotes?: string[];
  contact?: { address?: string; phone?: string; altPhone?: string; email?: string };
  afterEnrollmentNotes?: string[];
}

export const courseStatusEnum = pgEnum('course_status', ['draft', 'published', 'archived']);

// Mirrors the five training programs advertised on the homepage, so a course's category can
// reuse the same icon set and copy instead of introducing a second taxonomy.
export const courseCategoryEnum = pgEnum('course_category', [
  'military',
  'lawEnforcement',
  'corrections',
  'security',
  'safety',
]);

export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull().references(() => users.id),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    summary: text('summary'),
    thumbnailUrl: text('thumbnail_url'),
    detailContent: jsonb('detail_content').$type<CourseDetailContentData>(),
    category: courseCategoryEnum('category').notNull(),
    priceAmountMinor: integer('price_amount_minor').notNull().default(0),
    currency: text('currency').notNull(),
    status: courseStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdIndex: index('courses_owner_id_index').on(table.ownerId),
  }),
);
