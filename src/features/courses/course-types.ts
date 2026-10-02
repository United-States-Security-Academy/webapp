import type { courses, courseCategoryEnum } from '@/db/schema';

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type CourseCategory = (typeof courseCategoryEnum.enumValues)[number];
export type { CourseDetailContentData } from '@/db/schema/courses';
