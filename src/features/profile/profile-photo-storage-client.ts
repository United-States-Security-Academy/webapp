import { getSupabaseAdminClient } from '@/supabase/admin-client';

const PROFILE_PHOTO_BUCKET = 'profile-photos';

export function buildProfilePhotoStoragePath(userId: string): string {
  return `${userId}/photo`;
}

export async function createProfilePhotoUploadUrl(storagePath: string) {
  const supabaseAdminClient = getSupabaseAdminClient();
  const { data, error } = await supabaseAdminClient.storage
    .from(PROFILE_PHOTO_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: true });
  if (error) throw new Error(`Failed to create profile photo upload URL: ${error.message}`);
  return { signedUrl: data.signedUrl, token: data.token, path: data.path };
}

export function getProfilePhotoPublicUrl(storagePath: string): string {
  const supabaseAdminClient = getSupabaseAdminClient();
  const { data } = supabaseAdminClient.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}
