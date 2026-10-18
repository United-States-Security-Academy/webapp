import { getCourseBySlug } from '@/features/courses/course-queries';
import { CourseDetailContent } from '@/features/courses/course-detail-content';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { env } from '@/env';

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

  // schema.org Course data, so search results can show the course with its provider and price.
  const structuredData = courseRecord.status === 'published' && {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: courseRecord.title,
    description: courseRecord.summary ?? courseRecord.title,
    url: `${env.NEXT_PUBLIC_APP_URL}/courses/${courseRecord.slug}`,
    ...(courseRecord.detailContent?.courseCode && { courseCode: courseRecord.detailContent.courseCode }),
    provider: { '@type': 'Organization', name: 'United States Security Academy', sameAs: env.NEXT_PUBLIC_APP_URL },
    offers: {
      '@type': 'Offer',
      category: courseRecord.priceAmountMinor === 0 ? 'Free' : 'Paid',
      price: (courseRecord.priceAmountMinor / 100).toFixed(2),
      priceCurrency: courseRecord.currency,
    },
  };

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          // JSON.stringify output with "<" escaped, so course text can't close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
        />
      )}
      <div className="bg-slate-50">
        <CourseDetailContent courseSlug={courseSlug} basePath="/courses" />
      </div>
    </>
  );
}
