import type { CourseDetailContentInput } from './course-detail-content-schema';

// How each course page field is named in the editor, so a validation message can say where the
// problem is ("What you'll learn › Objectives: ...").
export const COURSE_PAGE_FIELD_LABELS: Record<keyof CourseDetailContentInput, string> = {
  courseCode: 'Header › Course code',
  tagline: 'Header › Tagline',
  quickFacts: 'Header › Highlights',
  overview: 'Overview › Description',
  importantNotice: 'Overview › Important notice',
  keyInfo: 'Overview › At a glance',
  objectives: "What you'll learn › Objectives",
  curriculumTopics: "What you'll learn › Topics covered",
  deliveryOptions: "How you'll train",
  prerequisites: 'Requirements › Before you enroll',
  whoShouldTakeThis: 'Requirements › Who this course is for',
  examInfo: 'Exam & certificate › Extra exam details',
  completionRequirements: 'Exam & certificate › To complete the course',
  outcomes: 'Exam & certificate › Topics covered on completion',
  licensingNotice: 'Exam & certificate › Licensing note',
  tuitionIncludes: 'Tuition › Tuition includes',
  paymentNotes: 'Tuition › Payment notes',
  afterEnrollmentNotes: 'After you enroll',
  faqs: 'FAQ',
  relatedCourseSlugs: 'Related › Linked courses',
  relatedCourses: 'Related › Other training',
};
