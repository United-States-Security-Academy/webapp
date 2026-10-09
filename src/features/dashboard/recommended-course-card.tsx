import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { formatCoursePrice } from '@/features/courses/format-course-price';
import { COURSE_CATEGORY_META } from '@/features/courses/course-category';
import type { RecommendedCourse } from './dashboard-queries';

const NEW_COURSE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function RecommendedCourseCard({ course, instructorName }: RecommendedCourse) {
  const isNew = Date.now() - course.createdAt.getTime() < NEW_COURSE_WINDOW_MS;

  return (
    <Link
      href={`/dashboard/courses/${course.slug}`}
      className="block overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-video w-full bg-navy-900">
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
          <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy-900 to-navy-950">
            <Icon name={COURSE_CATEGORY_META[course.category].icon} className="h-10 w-10 text-gold-400/60" />
          </div>
        )}
        {isNew && (
          <span className="absolute left-3 top-3 rounded-full bg-gold-500 px-2.5 py-0.5 text-[11px] font-bold text-navy-950">New</span>
        )}
      </div>
      <div className="p-4">
        <p className="line-clamp-2 font-bold leading-snug text-navy-900">{course.title}</p>
        <p className="mt-1 text-xs text-slate-500">{instructorName}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {COURSE_CATEGORY_META[course.category].label}
          </span>
          <span className="text-sm font-extrabold text-navy-900">{formatCoursePrice(course.priceAmountMinor, course.currency)}</span>
        </div>
      </div>
    </Link>
  );
}
