'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createCourseCheckoutSession } from './create-checkout-session';

export function CheckoutButton({ courseSlug, priceLabel }: { courseSlug: string; priceLabel: string }) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCheckout() {
    setIsRedirecting(true);
    setErrorMessage(null);
    const result = await createCourseCheckoutSession(courseSlug);
    if (!result.success) {
      setErrorMessage(result.error);
      setIsRedirecting(false);
      return;
    }
    window.location.href = result.data.checkoutUrl;
  }

  return (
    <div>
      <Button variant="gold" className="w-full" onClick={handleCheckout} isLoading={isRedirecting}>
        Enroll for {priceLabel}
      </Button>
      {errorMessage && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
