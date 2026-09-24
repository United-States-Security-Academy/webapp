import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageBanner } from '@/components/layout/page-banner';
import { listPublishedCourses } from '@/features/courses/course-queries';
import { CourseCard } from '@/features/courses/course-card';
import { COURSE_CATEGORIES, COURSE_CATEGORY_META, getCourseCategoryByUrlSlug } from '@/features/courses/course-category';

export function generateStaticParams() {
  return COURSE_CATEGORIES.map((category) => ({ categorySlug: COURSE_CATEGORY_META[category].urlSlug }));
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ categorySlug: string }> }) {
  const { categorySlug } = await params;
  const category = getCourseCategoryByUrlSlug(categorySlug);
  if (!category) notFound();

  const categoryMeta = COURSE_CATEGORY_META[category];
  const coursesInProgram = await listPublishedCourses(undefined, category);

  return (
    <>
      <PageBanner title={categoryMeta.programTitle} subtitle={categoryMeta.tagline} />

      <section className="bg-white py-12">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-sm leading-relaxed text-slate-700">{categoryMeta.overview}</p>
        </div>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-xl font-extrabold tracking-wide text-navy-900">
            {categoryMeta.programTitle.toUpperCase()} COURSES
          </h2>

          {coursesInProgram.length === 0 ? (
            <p className="mt-8 text-center text-sm text-slate-500">
              No courses are published in this program yet — check back soon, or{' '}
              <Link href="/courses" className="font-bold text-navy-800 hover:text-gold-600">
                browse the full catalog
              </Link>
              .
            </p>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {coursesInProgram.map((course) => (
                <Link key={course.id} href={`/courses/${course.slug}`} className="block transition hover:-translate-y-0.5">
                  <CourseCard course={course} />
                </Link>
              ))}
            </div>
          )}

          <div className="mt-10 text-center">
            <Link
              href={`/courses?category=${category}`}
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-navy-800 hover:text-gold-600"
            >
              View all training programs &rarr;
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
