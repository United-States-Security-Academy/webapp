import type { MetadataRoute } from 'next';
import { env } from '@/env';
import { listPublishedCourses } from '@/features/courses/course-queries';
import { COURSE_CATEGORIES, COURSE_CATEGORY_META } from '@/features/courses/course-category';

// Rebuilt at most hourly, so newly published courses show up without a redeploy.
export const revalidate = 3600;

const STATIC_PATHS = ['', '/about', '/courses', '/certifications', '/training-modes', '/resources', '/contact', '/privacy', '/terms'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publishedCourses = await listPublishedCourses();

  return [
    ...STATIC_PATHS.map((path) => ({ url: `${env.NEXT_PUBLIC_APP_URL}${path}` })),
    ...COURSE_CATEGORIES.map((category) => ({ url: `${env.NEXT_PUBLIC_APP_URL}/programs/${COURSE_CATEGORY_META[category].urlSlug}` })),
    ...publishedCourses.map((course) => ({ url: `${env.NEXT_PUBLIC_APP_URL}/courses/${course.slug}`, lastModified: course.createdAt })),
  ];
}
