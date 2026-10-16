import type { Course } from '@/features/courses/course-types';
import { getStructuredCourseOutlines } from '@/features/structured-courses/structured-course-outline-queries';
import { computeStructuredCourseProgress } from '@/features/structured-courses/structured-course-progress';
import { getCourseModuleProgress, type CourseProgress } from './course-progress-queries';

// A learner's progress in one course, from whichever lessons the course currently delivers:
// PDF lessons for 'pdf' courses (unchanged), published structured lessons for 'structured' ones.
// Used by the exam and certificate gates, so finishing the lessons students actually see is what
// unlocks them.
export async function getLearnerCourseProgress(userId: string, courseRecord: Pick<Course, 'id' | 'deliveryFormat'>): Promise<CourseProgress> {
  if (courseRecord.deliveryFormat !== 'structured') return getCourseModuleProgress(userId, courseRecord.id);

  const outlines = await getStructuredCourseOutlines([courseRecord.id], userId);
  return computeStructuredCourseProgress(outlines.get(courseRecord.id) ?? []);
}
