import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getCourseBySlug } from '@/features/courses/course-queries';
import { collectImageStoragePaths, getStructuredModulePreview } from '@/features/structured-courses/structured-module-queries';
import { createLessonImageViewUrls } from '@/features/structured-courses/structured-course-storage-client';
import { reviewModuleContent } from '@/features/structured-courses/review-module-content';
import { ModulePreview } from '@/features/structured-courses/module-preview';
import { PublishModuleButtons } from '@/features/structured-courses/publish-module-buttons';
import { Badge } from '@/components/ui/badge';

export default async function StructuredModulePreviewPage({
  params,
}: {
  params: Promise<{ courseSlug: string; moduleId: string }>;
}) {
  const { courseSlug, moduleId } = await params;
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');

  const course = await getCourseBySlug(courseSlug);
  if (!course) notFound();
  if (authenticatedUser.role !== 'admin' && course.ownerId !== authenticatedUser.userId) notFound();

  // Not a UUID: the database would reject the lookup with an error rather than find nothing.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(moduleId)) notFound();
  const preview = await getStructuredModulePreview(moduleId);
  if (!preview || preview.courseId !== course.id) notFound();

  const { draft, newerUpload } = preview;
  const imageUrls = draft ? Object.fromEntries(await createLessonImageViewUrls(collectImageStoragePaths(draft.content))) : {};
  // The parser's notes and the readability checks overlap (e.g. empty lessons), so duplicates go.
  const warnings = draft ? [...new Set([...draft.parseWarnings, ...reviewModuleContent(draft.content)])] : [];
  const isPublished = preview.publishedRevisionId !== null;
  const isDraftPublished = isPublished && draft?.revisionId === preview.publishedRevisionId;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href={`/instructor/courses/${course.slug}`} className="text-sm text-slate-500 hover:text-navy-800 hover:underline">
        ← {course.title}
      </Link>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{preview.title}</h1>
            <Badge>{isPublished ? (isDraftPublished ? 'published' : 'published · newer draft') : 'draft'}</Badge>
          </div>
          {draft && (
            <p className="mt-1 break-all text-xs text-slate-500">
              Previewing {draft.fileName}, uploaded {draft.uploadedAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              {isDraftPublished && ' (this is the published version)'}
            </p>
          )}
        </div>
        <PublishModuleButtons moduleId={preview.moduleId} draftRevisionId={draft?.revisionId ?? null} publishedRevisionId={preview.publishedRevisionId} />
      </div>

      {newerUpload && newerUpload.status === 'processing' && (
        <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          A newer file ({newerUpload.fileName}) is still processing. This preview shows the previous version.
        </p>
      )}
      {newerUpload && newerUpload.status === 'failed' && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          The newest file ({newerUpload.fileName}) couldn&apos;t be used; see the course page for the list of problems. This preview shows the previous version.
        </p>
      )}

      {warnings.length > 0 && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-medium">Things to check before publishing:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        {draft ? (
          <ModulePreview content={draft.content} imageUrls={imageUrls} />
        ) : (
          <p className="rounded-md border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
            There is nothing to preview yet. Upload a Word file for this module on the course page.
          </p>
        )}
      </div>
    </main>
  );
}
