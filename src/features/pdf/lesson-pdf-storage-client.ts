import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { getSupabaseAdminClient } from '@/supabase/admin-client';

const LESSON_PDF_BUCKET = 'lesson-pdfs';
const PDF_VIEW_URL_TTL_SECONDS = 60 * 10;

export function buildLessonPdfStoragePath(lessonId: string): string {
  return `${lessonId}/document.pdf`;
}

export async function createLessonPdfUploadUrl(storagePath: string) {
  const supabaseAdminClient = getSupabaseAdminClient();
  const { data, error } = await supabaseAdminClient.storage
    .from(LESSON_PDF_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: true });
  if (error) throw new Error(`Failed to create PDF upload URL: ${error.message}`);
  return { signedUrl: data.signedUrl, token: data.token, path: data.path };
}

// Identifies the exact file currently stored for a lesson. A re-uploaded PDF keeps the same path
// but gets a new eTag, which tells browsers holding a cached copy (see lesson-pdf-bytes.ts) to
// download the new one.
export async function getLessonPdfVersion(storagePath: string): Promise<string> {
  const rows = await db.execute<{ version: string | null }>(sql`
    select coalesce(metadata->>'eTag', updated_at::text) as version
    from storage.objects
    where bucket_id = ${LESSON_PDF_BUCKET} and name = ${storagePath}
  `);
  return rows[0]?.version ?? 'unknown';
}

export async function createLessonPdfViewUrl(storagePath: string): Promise<string> {
  const supabaseAdminClient = getSupabaseAdminClient();
  const { data, error } = await supabaseAdminClient.storage
    .from(LESSON_PDF_BUCKET)
    .createSignedUrl(storagePath, PDF_VIEW_URL_TTL_SECONDS);
  if (error) throw new Error(`Failed to create PDF view URL: ${error.message}`);
  return data.signedUrl;
}
