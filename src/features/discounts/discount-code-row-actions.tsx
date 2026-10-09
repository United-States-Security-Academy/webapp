'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/api-response/action-result';
import { deleteDiscountCode, setDiscountCodeActive } from './discount-actions';

export function DiscountCodeRowActions({
  discountCodeId,
  code,
  isActive,
}: {
  discountCodeId: string;
  code: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function runAction(action: () => Promise<ActionResult>) {
    setIsBusy(true);
    setErrorMessage(null);
    const result = await action();
    setIsBusy(false);
    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }
    router.refresh();
  }

  function handleDelete() {
    const confirmed = window.confirm(`Delete the discount code "${code}"? Learners will no longer be able to use it.`);
    if (confirmed) runAction(() => deleteDiscountCode(discountCodeId));
  }

  return (
    <div>
      <div className="flex items-center justify-end gap-3 text-xs font-semibold">
        <button
          type="button"
          onClick={() => runAction(() => setDiscountCodeActive(discountCodeId, !isActive))}
          disabled={isBusy}
          className="text-navy-800 hover:underline disabled:opacity-50"
        >
          {isActive ? 'Turn off' : 'Turn on'}
        </button>
        <button type="button" onClick={handleDelete} disabled={isBusy} className="text-red-600 hover:underline disabled:opacity-50">
          Delete
        </button>
      </div>
      {errorMessage && <p className="mt-1 text-right text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
