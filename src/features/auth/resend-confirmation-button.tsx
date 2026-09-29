'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/supabase/browser-client';
import { Button } from '@/components/ui/button';

export function ResendConfirmationButton({ email }: { email: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleResend() {
    setStatus('sending');
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.resend({ type: 'signup', email });

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
      return;
    }
    setStatus('sent');
  }

  if (status === 'sent') {
    return <p className="text-xs font-medium text-green-600">Confirmation email resent — check your inbox.</p>;
  }

  return (
    <div>
      <Button type="button" variant="outline" onClick={handleResend} isLoading={status === 'sending'} className="w-full">
        Resend confirmation email
      </Button>
      {errorMessage && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
