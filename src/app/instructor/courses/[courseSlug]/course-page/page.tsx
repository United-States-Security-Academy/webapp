import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getCourseBySlug, listCourseOptions } from '@/features/courses/course-queries';
import { getCourseExamSummary } from '@/features/assessments/assessment-queries';
import { formatCoursePrice } from '@/features/courses/format-course-price';
import { CoursePageEditor } from '@/features/courses/course-page/course-page-editor';

export default async function InstructorCoursePageEditorPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');

  const course = await getCourseBySlug(courseSlug);
  if (!course) notFound();
  if (authenticatedUser.role !== 'admin' && course.ownerId !== authenticatedUser.userId) notFound();

  const [exam, courseOptions] = await Promise.all([getCourseExamSummary(course.id), listCourseOptions()]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href={`/instructor/courses/${course.slug}`} className="text-xs font-semibold text-slate-500 hover:text-navy-800">
        &larr; Back to {course.title}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Course page</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        The description students see on this course&apos;s page. Empty fields and sections are left off the page.
      </p>

      <div className="mt-8">
        <CoursePageEditor
          courseId={course.id}
          courseSlug={course.slug}
          initialContent={course.detailContent}
          priceLabel={formatCoursePrice(course.priceAmountMinor, course.currency)}
          exam={exam}
          courseOptions={courseOptions.map((option) => ({ slug: option.slug, title: option.title, isPublished: option.status === 'published' }))}
        />
      </div>
    </main>
  );
}
