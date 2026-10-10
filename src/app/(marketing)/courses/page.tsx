import Link from 'next/link';
import { PageBanner } from '@/components/layout/page-banner';
import { listPublishedCourses } from '@/features/courses/course-queries';
import { CourseCard } from '@/features/courses/course-card';
import { COURSE_CATEGORIES, COURSE_CATEGORY_META } from '@/features/courses/course-category';
import { Icon } from '@/components/ui/icon';
import type { CourseCategory } from '@/features/courses/course-types';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Courses & Programs',
  description: 'Browse USSA online training courses and programs.',
};

function buildCoursesHref(searchQuery?: string, category?: CourseCategory): string {
  const params = new URLSearchParams();
  if (searchQuery) params.set('q', searchQuery);
  if (category) params.set('category', category);
  const queryString = params.toString();
  return queryString ? `/courses?${queryString}` : '/courses';
}

function isCourseCategory(value: string | undefined): value is CourseCategory {
  return !!value && (COURSE_CATEGORIES as string[]).includes(value);
}

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q: searchQuery, category: categoryParam } = await searchParams;
  const activeCategory = isCourseCategory(categoryParam) ? categoryParam : undefined;
  const publishedCourses = await listPublishedCourses(searchQuery, activeCategory);

  return (
    <>
      <PageBanner
        title="Courses & Programs"
        subtitle="Browse published training programs across military, law enforcement, corrections, security, and safety."
      />

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildCoursesHref(searchQuery)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                !activeCategory
                  ? 'border-navy-900 bg-navy-900 text-white'
                  : 'border-slate-300 text-slate-600 hover:border-navy-800 hover:text-navy-900'
              }`}
            >
              All Programs
            </Link>
            {COURSE_CATEGORIES.map((categoryOption) => {
              const categoryMeta = COURSE_CATEGORY_META[categoryOption];
              const isActive = activeCategory === categoryOption;
              return (
                <Link
                  key={categoryOption}
                  href={buildCoursesHref(searchQuery, categoryOption)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                    isActive
                      ? 'border-navy-900 bg-navy-900 text-white'
                      : 'border-slate-300 text-slate-600 hover:border-navy-800 hover:text-navy-900'
                  }`}
                >
                  <Icon name={categoryMeta.icon} className="h-3.5 w-3.5" />
                  {categoryMeta.label}
                </Link>
              );
            })}
          </div>

          {searchQuery && (
            <p className="mt-6 text-sm text-slate-500">
              {publishedCourses.length} result{publishedCourses.length === 1 ? '' : 's'} for &ldquo;{searchQuery}&rdquo;
            </p>
          )}

          {publishedCourses.length === 0 ? (
            <p className="mt-10 text-center text-sm text-slate-500">
              {searchQuery || activeCategory ? 'No courses match your filters.' : 'No courses are published yet — check back soon.'}
            </p>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {publishedCourses.map((course) => (
                <Link key={course.id} href={`/courses/${course.slug}`} className="block transition hover:-translate-y-0.5">
                  <CourseCard course={course} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
