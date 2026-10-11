import { describe, expect, it } from 'vitest';
import { maskGovernmentId } from '@/features/profile/government-id';

describe('maskGovernmentId', () => {
  it('keeps only the last two characters of a license number', () => {
    expect(maskGovernmentId('12345678')).toBe('••••••78');
  });

  it('reveals just one digit of a 4-digit SSN fragment', () => {
    expect(maskGovernmentId('1234')).toBe('•••4');
  });

  it('hides very short values completely', () => {
    expect(maskGovernmentId('12')).toBe('••');
  });
});
