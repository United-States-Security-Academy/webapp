'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLessonDirectUpload } from '@/features/cloudflare-stream/create-direct-upload';
import { Spinner } from '@/components/ui/spinner';

type UploadStatus = 'idle' | 'requestingUploadUrl' | 'uploading' | 'success' | 'error';

export function LessonVideoUploader({ lessonId, hasExistingVideo }: { lessonId: string; hasExistingVideo: boolean }) {
  const router = useRouter();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileChange(changeEvent: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = changeEvent.target.files?.[0];
    if (!selectedFile) return;

    setErrorMessage(null);
    setUploadStatus('requestingUploadUrl');

    try {
      const uploadTargetResult = await createLessonDirectUpload(lessonId);
      if (!uploadTargetResult.success) throw new Error(uploadTargetResult.error);
      const { cloudflareStreamUploadUrl } = uploadTargetResult.data;

      setUploadStatus('uploading');
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch(cloudflareStreamUploadUrl, { method: 'POST', body: formData });
      if (!uploadResponse.ok) throw new Error('Upload to Cloudflare Stream failed.');

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
        {hasExistingVideo ? 'Replace video' : 'Upload video'}
        <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} disabled={isBusy} />
      </label>
      {uploadStatus === 'requestingUploadUrl' && <p className="text-xs text-slate-500">Preparing upload...</p>}
      {uploadStatus === 'uploading' && <p className="text-xs text-slate-500">Uploading to Cloudflare Stream...</p>}
      {uploadStatus === 'success' && <p className="text-xs text-green-600">Upload complete. Processing will finish shortly.</p>}
      {uploadStatus === 'error' && <p className="text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
