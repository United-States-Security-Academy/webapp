export function formatCoursePrice(priceAmountMinor: number, currency: string): string {
  if (priceAmountMinor === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(priceAmountMinor / 100);
}
