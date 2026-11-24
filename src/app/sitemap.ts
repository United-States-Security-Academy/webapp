import type { MetadataRoute } from 'next';
import { listPublishedCourses } from '@/features/courses/course-queries';
import { COURSE_CATEGORIES, COURSE_CATEGORY_META } from '@/features/courses/course-category';
import type { Course } from '@/features/courses/course-types';
import { absoluteUrl } from '@/features/seo/site-seo';

// Rebuilt at most hourly, so newly published courses show up without a redeploy.
export const revalidate = 3600;

// Static pages have no reliable edit date, so they carry no lastModified (search engines ignore
// one that just changes on every build).
const STATIC_PATHS = ['/', '/about', '/courses', '/certifications', '/training-modes', '/veterans', '/resources', '/contact', '/privacy', '/terms'];

// Courses have no updated-at column; the publish date is the best signal of when one went live.
function courseDate(course: Course): Date {
  return course.publishedAt ?? course.createdAt;
}

function newestDate(courseList: Course[]): Date | undefined {
  if (courseList.length === 0) return undefined;
  return new Date(Math.max(...courseList.map((course) => courseDate(course).getTime())));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publishedCourses = await listPublishedCourses();

  return [
    ...STATIC_PATHS.map((path) => ({
      url: absoluteUrl(path),
      // The catalog changes whenever a course is published.
      ...(path === '/courses' && { lastModified: newestDate(publishedCourses) }),
    })),
    ...COURSE_CATEGORIES.map((category) => ({
      url: absoluteUrl(`/programs/${COURSE_CATEGORY_META[category].urlSlug}`),
      lastModified: newestDate(publishedCourses.filter((course) => course.category === category)),
    })),
    ...publishedCourses.map((course) => ({ url: absoluteUrl(`/courses/${course.slug}`), lastModified: courseDate(course) })),
  ];
}
