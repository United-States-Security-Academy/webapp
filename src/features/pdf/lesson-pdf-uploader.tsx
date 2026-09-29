'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/supabase/browser-client';
import { createLessonPdfUploadTarget } from './lesson-pdf-actions';
import { Spinner } from '@/components/ui/spinner';

type UploadStatus = 'idle' | 'requestingUploadUrl' | 'uploading' | 'success' | 'error';

export function LessonPdfUploader({ lessonId, hasExistingPdf }: { lessonId: string; hasExistingPdf: boolean }) {
  const router = useRouter();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileChange(changeEvent: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = changeEvent.target.files?.[0];
    if (!selectedFile) return;

    setErrorMessage(null);
    setUploadStatus('requestingUploadUrl');

    try {
      const targetResult = await createLessonPdfUploadTarget(lessonId);
      if (!targetResult.success) throw new Error(targetResult.error);
      const { path, token } = targetResult.data;

      setUploadStatus('uploading');
      const supabaseBrowserClient = getSupabaseBrowserClient();
      const { error } = await supabaseBrowserClient.storage
        .from('lesson-pdfs')
        .uploadToSignedUrl(path, token, selectedFile, { upsert: true });
      if (error) throw new Error(error.message);

      setUploadStatus('success');
      router.refresh();
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed.');
    }
  }

  const isBusy = uploadStatus === 'requestingUploadUrl' || uploadStatus === 'uploading';

  return (
    <div className="flex flex-col gap-2">
      <label
        className={`inline-flex w-fit items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 ${isBusy ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
      >
        {isBusy && <Spinner className="h-4 w-4" />}
        {hasExistingPdf ? 'Replace PDF' : 'Upload PDF'}
        <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} disabled={isBusy} />
      </label>
      {uploadStatus === 'requestingUploadUrl' && <p className="text-xs text-slate-500">Preparing upload...</p>}
      {uploadStatus === 'uploading' && <p className="text-xs text-slate-500">Uploading PDF...</p>}
      {uploadStatus === 'success' && <p className="text-xs text-green-600">Upload complete.</p>}
      {uploadStatus === 'error' && <p className="text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
