import { pgTable, pgEnum, uuid, text, integer, timestamp, jsonb, index, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { courses } from './courses';
import { users } from './users';

// A run of text inside a block. Kept as data (not HTML) so the student page renders it with
// plain React elements — nothing from an uploaded document is ever injected as raw HTML.
export interface StructuredInline {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
}

export interface StructuredQuizQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export type StructuredBlock =
  | { type: 'heading'; text: string }
  | { type: 'text'; content: StructuredInline[] }
  | { type: 'steps'; items: StructuredInline[][] }
  | { type: 'points'; items: StructuredInline[][] }
  | { type: 'table'; rows: StructuredInline[][][]; hasHeaderRow: boolean }
  | { type: 'image'; storagePath: string; alt: string }
  | { type: 'callout'; variant: 'note' | 'warning'; content: StructuredInline[] }
  | { type: 'quiz'; questions: StructuredQuizQuestion[] };

export type StructuredBlockType = StructuredBlock['type'];

// A student's answers to one inline quiz question: every option they picked, in order (the last
// one is the correct answer). blockIndex/questionIndex locate the question in the revision the
// answers were given against (structured_lesson_progress.revision_id).
export interface StructuredQuizAnswer {
  blockIndex: number;
  questionIndex: number;
  selectedOptionIndexes: number[];
}

export interface StructuredLessonContent {
  // Stable within the module (slug of the Heading 2 text), so a re-uploaded module keeps each
  // learner's progress on lessons that weren't renamed.
  key: string;
  title: string;
  blocks: StructuredBlock[];
}

export interface StructuredModuleContent {
  title: string;
  lessons: StructuredLessonContent[];
}

// processing: the file is uploaded and being converted. ready: converted into draft content.
// failed: the file couldn't be converted; parse_errors lists why, for the admin to fix in Word.
export const structuredRevisionStatusEnum = pgEnum('structured_revision_status', ['processing', 'ready', 'failed']);
export type StructuredRevisionStatus = (typeof structuredRevisionStatusEnum.enumValues)[number];

// One uploaded .docx = one module of a structured course. What students see is the revision
// `publishedRevisionId` points at; a new upload only creates a draft revision, so re-uploading
// never changes a live module until it is published.
export const structuredModules = pgTable(
  'structured_modules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    position: integer('position').notNull(),
    publishedRevisionId: uuid('published_revision_id').references((): AnyPgColumn => structuredModuleRevisions.id, {
      onDelete: 'set null',
    }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    courseIdIndex: index('structured_modules_course_id_index').on(table.courseId),
  }),
);

// Every upload of a module's .docx, parsed. Kept rather than overwritten so the published
// revision stays intact while a newer draft is previewed.
export const structuredModuleRevisions = pgTable(
  'structured_module_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => structuredModules.id, { onDelete: 'cascade' }),
    sourceFileName: text('source_file_name').notNull(),
    sourceStoragePath: text('source_storage_path').notNull(),
    status: structuredRevisionStatusEnum('status').notNull().default('processing'),
    // Only set once status is 'ready'.
    content: jsonb('content').$type<StructuredModuleContent>(),
    // Problems that stopped the conversion, written for the admin (status 'failed').
    parseErrors: jsonb('parse_errors').$type<string[]>().notNull().default([]),
    // Things the parser skipped or guessed at (unknown styles, nested lists...), shown to the
    // admin on the preview page before publishing.
    parseWarnings: jsonb('parse_warnings').$type<string[]>().notNull().default([]),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    moduleIdIndex: index('structured_module_revisions_module_id_index').on(table.moduleId),
  }),
);

// Separate from lesson_progress, whose lesson_id must reference a row in `lessons`.
export const structuredLessonProgress = pgTable(
  'structured_lesson_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => structuredModules.id, { onDelete: 'cascade' }),
    lessonKey: text('lesson_key').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    // The published revision the student completed the lesson in, and their quiz answers there.
    revisionId: uuid('revision_id').references(() => structuredModuleRevisions.id, { onDelete: 'set null' }),
    quizAnswers: jsonb('quiz_answers').$type<StructuredQuizAnswer[]>().notNull().default([]),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdModuleIdLessonKeyUnique: uniqueIndex('structured_lesson_progress_user_id_module_id_lesson_key_unique').on(
      table.userId,
      table.moduleId,
      table.lessonKey,
    ),
  }),
);

export type StructuredModule = typeof structuredModules.$inferSelect;
export type StructuredModuleRevision = typeof structuredModuleRevisions.$inferSelect;
