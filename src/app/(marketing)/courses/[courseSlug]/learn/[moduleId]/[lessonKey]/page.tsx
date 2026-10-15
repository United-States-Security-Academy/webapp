import { StructuredLessonPageContent } from '@/features/structured-courses/structured-lesson-page-content';

export default async function StructuredLessonPage({
  params,
}: {
  params: Promise<{ courseSlug: string; moduleId: string; lessonKey: string }>;
}) {
  const { courseSlug, moduleId, lessonKey } = await params;

  return (
    <section className="bg-slate-50">
      <StructuredLessonPageContent courseSlug={courseSlug} moduleId={moduleId} lessonKey={lessonKey} basePath="/courses" />
    </section>
  );
}
