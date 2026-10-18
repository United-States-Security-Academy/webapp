import { and, count, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { assessmentAttemptResets, assessmentAttempts } from '@/db/schema';
import { ApiError } from '@/api-response/api-error';
import { API_ERROR_CODE } from '@/api-response/api-error-codes';
import { attemptsExhaustedMessage, computeAttemptAllowance, type AttemptAllowance } from './attempt-allowance';

export { attemptsExhaustedMessage, computeAttemptAllowance, type AttemptAllowance };

type Executor = Pick<typeof db, 'select'>;
type TransactionExecutor = Pick<typeof db, 'select' | 'execute'>;

// Attempts submitted after the learner's last reset (all of them if never reset).
export async function countAttemptsTowardLimit(assessmentId: string, userId: string, executor: Executor = db): Promise<number> {
  const [reset] = await executor
    .select({ resetAt: assessmentAttemptResets.resetAt })
    .from(assessmentAttemptResets)
    .where(and(eq(assessmentAttemptResets.assessmentId, assessmentId), eq(assessmentAttemptResets.userId, userId)));

  const [row] = await executor
    .select({ attemptCount: count() })
    .from(assessmentAttempts)
    .where(
      and(
        eq(assessmentAttempts.assessmentId, assessmentId),
        eq(assessmentAttempts.userId, userId),
        reset ? gt(assessmentAttempts.submittedAt, reset.resetAt) : undefined,
      ),
    );
  return row?.attemptCount ?? 0;
}

export async function getAttemptAllowance(
  assessment: { id: string; maxAttempts: number | null },
  userId: string,
): Promise<AttemptAllowance> {
  if (assessment.maxAttempts === null) return computeAttemptAllowance(null, 0);
  return computeAttemptAllowance(assessment.maxAttempts, await countAttemptsTowardLimit(assessment.id, userId));
}

// Inside the transaction that records an attempt: holds a per-learner lock so two submissions sent
// at the same moment (two tabs) can't both slip under the limit, then throws if none are left.
export async function requireAttemptLeftInTransaction(
  transaction: TransactionExecutor,
  assessment: { id: string; maxAttempts: number | null },
  userId: string,
): Promise<void> {
  if (assessment.maxAttempts === null) return;
  await transaction.execute(sql`select pg_advisory_xact_lock(hashtext(${`assessment-attempt:${assessment.id}:${userId}`}))`);
  const attemptsUsed = await countAttemptsTowardLimit(assessment.id, userId, transaction);
  if (!computeAttemptAllowance(assessment.maxAttempts, attemptsUsed).hasAttemptsLeft) {
    throw new ApiError(403, API_ERROR_CODE.ASSESSMENT_ATTEMPTS_EXHAUSTED, attemptsExhaustedMessage(assessment.maxAttempts));
  }
}

// Gives the learner a fresh set of attempts. Earlier attempts stay on record.
export async function resetAttempts(assessmentId: string, userId: string, resetBy: string): Promise<void> {
  const resetAt = new Date();
  await db
    .insert(assessmentAttemptResets)
    .values({ assessmentId, userId, resetAt, resetBy })
    .onConflictDoUpdate({
      target: [assessmentAttemptResets.assessmentId, assessmentAttemptResets.userId],
      set: { resetAt, resetBy },
    });
}
