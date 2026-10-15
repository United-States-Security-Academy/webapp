import type { StructuredInline } from '@/db/schema/structured-courses';
import { InlineContent } from './inline-content';

const VARIANT_STYLES = {
  note: { label: 'Note', className: 'border-slate-400 bg-slate-100 text-slate-700', labelClassName: 'text-slate-900' },
  warning: { label: 'Warning', className: 'border-red-600 bg-red-50 text-red-900', labelClassName: 'text-red-700' },
} as const;

// "Note:" paragraphs in a neutral highlight, "Warning:" paragraphs in red.
export function CalloutBlock({ variant, content }: { variant: 'note' | 'warning'; content: StructuredInline[] }) {
  const { label, className, labelClassName } = VARIANT_STYLES[variant];
  return (
    <aside role="note" className={`max-w-[70ch] rounded-r-lg border-l-4 px-4 py-3 ${className}`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${labelClassName}`}>{label}</p>
      <p className="mt-1 text-[17px] leading-relaxed">
        <InlineContent runs={content} />
      </p>
    </aside>
  );
}
