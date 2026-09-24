'use server';

import { db } from '@/db/client';
import { lessonAudioTranscripts } from '@/db/schema';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';

// Caches whatever text (real or OCR'd) a student's browser just extracted for a lesson's PDF, so
// the next student to click "Listen" gets it instantly instead of re-extracting (or re-OCRing).
// No lesson-ownership check beyond being signed in — this only caches derived, non-sensitive
// page text for a document the caller already had to be granted access to render in the first place.
export async function saveLessonAudioTranscript(lessonId: string, pages: string[]) {
  await requireAuthenticatedUserFromSession();

  await db
    .insert(lessonAudioTranscripts)
    .values({ lessonId, pages })
    .onConflictDoUpdate({ target: lessonAudioTranscripts.lessonId, set: { pages } });
}
