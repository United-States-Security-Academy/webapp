import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { COURSE_CATEGORY_META } from '@/features/courses/course-category';
import type { EnrolledCourseSummary } from './dashboard-queries';

export function EnrolledCourseCard({ course, progress, nextLessonSlug, nextLessonHref, hasPassedRequiredAssessment }: EnrolledCourseSummary) {
  const isCompleted = progress.completedAt !== null;
  const isCertified = isCompleted && hasPassedRequiredAssessment;
  const needsAssessment = isCompleted && !hasPassedRequiredAssessment;
  const continueHref = isCertified
    ? `/dashboard/certificates/${course.slug}`
    : needsAssessment
      ? `/dashboard/courses/${course.slug}/assessment`
      : nextLessonHref
        ? nextLessonHref
        : nextLessonSlug
          ? `/dashboard/courses/${course.slug}/lessons/${nextLessonSlug}`
          : `/dashboard/courses/${course.slug}`;
  const actionLabel = isCertified
    ? 'View certificate'
    : needsAssessment
      ? 'Take final assessment'
      : progress.completedLessons > 0
        ? 'Resume course'
        : 'Start course';
  const percentage = progress.totalLessons === 0 ? 0 : Math.round((progress.completedLessons / progress.totalLessons) * 100);
  const categoryMeta = COURSE_CATEGORY_META[course.category];

  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
          <Icon name={categoryMeta.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="line-clamp-2 font-bold leading-snug text-navy-900">{course.title}</p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{categoryMeta.label}</p>
        </div>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${course.title} progress`}
      >
        <div className="h-full rounded-full bg-gold-500" style={{ width: `${percentage}%` }} />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Icon name="document" className="h-3.5 w-3.5" />
          {progress.completedLessons}/{progress.totalLessons} lessons
        </span>
        <span className="font-semibold text-navy-900">{percentage}%</span>
      </div>

      <Link
        href={continueHref}
        className="mt-4 inline-flex items-center gap-1 self-start text-xs font-bold text-gold-600 hover:text-navy-800"
      >
        {actionLabel} &rarr;
      </Link>
    </div>
  );
}
