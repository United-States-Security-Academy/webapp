'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/supabase/browser-client';
import { Spinner } from '@/components/ui/spinner';
import { compressImage } from '@/features/uploads/compress-image';
import { createCourseThumbnailUploadTarget } from './course-thumbnail-actions';

// Course cards show thumbnails at up to ~640px wide; 1280x720 keeps them sharp on high-density screens.
const THUMBNAIL_LIMITS = { maxWidth: 1280, maxHeight: 720, targetBytes: 200 * 1024 };

type UploadStatus = 'idle' | 'requestingUploadUrl' | 'uploading' | 'success' | 'error';

export function CourseThumbnailUploader({ courseId, hasExistingThumbnail }: { courseId: string; hasExistingThumbnail: boolean }) {
  const router = useRouter();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileChange(changeEvent: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = changeEvent.target.files?.[0];
    if (!selectedFile) return;

    setErrorMessage(null);
    setUploadStatus('requestingUploadUrl');

    try {
      const targetResult = await createCourseThumbnailUploadTarget(courseId);
      if (!targetResult.success) throw new Error(targetResult.error);
      const { path, token } = targetResult.data;

      setUploadStatus('uploading');
      const compressedImage = await compressImage(selectedFile, THUMBNAIL_LIMITS);
      const supabaseBrowserClient = getSupabaseBrowserClient();
      const { error } = await supabaseBrowserClient.storage
        .from('course-thumbnails')
        .uploadToSignedUrl(path, token, compressedImage, { upsert: true, contentType: compressedImage.type });
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
        {hasExistingThumbnail ? 'Replace thumbnail' : 'Upload thumbnail'}
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isBusy} />
      </label>
      {uploadStatus === 'requestingUploadUrl' && <p className="text-xs text-slate-500">Preparing upload...</p>}
      {uploadStatus === 'uploading' && <p className="text-xs text-slate-500">Uploading image...</p>}
      {uploadStatus === 'success' && <p className="text-xs text-green-600">Upload complete.</p>}
      {uploadStatus === 'error' && <p className="text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
