import { PageBanner } from '@/components/layout/page-banner';
import { getCourseBySlug } from '@/features/courses/course-queries';
import { CourseDetailContent } from '@/features/courses/course-detail-content';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ courseSlug: string }> }): Promise<Metadata> {
  const { courseSlug } = await params;
  const courseRecord = await getCourseBySlug(courseSlug);
  if (!courseRecord) return { title: 'Course not found' };
  const description = courseRecord.summary ?? `${courseRecord.title} — online training from the United States Security Academy.`;
  return {
    title: courseRecord.title,
    description,
    alternates: { canonical: `/courses/${courseRecord.slug}` },
    openGraph: {
      title: courseRecord.title,
      description,
      ...(courseRecord.thumbnailUrl && { images: [{ url: courseRecord.thumbnailUrl, alt: courseRecord.title }] }),
    },
  };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const courseRecord = await getCourseBySlug(courseSlug);
  if (!courseRecord) notFound();

  return (
    <>
      <PageBanner title={courseRecord.title} subtitle={courseRecord.summary ?? ''} />
      <section className="bg-slate-50 py-12">
        <CourseDetailContent courseSlug={courseSlug} basePath="/courses" />
      </section>
    </>
  );
}
