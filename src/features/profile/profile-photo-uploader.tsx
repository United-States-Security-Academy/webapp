'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/supabase/browser-client';
import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@/components/ui/icon';
import { createProfilePhotoUploadTarget } from './profile-actions';

type UploadStatus = 'idle' | 'requestingUploadUrl' | 'uploading' | 'success' | 'error';

export function ProfilePhotoUploader({ photoUrl, displayName }: { photoUrl: string | null; displayName: string }) {
  const router = useRouter();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function handleFileChange(changeEvent: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = changeEvent.target.files?.[0];
    if (!selectedFile) return;

    setErrorMessage(null);
    setUploadStatus('requestingUploadUrl');

    try {
      const { path, token } = await createProfilePhotoUploadTarget();

      setUploadStatus('uploading');
      const supabaseBrowserClient = getSupabaseBrowserClient();
      const { error } = await supabaseBrowserClient.storage
        .from('profile-photos')
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
    <div className="flex items-center gap-4">
      <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-900 text-xl font-bold text-gold-400">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials || <Icon name="users" className="h-8 w-8" />
        )}
      </span>

      <div className="flex flex-col gap-1">
        <label
          className={`inline-flex w-fit items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 ${isBusy ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
        >
          {isBusy && <Spinner className="h-4 w-4" />}
          {photoUrl ? 'Replace photo' : 'Upload photo'}
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isBusy} />
        </label>
        {uploadStatus === 'error' && <p className="text-xs text-red-600">{errorMessage}</p>}
      </div>
    </div>
  );
}
