import { describe, expect, it } from 'vitest';
import { applyPercentOff, normalizeDiscountCode } from '@/features/discounts/discount-pricing';

describe('applyPercentOff', () => {
  it('takes the percentage off the price', () => {
    expect(applyPercentOff(10000, 25)).toBe(7500);
  });

  it('makes the course free at 100%', () => {
    expect(applyPercentOff(4999, 100)).toBe(0);
  });

  it('rounds to the nearest cent', () => {
    expect(applyPercentOff(4999, 15)).toBe(4249);
  });
});

describe('normalizeDiscountCode', () => {
  it('trims and uppercases so codes are case-insensitive', () => {
    expect(normalizeDiscountCode('  spring25 ')).toBe('SPRING25');
  });
});
