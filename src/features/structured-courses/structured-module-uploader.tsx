'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/supabase/browser-client';
import { Spinner } from '@/components/ui/spinner';
import { createStructuredModuleUploadTarget, processStructuredModuleUpload } from './structured-module-actions';

const DOCX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

type UploadStatus = 'idle' | 'preparing' | 'uploading' | 'processing' | 'error';

// Uploads a .docx straight to the private source bucket, then asks the server to convert it.
// The outcome (ready, or failed with the list of problems) is stored on the module, so after a
// refresh the module list shows it; this component only reports progress and upload failures.
export function StructuredModuleUploader({
  courseId,
  moduleId,
  variant = 'primary',
}: {
  courseId: string;
  // Set to upload a new version of an existing module; left out to add a new module.
  moduleId?: string;
  variant?: 'primary' | 'outline';
}) {
  const router = useRouter();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileChange(changeEvent: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = changeEvent.target.files?.[0];
    // Lets the same file be picked again after fixing it in Word.
    changeEvent.target.value = '';
    if (!selectedFile) return;

    setErrorMessage(null);
    setUploadStatus('preparing');

    try {
      const targetResult = await createStructuredModuleUploadTarget({
        courseId,
        moduleId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
      });
      if (!targetResult.success) throw new Error(targetResult.error);
      const { revisionId, path, token } = targetResult.data;

      setUploadStatus('uploading');
      const supabaseBrowserClient = getSupabaseBrowserClient();
      // The content type is set explicitly: some browsers send .docx files with no type at all.
      const { error } = await supabaseBrowserClient.storage
        .from('structured-course-sources')
        .uploadToSignedUrl(path, token, selectedFile, { contentType: DOCX_CONTENT_TYPE });
      if (error) throw new Error(`The file could not be uploaded: ${error.message}`);

      setUploadStatus('processing');
      router.refresh();
      const processResult = await processStructuredModuleUpload(revisionId);
      if (!processResult.success) throw new Error(processResult.error);

      setUploadStatus('idle');
      router.refresh();
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed.');
      router.refresh();
    }
  }

  const isBusy = uploadStatus === 'preparing' || uploadStatus === 'uploading' || uploadStatus === 'processing';
  const label = moduleId ? 'Upload new version' : 'Upload module';
  const variantClassName =
    variant === 'primary'
      ? 'bg-slate-900 text-white hover:bg-slate-700'
      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50';

  return (
    <div className="flex flex-col gap-2">
      <label
        className={`inline-flex w-fit items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${variantClassName} ${isBusy ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
      >
        {isBusy && <Spinner className="h-4 w-4" />}
        {label}
        <input
          type="file"
          accept={`.docx,${DOCX_CONTENT_TYPE}`}
          className="hidden"
          onChange={handleFileChange}
          disabled={isBusy}
        />
      </label>
      {uploadStatus === 'preparing' && <p className="text-xs text-slate-500">Preparing upload...</p>}
      {uploadStatus === 'uploading' && <p className="text-xs text-slate-500">Uploading file...</p>}
      {uploadStatus === 'processing' && <p className="text-xs text-slate-500">Processing file. This can take a minute for large files...</p>}
      {uploadStatus === 'error' && <p className="text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
