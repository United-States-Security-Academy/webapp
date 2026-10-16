import type { StructuredBlock } from '@/db/schema/structured-courses';

// Index of the first block a student can't read yet: everything after the first quiz whose
// questions aren't all answered correctly. null when the whole lesson is open.
export function getFirstLockedBlockIndex(blocks: StructuredBlock[], passedQuizIndexes: ReadonlySet<number>): number | null {
  const blockingQuizIndex = blocks.findIndex((block, index) => block.type === 'quiz' && !passedQuizIndexes.has(index));
  if (blockingQuizIndex === -1 || blockingQuizIndex === blocks.length - 1) return null;
  return blockingQuizIndex + 1;
}
