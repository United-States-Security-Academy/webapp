'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CourseDeliveryFormat } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { setCourseDeliveryFormat } from './structured-module-actions';

// The course's lesson format: PDF lessons (the original) or structured lessons from Word uploads.
// The server re-checks every rule; the checks here only explain why the button is unavailable.
export function DeliveryFormatSetting({
  courseId,
  deliveryFormat,
  structuredModuleCount,
  unpublishedModuleTitles,
  studentsWithPdfProgress,
}: {
  courseId: string;
  deliveryFormat: CourseDeliveryFormat;
  structuredModuleCount: number;
  unpublishedModuleTitles: string[];
  studentsWithPdfProgress: number;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isStructured = deliveryFormat === 'structured';
  const targetFormat: CourseDeliveryFormat = isStructured ? 'pdf' : 'structured';
  const blockedReason = isStructured
    ? null
    : structuredModuleCount === 0 || unpublishedModuleTitles.length === structuredModuleCount
      ? 'Publish at least one structured module first.'
      : unpublishedModuleTitles.length > 0
        ? `Every structured module must be published first. Not published yet: ${unpublishedModuleTitles.map((title) => `'${title}'`).join(', ')}.`
        : null;

  function openDialog() {
    setErrorMessage(null);
    dialogRef.current?.showModal();
  }

  async function handleConfirm() {
    setIsSaving(true);
    setErrorMessage(null);
    const result = await setCourseDeliveryFormat(courseId, targetFormat);
    setIsSaving(false);
    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }
    dialogRef.current?.close();
    router.refresh();
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-900">Lesson format</h2>
      <div className="mt-3">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Students currently get: {isStructured ? 'Structured lessons (from Word uploads)' : 'PDF lessons'}
              </p>
              {blockedReason && <p className="mt-1 text-xs text-slate-500">{blockedReason}</p>}
            </div>
            <Button variant="outline" onClick={openDialog} disabled={!!blockedReason} className="shrink-0">
              {isStructured ? 'Switch back to PDF lessons' : 'Switch to structured lessons'}
            </Button>
          </div>
        </Card>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="delivery-format-dialog-title"
        className="w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-0 shadow-xl backdrop:bg-black/50"
      >
        <div className="p-5 sm:p-6">
          <h3 id="delivery-format-dialog-title" className="text-lg font-semibold text-slate-900">
            {isStructured ? 'Switch back to PDF lessons?' : 'Switch to structured lessons?'}
          </h3>
          <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-slate-700">
            {isStructured ? (
              <p>Students will see the PDF lessons again. Their progress in the structured lessons is kept.</p>
            ) : (
              <>
                <p>Students will see the published structured modules instead of the PDF lessons.</p>
                {studentsWithPdfProgress > 0 && (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                    <strong>
                      {studentsWithPdfProgress} enrolled {studentsWithPdfProgress === 1 ? 'student has' : 'students have'} progress in the
                      PDF lessons.
                    </strong>{' '}
                    That progress is kept, but it doesn&apos;t carry over: {studentsWithPdfProgress === 1 ? 'this student starts' : 'these students start'}{' '}
                    the structured lessons from the beginning.
                  </p>
                )}
              </>
            )}
            <p className="text-slate-500">Nothing is deleted. You can switch back at any time.</p>
          </div>
          {errorMessage && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => dialogRef.current?.close()} disabled={isSaving} autoFocus>
              Cancel
            </Button>
            <Button variant={isStructured ? 'default' : 'gold'} onClick={handleConfirm} isLoading={isSaving}>
              {isStructured ? 'Switch to PDF lessons' : 'Switch to structured lessons'}
            </Button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
