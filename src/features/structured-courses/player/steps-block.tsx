'use client';

import { motion } from 'framer-motion';
import type { StructuredInline } from '@/db/schema/structured-courses';
import { InlineContent } from './inline-content';
import { useRevealOnScroll } from './reveal';

// A numbered procedure. A line joins the step numbers, and each step appears as it scrolls into view.
export function StepsBlock({ items }: { items: StructuredInline[][] }) {
  const revealProps = useRevealOnScroll();
  return (
    <ol className="max-w-[70ch]">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <motion.li key={index} {...revealProps} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && <span aria-hidden className="absolute left-4 top-9 bottom-0 w-px -translate-x-1/2 bg-slate-300" />}
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white"
            >
              {index + 1}
            </span>
            <p className="pt-1 text-[17px] leading-relaxed text-slate-700">
              <span className="sr-only">Step {index + 1}: </span>
              <InlineContent runs={item} />
            </p>
          </motion.li>
        );
      })}
    </ol>
  );
}
