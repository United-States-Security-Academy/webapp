import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { lessonAudioTranscripts, TRANSCRIPT_FORMAT_VERSION } from '@/db/schema';

export async function getLessonAudioTranscript(lessonId: string): Promise<string[] | null> {
  const [row] = await db.select().from(lessonAudioTranscripts).where(eq(lessonAudioTranscripts.lessonId, lessonId));
  const stored = row?.pages;
  // Anything cached by an older extraction format is treated as missing, so it gets re-extracted.
  if (!stored || Array.isArray(stored) || stored.formatVersion !== TRANSCRIPT_FORMAT_VERSION) return null;
  return stored.pages;
}
