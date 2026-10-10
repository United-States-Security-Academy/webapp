import { pgTable, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { lessons } from './lessons';

// The text used to read a PDF lesson aloud — one row per lesson, one string per page. Cached so
// that OCR (needed only for scanned pages with no real text layer) runs at most once per
// document instead of once per student per listen.
//
// `pages` holds { formatVersion, pages }. Bump TRANSCRIPT_FORMAT_VERSION whenever text extraction
// changes how it reads a PDF: older cached rows (including the original bare string[] rows) are
// then ignored and re-extracted on the next listen. Version 2 skips running headers/footers;
// version 3 also reads table-of-contents dot leaders as "Heading, page N".
export const TRANSCRIPT_FORMAT_VERSION = 3;
export type StoredTranscript = { formatVersion: number; pages: string[] };

export const lessonAudioTranscripts = pgTable('lesson_audio_transcripts', {
  lessonId: uuid('lesson_id')
    .primaryKey()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  pages: jsonb('pages').$type<StoredTranscript | string[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type LessonAudioTranscript = typeof lessonAudioTranscripts.$inferSelect;
