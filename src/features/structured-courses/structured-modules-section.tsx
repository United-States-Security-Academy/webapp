import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModuleOrderControls } from '@/features/modules/module-order-controls';
import type { CourseDeliveryFormat, StructuredRevisionStatus } from '@/db/schema';
import { countEnrolledStudentsWithPdfProgress, listStructuredModulesForCourse, type StructuredModuleSummary } from './structured-module-queries';
import { moveStructuredModule } from './structured-module-actions';
import { StructuredModuleUploader } from './structured-module-uploader';
import { DeleteStructuredModuleButton } from './delete-structured-module-button';
import { ProcessingStatusRefresher } from './processing-status-refresher';
import { DeliveryFormatSetting } from './delivery-format-setting';

const STATUS_STYLES: Record<StructuredRevisionStatus, { label: string; className: string }> = {
  processing: { label: 'Processing', className: 'bg-amber-100 text-amber-800' },
  ready: { label: 'Ready', className: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800' },
};

function StatusBadge({ status }: { status: StructuredRevisionStatus }) {
  const { label, className } = STATUS_STYLES[status];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}

function MessageList({ title, messages, tone }: { title: string; messages: string[]; tone: 'error' | 'warning' }) {
  if (messages.length === 0) return null;
  const className = tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900';
  return (
    <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${className}`}>
      <p className="font-medium">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {messages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

function StructuredModuleCard({
  courseId,
  courseSlug,
  structuredModule,
  position,
  moduleCount,
}: {
  courseId: string;
  courseSlug: string;
  structuredModule: StructuredModuleSummary;
  position: number;
  moduleCount: number;
}) {
  const { latestUpload, draft } = structuredModule;
  const latestIsDraft = !!latestUpload && latestUpload.revisionId === draft?.revisionId;
  const publishLabel = !structuredModule.isPublished
    ? 'draft'
    : draft && draft.revisionId !== structuredModule.publishedRevisionId
      ? 'published · newer draft'
      : 'published';

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Module {position} of {moduleCount}
        </span>
        <ModuleOrderControls
          moduleId={structuredModule.id}
          moduleTitle={structuredModule.title}
          position={position}
          moduleCount={moduleCount}
          moveAction={moveStructuredModule}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900">{structuredModule.title}</h3>
            {latestUpload && <StatusBadge status={latestUpload.status} />}
            <Badge>{publishLabel}</Badge>
          </div>
          {latestUpload && (
            <p className="mt-1 break-all text-xs text-slate-500">
              {latestUpload.fileName} · uploaded {latestUpload.uploadedAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-start gap-2">
          {draft && (
            <Link href={`/instructor/courses/${courseSlug}/structured-modules/${structuredModule.id}`}>
              <Button>Preview &amp; publish</Button>
            </Link>
          )}
          <StructuredModuleUploader courseId={courseId} moduleId={structuredModule.id} variant="outline" />
          {!structuredModule.isPublished && (
            <DeleteStructuredModuleButton moduleId={structuredModule.id} moduleTitle={structuredModule.title} />
          )}
        </div>
      </div>

      {latestUpload?.status === 'processing' && <p className="mt-3 text-sm text-slate-600">Converting the file into lessons...</p>}

      {latestUpload?.status === 'failed' && (
        <>
          <MessageList title="This file couldn't be used. Fix these in Word, then upload it again:" messages={latestUpload.errors} tone="error" />
          {draft && <p className="mt-2 text-xs text-slate-500">The previous upload ({draft.fileName}) is still kept as the draft below.</p>}
        </>
      )}

      {draft && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Draft lessons{!latestIsDraft && ` (from ${draft.fileName})`}
          </p>
          <ol className="mt-1 flex list-decimal flex-col gap-1 pl-5 text-sm text-slate-700">
            {draft.lessons.map((lesson) => (
              <li key={lesson.key}>
                {lesson.title}
                <span className="text-xs text-slate-400">
                  {' '}
                  · {lesson.blockCount} {lesson.blockCount === 1 ? 'block' : 'blocks'}
                  {lesson.quizQuestionCount > 0 &&
                    ` · ${lesson.quizQuestionCount} quiz ${lesson.quizQuestionCount === 1 ? 'question' : 'questions'}`}
                </span>
              </li>
            ))}
          </ol>
          <MessageList title="Things to check:" messages={draft.warnings} tone="warning" />
        </div>
      )}
    </Card>
  );
}

// Structured (Word-uploaded) modules for a course. Everything here is draft: students keep using
// the course's current lessons until a module is published and the course is switched over.
export async function StructuredModulesSection({
  courseId,
  courseSlug,
  deliveryFormat,
}: {
  courseId: string;
  courseSlug: string;
  deliveryFormat: CourseDeliveryFormat;
}) {
  const structuredModules = await listStructuredModulesForCourse(courseId);
  // Only needed for the warning shown when switching away from PDF lessons.
  const studentsWithPdfProgress = deliveryFormat === 'pdf' ? await countEnrolledStudentsWithPdfProgress(courseId) : 0;
  const isAnyProcessing = structuredModules.some((structuredModule) => structuredModule.latestUpload?.status === 'processing');

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-900">Structured modules (Word upload)</h2>
      <p className="mt-1 text-sm text-slate-600">
        Upload one Word document (.docx) per module. Uploads are saved as drafts and are not visible to students.
      </p>
      {isAnyProcessing && <ProcessingStatusRefresher />}
      <div className="mt-4 flex flex-col gap-4">
        {structuredModules.map((structuredModule, moduleIndex) => (
          <StructuredModuleCard
            key={structuredModule.id}
            courseId={courseId}
            courseSlug={courseSlug}
            structuredModule={structuredModule}
            position={moduleIndex + 1}
            moduleCount={structuredModules.length}
          />
        ))}
      </div>
      <div className="mt-4">
        <StructuredModuleUploader courseId={courseId} />
      </div>

      <DeliveryFormatSetting
        courseId={courseId}
        deliveryFormat={deliveryFormat}
        structuredModuleCount={structuredModules.length}
        unpublishedModuleTitles={structuredModules.filter((structuredModule) => !structuredModule.isPublished).map((structuredModule) => structuredModule.title)}
        studentsWithPdfProgress={studentsWithPdfProgress}
      />
    </section>
  );
}
