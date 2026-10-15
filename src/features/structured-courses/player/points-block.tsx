'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { StructuredInline } from '@/db/schema/structured-courses';
import { InlineContent } from './inline-content';
import { REVEAL_VARIANTS } from './reveal';

const LIST_VARIANTS = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

// Bullet points that appear one after another when the list scrolls into view.
export function PointsBlock({ items }: { items: StructuredInline[][] }) {
  const shouldReduceMotion = useReducedMotion();
  const listProps = shouldReduceMotion
    ? { initial: false as const }
    : { initial: 'hidden' as const, whileInView: 'visible' as const, viewport: { once: true, amount: 0.3 }, variants: LIST_VARIANTS };

  return (
    <motion.ul {...listProps} className="flex max-w-[70ch] flex-col gap-3">
      {items.map((item, index) => (
        <motion.li key={index} variants={shouldReduceMotion ? undefined : REVEAL_VARIANTS} className="flex gap-3">
          <span aria-hidden className="mt-[0.6em] h-2 w-2 shrink-0 rounded-full bg-gold-500" />
          <p className="text-[17px] leading-relaxed text-slate-700">
            <InlineContent runs={item} />
          </p>
        </motion.li>
      ))}
    </motion.ul>
  );
}
