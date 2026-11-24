import { getCourseBySlug } from '@/features/courses/course-queries';
import { CourseDetailContent } from '@/features/courses/course-detail-content';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/json-ld';
import { COURSE_CATEGORY_META } from '@/features/courses/course-category';
import type { Course } from '@/features/courses/course-types';
import { NO_INDEX_METADATA, buildPageMetadata, toMetaDescription } from '@/features/seo/site-seo';
import { buildBreadcrumbStructuredData, buildCourseStructuredData, buildFaqStructuredData } from '@/features/seo/structured-data';

function describeCourse(course: Course): string {
  if (course.summary) return toMetaDescription(course.summary);
  const programTitle = COURSE_CATEGORY_META[course.category].programTitle;
  return toMetaDescription(
    `${course.title}: a ${programTitle} course from United States Security Academy, with online lessons and a certificate when you complete it.`,
  );
}

export async function generateMetadata({ params }: { params: Promise<{ courseSlug: string }> }): Promise<Metadata> {
  const { courseSlug } = await params;
  const courseRecord = await getCourseBySlug(courseSlug);
  if (!courseRecord) return { title: 'Course not found' };
  const pageMetadata = buildPageMetadata({
    title: courseRecord.title,
    description: describeCourse(courseRecord),
    path: `/courses/${courseRecord.slug}`,
    ...(courseRecord.thumbnailUrl && { image: { url: courseRecord.thumbnailUrl, alt: courseRecord.title } }),
  });
  // Drafts are only visible to their owner and admins; keep previews out of search results.
  return courseRecord.status === 'published' ? pageMetadata : { ...pageMetadata, ...NO_INDEX_METADATA };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const courseRecord = await getCourseBySlug(courseSlug);
  if (!courseRecord) notFound();

  const isPublished = courseRecord.status === 'published';
  const categoryMeta = COURSE_CATEGORY_META[courseRecord.category];
  const faqs = courseRecord.detailContent?.faqs ?? [];

  return (
    <>
      {/* Course, breadcrumb and FAQ data for search results — built from the same record the page shows. */}
      {isPublished && (
        <>
          <JsonLd data={buildCourseStructuredData(courseRecord, describeCourse(courseRecord))} />
          <JsonLd
            data={buildBreadcrumbStructuredData([
              { name: 'Home', path: '/' },
              { name: categoryMeta.programTitle, path: `/programs/${categoryMeta.urlSlug}` },
              { name: courseRecord.title, path: `/courses/${courseRecord.slug}` },
            ])}
          />
          {faqs.length > 0 && <JsonLd data={buildFaqStructuredData(faqs)} />}
        </>
      )}
      <div className="bg-slate-50">
        <CourseDetailContent courseSlug={courseSlug} basePath="/courses" />
      </div>
    </>
  );
}
