import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { COURSE_CATEGORY_META } from '@/features/courses/course-category';
import type { Course } from '@/features/courses/course-types';

// The navy header of a course page: what the course is, in one screen. The right-hand side is left
// clear on large screens for the enroll card, which overlaps the bottom of this header.
export function CourseHero({
  course,
  courseCode,
  tagline,
  highlights,
  backLink,
}: {
  course: Course;
  courseCode?: string;
  tagline?: string;
  highlights: { label: string; value: string }[];
  backLink: { href: string; label: string };
}) {
  const categoryMeta = COURSE_CATEGORY_META[course.category];

  return (
    <section className="theme-fixed bg-navy-950 text-white">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 lg:min-h-[20rem] lg:pb-14">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
          <Link href={backLink.href} className="hover:text-gold-400">
            {backLink.label}
          </Link>
          <span aria-hidden>/</span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <Icon name={categoryMeta.icon} className="h-3.5 w-3.5" aria-hidden />
            {categoryMeta.label}
          </span>
          {course.status !== 'published' && (
            <span className="ml-1">
              <Badge>{course.status}</Badge>
            </span>
          )}
        </nav>

        <div className="lg:mr-[400px]">
          {tagline && <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-gold-400">{tagline}</p>}
          <h1 className={`${tagline ? 'mt-2' : 'mt-6'} text-3xl font-extrabold leading-tight sm:text-4xl`}>{course.title}</h1>
          {course.summary && <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">{course.summary}</p>}

          {highlights.length > 0 && (
            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {highlights.map((highlight, index) => (
                <div key={`${highlight.label}-${index}`} className="border-l-2 border-gold-500/60 pl-3">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{highlight.label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-white">{highlight.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {courseCode && <p className="mt-8 text-xs text-slate-400">Course code: <span className="font-semibold tracking-wide text-slate-300">{courseCode}</span></p>}
        </div>
      </div>
    </section>
  );
}
