import type { IconName } from '@/components/ui/icon';
import type { EnrolledCourseSummary, EarnedCertificate } from './dashboard-queries';

export interface Achievement {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  isEarned: boolean;
}

// Purely derived from enrollment/progress data already on hand — no achievements table.
export function computeAchievements(enrolledCourses: EnrolledCourseSummary[], certificates: EarnedCertificate[]): Achievement[] {
  const totalLessonsCompleted = enrolledCourses.reduce((sum, entry) => sum + entry.progress.completedLessons, 0);
  const enrolledProgramCount = new Set(enrolledCourses.map((entry) => entry.course.category)).size;

  return [
    {
      id: 'first-enrollment',
      label: 'Getting Started',
      description: 'Enroll in your first course',
      icon: 'bookOpen',
      isEarned: enrolledCourses.length >= 1,
    },
    {
      id: 'first-lesson',
      label: 'First Steps',
      description: 'Complete your first lesson',
      icon: 'checkCircle',
      isEarned: totalLessonsCompleted >= 1,
    },
    {
      id: 'first-certificate',
      label: 'Certified',
      description: 'Earn your first certificate',
      icon: 'award',
      isEarned: certificates.length >= 1,
    },
    {
      id: 'dedicated-learner',
      label: 'Dedicated Learner',
      description: 'Complete 10 lessons',
      icon: 'shieldCheck',
      isEarned: totalLessonsCompleted >= 10,
    },
    {
      id: 'cross-trained',
      label: 'Cross-Trained',
      description: 'Train in 2 different programs',
      icon: 'globe',
      isEarned: enrolledProgramCount >= 2,
    },
    {
      id: 'course-collector',
      label: 'Course Collector',
      description: 'Enroll in 3 courses',
      icon: 'classroom',
      isEarned: enrolledCourses.length >= 3,
    },
    {
      id: 'lesson-veteran',
      label: 'Lesson Veteran',
      description: 'Complete 25 lessons',
      icon: 'target',
      isEarned: totalLessonsCompleted >= 25,
    },
    {
      id: 'multi-certified',
      label: 'Multi-Certified',
      description: 'Earn 3 certificates',
      icon: 'military',
      isEarned: certificates.length >= 3,
    },
  ];
}
