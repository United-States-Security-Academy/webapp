// Stripe rejects card charges below roughly 50 cents (or the equivalent) in most currencies.
export const MIN_CARD_CHARGE_MINOR = 50;

export function normalizeDiscountCode(code: string): string {
  return code.trim().toUpperCase();
}

export function applyPercentOff(priceAmountMinor: number, percentOff: number): number {
  return Math.round((priceAmountMinor * (100 - percentOff)) / 100);
}
