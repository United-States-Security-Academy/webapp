'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/supabase/browser-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type FormState =
  | { status: 'loading' }
  | { status: 'enroll'; factorId: string; qrCode: string; secret: string }
  | { status: 'verify'; factorId: string }
  | { status: 'error'; message: string };

// Uses Supabase Auth's built-in TOTP factors. An admin with no verified authenticator is shown a
// QR code to enroll one; afterwards they just enter the current code. Verifying upgrades the
// session to aal2, which is what get-authenticated-user checks before granting admin powers.
export function AdminTwoFactorForm() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>({ status: 'loading' });
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadFactors() {
      const supabase = getSupabaseBrowserClient();
      const { data: factorList, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) {
        if (!isCancelled) setFormState({ status: 'error', message: listError.message });
        return;
      }

      const verifiedFactor = factorList.totp[0];
      if (verifiedFactor) {
        if (!isCancelled) setFormState({ status: 'verify', factorId: verifiedFactor.id });
        return;
      }

      // A half-finished enrollment (QR shown, code never entered) blocks enrolling again — clear it first.
      for (const staleFactor of factorList.all.filter((factor) => factor.status === 'unverified')) {
        await supabase.auth.mfa.unenroll({ factorId: staleFactor.id });
      }

      const { data: enrollment, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        // Supabase rejects duplicate names; a timestamp keeps a double-mounted effect (React dev mode) from colliding.
        friendlyName: `USSA admin ${new Date().toISOString()}`,
      });
      if (isCancelled) return;
      if (enrollError) {
        setFormState({ status: 'error', message: enrollError.message });
        return;
      }
      setFormState({
        status: 'enroll',
        factorId: enrollment.id,
        qrCode: enrollment.totp.qr_code,
        secret: enrollment.totp.secret,
      });
    }

    void loadFactors();
    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (formState.status !== 'enroll' && formState.status !== 'verify') return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: formState.factorId, code: code.trim() });

    if (error) {
      setIsSubmitting(false);
      setErrorMessage(error.code === 'mfa_verification_failed' ? 'That code is incorrect or has expired. Try the current one.' : error.message);
      setCode('');
      return;
    }
    router.push('/post-sign-in');
    router.refresh();
  }

  if (formState.status === 'loading') return <p className="mt-6 text-sm text-slate-500">Loading...</p>;

  if (formState.status === 'error') {
    return <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formState.message}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      {formState.status === 'enroll' && (
        <div className="flex flex-col gap-3 text-sm text-slate-600">
          <p>
            <strong className="text-navy-900">First-time setup.</strong> Scan this QR code with an authenticator app
            (Google Authenticator, Microsoft Authenticator, Authy or 1Password), then enter the 6-digit code it shows.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase returns the QR code as an SVG data URI */}
          <img src={formState.qrCode} alt="Authenticator QR code" className="mx-auto h-44 w-44 rounded-md border border-slate-200 bg-white p-2" />
          <p className="text-xs text-slate-500">
            Can&apos;t scan it? Enter this key in the app instead:
            <code className="mt-1 block break-all rounded bg-slate-100 px-2 py-1 font-mono text-slate-800">{formState.secret}</code>
          </p>
        </div>
      )}

      <div>
        <label htmlFor="totpCode" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
          6-digit code
        </label>
        <Input
          id="totpCode"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(changeEvent) => setCode(changeEvent.target.value.replace(/\D/g, ''))}
          autoFocus
          required
        />
      </div>

      {errorMessage && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>}

      <Button type="submit" variant="gold" isLoading={isSubmitting} className="w-full">
        {formState.status === 'enroll' ? 'Turn on two-factor' : 'Verify'}
      </Button>
    </form>
  );
}
