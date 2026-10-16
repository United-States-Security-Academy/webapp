import { StructuredLessonPageContent } from '@/features/structured-courses/structured-lesson-page-content';

export default async function DashboardStructuredLessonPage({
  params,
}: {
  params: Promise<{ courseSlug: string; moduleId: string; lessonKey: string }>;
}) {
  const { courseSlug, moduleId, lessonKey } = await params;

  return (
    <main>
      <StructuredLessonPageContent courseSlug={courseSlug} moduleId={moduleId} lessonKey={lessonKey} basePath="/dashboard/courses" />
    </main>
  );
}
