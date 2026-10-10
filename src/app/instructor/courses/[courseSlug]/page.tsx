import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getCourseBySlug } from '@/features/courses/course-queries';
import { getCourseContentTree } from '@/features/courses/course-content-queries';
import { AddModuleForm } from '@/features/modules/add-module-form';
import { EditModuleTitleForm } from '@/features/modules/edit-module-title-form';
import { DeleteModuleButton } from '@/features/modules/delete-module-button';
import { ModuleOrderControls } from '@/features/modules/module-order-controls';
import { AddLessonForm } from '@/features/lessons/add-lesson-form';
import { EditCourseForm } from '@/features/courses/edit-course-form';
import { PublishToggleButton } from '@/features/courses/publish-toggle-button';
import { DeleteCourseButton } from '@/features/courses/delete-course-button';
import { CourseThumbnailUploader } from '@/features/courses/course-thumbnail-uploader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default async function InstructorCourseDetailPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');

  const course = await getCourseBySlug(courseSlug);
  if (!course) notFound();
  if (authenticatedUser.role !== 'admin' && course.ownerId !== authenticatedUser.userId) notFound();

  const modulesWithLessons = await getCourseContentTree(course.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{course.title}</h1>
            <Badge>{course.status}</Badge>
          </div>
          {course.summary && <p className="mt-1 text-sm text-slate-600">{course.summary}</p>}
        </div>
        <Link href={`/courses/${course.slug}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <Button variant="outline">View course</Button>
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <EditCourseForm course={course} />
        <PublishToggleButton courseId={course.id} isPublished={course.status === 'published'} />
        <Link href={`/instructor/courses/${course.slug}/assessment`}>
          <Button variant="outline">Manage assessment</Button>
        </Link>
        <DeleteCourseButton courseId={course.id} courseTitle={course.title} />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Thumbnail</h2>
        <div className="mt-3">
          <Card>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="h-20 w-32 shrink-0 overflow-hidden rounded-md bg-navy-900">
                {course.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
                  <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <CourseThumbnailUploader courseId={course.id} hasExistingThumbnail={!!course.thumbnailUrl} />
            </div>
          </Card>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Modules</h2>
        <div className="mt-4 flex flex-col gap-4">
          {modulesWithLessons.map(({ moduleRecord, moduleLessons }, moduleIndex) => (
            <Card key={moduleRecord.id}>
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Module {moduleIndex + 1} of {modulesWithLessons.length}
                </span>
                <ModuleOrderControls
                  moduleId={moduleRecord.id}
                  moduleTitle={moduleRecord.title}
                  position={moduleIndex + 1}
                  moduleCount={modulesWithLessons.length}
                />
              </div>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <EditModuleTitleForm key={moduleRecord.title} moduleId={moduleRecord.id} currentTitle={moduleRecord.title} />
                </div>
                <DeleteModuleButton moduleId={moduleRecord.id} moduleTitle={moduleRecord.title} />
              </div>
              <ul className="mt-2 flex flex-col gap-1">
                {moduleLessons.map((lessonRecord) => (
                  <li key={lessonRecord.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <Link
                      href={`/instructor/courses/${course.slug}/modules/${moduleRecord.id}/lessons/${lessonRecord.id}`}
                      className="hover:text-navy-800 hover:underline"
                    >
                      {lessonRecord.title}
                    </Link>
                    {lessonRecord.isPreview && <Badge>preview</Badge>}
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <AddLessonForm moduleId={moduleRecord.id} />
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-4">
          <AddModuleForm courseId={course.id} />
        </div>
      </section>
    </main>
  );
}
