import { z } from 'zod';
import type { CourseDetailContentData } from '@/features/courses/course-types';

// Validation for the course page editor. Generous limits that real content stays well inside,
// but that stop a runaway paste from bloating every course page load.
const SHORT_TEXT = 200;
const PARAGRAPH = 2000;
const NOTICE = 4000;
const MAX_ITEMS = 40;

const shortText = z.string().trim().max(SHORT_TEXT, `Keep each line under ${SHORT_TEXT} characters.`);
const paragraph = z.string().trim().max(PARAGRAPH, `Keep each paragraph under ${PARAGRAPH} characters.`);
const textList = (itemSchema: z.ZodString) => z.array(itemSchema).max(MAX_ITEMS, `Use at most ${MAX_ITEMS} items.`);
const labelValueList = z
  .array(z.object({ label: shortText, value: z.string().trim().max(PARAGRAPH) }))
  .max(MAX_ITEMS, `Use at most ${MAX_ITEMS} items.`);
const titleDescriptionList = z
  .array(z.object({ title: shortText, description: paragraph }))
  .max(MAX_ITEMS, `Use at most ${MAX_ITEMS} items.`);

export const courseDetailContentSchema = z.object({
  courseCode: z.string().trim().max(60).optional(),
  tagline: shortText.optional(),
  quickFacts: labelValueList.optional(),
  overview: textList(paragraph).optional(),
  importantNotice: z.string().trim().max(NOTICE).optional(),
  keyInfo: labelValueList.optional(),
  deliveryOptions: z
    .array(z.object({ title: shortText, points: textList(paragraph) }))
    .max(10)
    .optional(),
  prerequisites: textList(paragraph).optional(),
  objectives: textList(paragraph).optional(),
  curriculumTopics: titleDescriptionList.optional(),
  examInfo: labelValueList.optional(),
  completionRequirements: textList(paragraph).optional(),
  outcomes: textList(shortText).optional(),
  whoShouldTakeThis: textList(paragraph).optional(),
  licensingNotice: z.string().trim().max(NOTICE).optional(),
  relatedCourseSlugs: z.array(z.string().trim().max(200)).max(12).optional(),
  relatedCourses: titleDescriptionList.optional(),
  tuitionIncludes: textList(paragraph).optional(),
  paymentNotes: textList(paragraph).optional(),
  faqs: z
    .array(z.object({ question: shortText, answer: z.string().trim().max(NOTICE) }))
    .max(MAX_ITEMS)
    .optional(),
  afterEnrollmentNotes: textList(paragraph).optional(),
});

export type CourseDetailContentInput = z.infer<typeof courseDetailContentSchema>;

// Drops blank lines, rows and whole sections so the stored content only holds what the page will
// show — an empty field the admin left in the editor shouldn't render an empty heading. Fields
// the schema doesn't know (like the retired per-course `contact`) are dropped by the parse.
export function normalizeCourseDetailContent(input: CourseDetailContentInput): CourseDetailContentData {
  const texts = (items?: string[]) => items?.filter((item) => item.length > 0);
  const pairs = (items?: { label: string; value: string }[]) => items?.filter((item) => item.label && item.value);
  const titled = (items?: { title: string; description: string }[]) => items?.filter((item) => item.title);

  const normalized: CourseDetailContentData = {
    courseCode: input.courseCode || undefined,
    tagline: input.tagline || undefined,
    quickFacts: pairs(input.quickFacts),
    overview: texts(input.overview),
    importantNotice: input.importantNotice || undefined,
    keyInfo: pairs(input.keyInfo),
    deliveryOptions: input.deliveryOptions
      ?.map((option) => ({ title: option.title, points: option.points.filter((point) => point.length > 0) }))
      .filter((option) => option.title || option.points.length > 0),
    prerequisites: texts(input.prerequisites),
    objectives: texts(input.objectives),
    curriculumTopics: titled(input.curriculumTopics),
    examInfo: pairs(input.examInfo),
    completionRequirements: texts(input.completionRequirements),
    outcomes: texts(input.outcomes),
    whoShouldTakeThis: texts(input.whoShouldTakeThis),
    licensingNotice: input.licensingNotice || undefined,
    relatedCourseSlugs: input.relatedCourseSlugs ? [...new Set(texts(input.relatedCourseSlugs))] : undefined,
    relatedCourses: titled(input.relatedCourses),
    tuitionIncludes: texts(input.tuitionIncludes),
    paymentNotes: texts(input.paymentNotes),
    faqs: input.faqs?.filter((faq) => faq.question && faq.answer),
    afterEnrollmentNotes: texts(input.afterEnrollmentNotes),
  };

  return Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined && !(Array.isArray(value) && value.length === 0)),
  ) as CourseDetailContentData;
}
