import { CourseDetailContent } from '@/features/courses/course-detail-content';

export default async function DashboardCourseDetailPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;

  return (
    <main>
      <CourseDetailContent courseSlug={courseSlug} basePath="/dashboard/courses" />
    </main>
  );
}
