import { describe, expect, it } from 'vitest';
import { attemptsExhaustedMessage, computeAttemptAllowance } from '@/features/assessments/attempt-allowance';

describe('computeAttemptAllowance', () => {
  it('always has attempts left when the exam is unlimited', () => {
    expect(computeAttemptAllowance(null, 0)).toEqual({ maxAttempts: null, attemptsUsed: 0, attemptsRemaining: null, hasAttemptsLeft: true });
    expect(computeAttemptAllowance(null, 50).hasAttemptsLeft).toBe(true);
  });

  it('counts down to the limit', () => {
    expect(computeAttemptAllowance(3, 0)).toMatchObject({ attemptsRemaining: 3, hasAttemptsLeft: true });
    expect(computeAttemptAllowance(3, 2)).toMatchObject({ attemptsRemaining: 1, hasAttemptsLeft: true });
    expect(computeAttemptAllowance(3, 3)).toMatchObject({ attemptsRemaining: 0, hasAttemptsLeft: false });
  });

  it('never reports negative attempts when the limit was lowered below what was used', () => {
    expect(computeAttemptAllowance(2, 5)).toMatchObject({ attemptsRemaining: 0, hasAttemptsLeft: false });
  });
});

describe('attemptsExhaustedMessage', () => {
  it('names the limit and tells the learner what to do', () => {
    expect(attemptsExhaustedMessage(3)).toBe(
      "You've used all 3 of your attempts for this assessment. Please contact us to request another attempt.",
    );
  });
});
