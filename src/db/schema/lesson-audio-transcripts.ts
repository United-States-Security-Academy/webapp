import { pgTable, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { lessons } from './lessons';

// The text used to read a PDF lesson aloud — one row per lesson, one string per page. Cached so
// that OCR (needed only for scanned pages with no real text layer) runs at most once per
// document instead of once per student per listen.
export const lessonAudioTranscripts = pgTable('lesson_audio_transcripts', {
  lessonId: uuid('lesson_id')
    .primaryKey()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  pages: jsonb('pages').$type<string[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type LessonAudioTranscript = typeof lessonAudioTranscripts.$inferSelect;
