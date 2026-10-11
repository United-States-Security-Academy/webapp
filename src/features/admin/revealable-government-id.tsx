'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { revealGovernmentId } from './user-actions';

export function RevealableGovernmentId({ userId, maskedValue }: { userId: string; maskedValue: string }) {
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleToggle() {
    if (revealedValue) {
      setRevealedValue(null);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    const result = await revealGovernmentId(userId);
    setIsLoading(false);
    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }
    setRevealedValue(result.data ?? '');
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="font-mono tracking-wider">{revealedValue ?? maskedValue}</span>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isLoading}
        className="inline-flex items-center gap-1 text-xs font-semibold text-navy-800 hover:text-gold-600 disabled:opacity-50"
      >
        <Icon name={revealedValue ? 'eyeOff' : 'eye'} className="h-3.5 w-3.5" />
        {isLoading ? 'Loading…' : revealedValue ? 'Hide' : 'Show'}
      </button>
      {errorMessage && <span className="text-xs text-red-600">{errorMessage}</span>}
    </span>
  );
}
