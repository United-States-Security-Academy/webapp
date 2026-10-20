import { z } from 'zod';
import type { StructuredBlock, StructuredInline, StructuredModuleContent } from '@/db/schema/structured-courses';

// Validates parsed module content before it is stored, and again whenever it is read back from
// the jsonb column, so a page never renders a block shape it doesn't know.

const safeHrefSchema = z.string().regex(/^(https?:|mailto:)/i);

const inlineSchema: z.ZodType<StructuredInline> = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  href: safeHrefSchema.optional(),
});

const inlineRunSchema = z.array(inlineSchema).min(1);

const quizQuestionSchema = z
  .object({
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    correctIndex: z.number().int().min(0),
    explanation: z.string().optional(),
  })
  .refine((question) => question.correctIndex < question.options.length, { message: 'correctIndex is out of range.' });

const blockSchema: z.ZodType<StructuredBlock> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'), text: z.string().min(1) }),
  z.object({ type: z.literal('text'), content: inlineRunSchema }),
  z.object({ type: z.literal('steps'), items: z.array(inlineRunSchema).min(1) }),
  z.object({ type: z.literal('points'), items: z.array(inlineRunSchema).min(1) }),
  z.object({ type: z.literal('table'), rows: z.array(z.array(z.array(inlineSchema))).min(1), hasHeaderRow: z.boolean() }),
  z.object({ type: z.literal('image'), storagePath: z.string().min(1), alt: z.string() }),
  z.object({ type: z.literal('callout'), variant: z.enum(['note', 'warning']), content: inlineRunSchema }),
  z.object({ type: z.literal('quiz'), questions: z.array(quizQuestionSchema).min(1) }),
]) as z.ZodType<StructuredBlock>;

export const structuredModuleContentSchema: z.ZodType<StructuredModuleContent> = z.object({
  title: z.string().min(1),
  lessons: z
    .array(
      z.object({
        key: z.string().min(1),
        title: z.string().min(1),
        topics: z.array(z.string().min(1)).optional(),
        blocks: z.array(blockSchema),
      }),
    )
    .min(1),
});
