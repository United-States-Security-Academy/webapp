import { getSupabaseAdminClient } from '@/supabase/admin-client';

// Both buckets are private (see migration 0015): only the service role touches them, and
// students only ever get short-lived signed URLs for images in published lessons.
const SOURCE_BUCKET = 'structured-course-sources';
const LESSON_IMAGE_BUCKET = 'structured-lesson-images';
const LESSON_IMAGE_VIEW_URL_TTL_SECONDS = 60 * 10;

export function buildModuleSourceStoragePath(moduleId: string, revisionId: string): string {
  return `${moduleId}/${revisionId}/source.docx`;
}

export function buildLessonImageStoragePath(moduleId: string, revisionId: string, fileName: string): string {
  return `${moduleId}/${revisionId}/${fileName}`;
}

export async function createModuleSourceUploadUrl(storagePath: string) {
  const supabaseAdminClient = getSupabaseAdminClient();
  const { data, error } = await supabaseAdminClient.storage.from(SOURCE_BUCKET).createSignedUploadUrl(storagePath);
  if (error) throw new Error(`Failed to create module source upload URL: ${error.message}`);
  return { signedUrl: data.signedUrl, token: data.token, path: data.path };
}

export async function downloadModuleSource(storagePath: string): Promise<ArrayBuffer> {
  const supabaseAdminClient = getSupabaseAdminClient();
  const { data, error } = await supabaseAdminClient.storage.from(SOURCE_BUCKET).download(storagePath);
  if (error) throw new Error(`Failed to download module source: ${error.message}`);
  return data.arrayBuffer();
}

export async function uploadLessonImage(storagePath: string, bytes: ArrayBuffer | Uint8Array, contentType: string) {
  const supabaseAdminClient = getSupabaseAdminClient();
  const { error } = await supabaseAdminClient.storage
    .from(LESSON_IMAGE_BUCKET)
    .upload(storagePath, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Failed to upload lesson image: ${error.message}`);
}

export async function createLessonImageViewUrls(storagePaths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (storagePaths.length === 0) return urls;
  const supabaseAdminClient = getSupabaseAdminClient();
  const { data, error } = await supabaseAdminClient.storage
    .from(LESSON_IMAGE_BUCKET)
    .createSignedUrls(storagePaths, LESSON_IMAGE_VIEW_URL_TTL_SECONDS);
  if (error) throw new Error(`Failed to create lesson image URLs: ${error.message}`);
  for (const item of data) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

// Removes every stored file of the given revisions (their source .docx and extracted images), in
// both buckets. Used when an unpublished module is deleted.
export async function removeModuleRevisionFiles(moduleId: string, revisionIds: string[]) {
  const supabaseAdminClient = getSupabaseAdminClient();
  for (const bucket of [SOURCE_BUCKET, LESSON_IMAGE_BUCKET]) {
    for (const revisionId of revisionIds) {
      const folder = `${moduleId}/${revisionId}`;
      const { data, error } = await supabaseAdminClient.storage.from(bucket).list(folder);
      if (error) throw new Error(`Failed to list module files: ${error.message}`);
      if (data.length === 0) continue;
      const { error: removeError } = await supabaseAdminClient.storage
        .from(bucket)
        .remove(data.map((file) => `${folder}/${file.name}`));
      if (removeError) throw new Error(`Failed to remove module files: ${removeError.message}`);
    }
  }
}
