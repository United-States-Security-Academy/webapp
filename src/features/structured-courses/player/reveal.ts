'use client';

import { useReducedMotion, type Variants } from 'framer-motion';

// The one entrance animation the lesson player uses: a short fade with a small rise. With
// "reduce motion" turned on in the device settings, content is simply shown, without animating.
export const REVEAL_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export function useRevealOnScroll() {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return { initial: false as const };
  return {
    initial: 'hidden' as const,
    whileInView: 'visible' as const,
    viewport: { once: true, amount: 0.4 },
    variants: REVEAL_VARIANTS,
  };
}
