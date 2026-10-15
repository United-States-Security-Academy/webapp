import type { StructuredInline } from '@/db/schema/structured-courses';
import { InlineContent } from './inline-content';

// Body text, kept to about 70 characters per line for comfortable reading.
export function TextBlock({ content }: { content: StructuredInline[] }) {
  return (
    <p className="max-w-[70ch] text-[17px] leading-relaxed text-slate-700">
      <InlineContent runs={content} />
    </p>
  );
}
