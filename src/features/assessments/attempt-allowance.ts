// Pure attempt-limit arithmetic (no database), shared by the server checks and the pages.

export interface AttemptAllowance {
  // Null when the assessment allows unlimited attempts.
  maxAttempts: number | null;
  // Attempts that count toward the limit: those submitted since the learner's last reset.
  attemptsUsed: number;
  // Null when unlimited.
  attemptsRemaining: number | null;
  hasAttemptsLeft: boolean;
}

export function computeAttemptAllowance(maxAttempts: number | null, attemptsUsed: number): AttemptAllowance {
  if (maxAttempts === null) return { maxAttempts, attemptsUsed, attemptsRemaining: null, hasAttemptsLeft: true };
  const attemptsRemaining = Math.max(0, maxAttempts - attemptsUsed);
  return { maxAttempts, attemptsUsed, attemptsRemaining, hasAttemptsLeft: attemptsRemaining > 0 };
}

export function attemptsExhaustedMessage(maxAttempts: number): string {
  return `You've used all ${maxAttempts} of your attempts for this assessment. Please contact us to request another attempt.`;
}
