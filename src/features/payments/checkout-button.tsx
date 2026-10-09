'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { previewDiscountCode } from '@/features/discounts/discount-actions';
import { createCourseCheckoutSession } from './create-checkout-session';

type AppliedDiscount = { code: string; percentOff: number; discountedPriceLabel: string };

export function CheckoutButton({ courseSlug, priceLabel }: { courseSlug: string; priceLabel: string }) {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDiscountFormOpen, setIsDiscountFormOpen] = useState(false);
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [discountErrorMessage, setDiscountErrorMessage] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);

  async function handleApplyDiscount(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setIsApplyingDiscount(true);
    setDiscountErrorMessage(null);
    const result = await previewDiscountCode(courseSlug, discountCodeInput);
    setIsApplyingDiscount(false);
    if (!result.success) {
      setDiscountErrorMessage(result.error);
      return;
    }
    setAppliedDiscount({ code: discountCodeInput, ...result.data });
  }

  function handleRemoveDiscount() {
    setAppliedDiscount(null);
    setDiscountCodeInput('');
  }

  async function handleCheckout() {
    setIsRedirecting(true);
    setErrorMessage(null);
    const result = await createCourseCheckoutSession(courseSlug, appliedDiscount?.code);
    if (!result.success) {
      setErrorMessage(result.error);
      setIsRedirecting(false);
      return;
    }
    // No checkout URL means a 100%-off code enrolled the learner directly.
    if (result.data.checkoutUrl === null) {
      router.refresh();
      return;
    }
    window.location.href = result.data.checkoutUrl;
  }

  return (
    <div>
      {appliedDiscount ? (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
          <span>
            <span className="font-bold">{appliedDiscount.code.trim().toUpperCase()}</span> applied —{' '}
            {appliedDiscount.percentOff}% off
          </span>
          <button type="button" onClick={handleRemoveDiscount} className="font-semibold hover:underline">
            Remove
          </button>
        </div>
      ) : isDiscountFormOpen ? (
        <form onSubmit={handleApplyDiscount} className="mb-3">
          <div className="flex gap-2">
            <Input
              placeholder="Discount code"
              value={discountCodeInput}
              onChange={(changeEvent) => setDiscountCodeInput(changeEvent.target.value)}
              required
              autoFocus
            />
            <Button type="submit" variant="outline" isLoading={isApplyingDiscount}>
              Apply
            </Button>
          </div>
          {discountErrorMessage && <p className="mt-1 text-xs text-red-600">{discountErrorMessage}</p>}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsDiscountFormOpen(true)}
          className="mb-3 text-xs font-semibold text-navy-800 hover:underline"
        >
          Have a discount code?
        </button>
      )}

      <Button variant="gold" className="w-full" onClick={handleCheckout} isLoading={isRedirecting}>
        {appliedDiscount ? (
          <>
            Enroll for {appliedDiscount.discountedPriceLabel}{' '}
            <span className="font-normal line-through opacity-60">{priceLabel}</span>
          </>
        ) : (
          <>Enroll for {priceLabel}</>
        )}
      </Button>
      {errorMessage && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
