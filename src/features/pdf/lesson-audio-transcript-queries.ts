import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { lessonAudioTranscripts } from '@/db/schema';

export async function getLessonAudioTranscript(lessonId: string): Promise<string[] | null> {
  const [row] = await db.select().from(lessonAudioTranscripts).where(eq(lessonAudioTranscripts.lessonId, lessonId));
  return row?.pages ?? null;
}
