'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/supabase/browser-client';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';

type LinkStatus = 'verifying' | 'valid' | 'invalid';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('verifying');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Clicking the reset-password email link lands here with a recovery code in the URL, which
    // the browser client exchanges for a session automatically — this fires once that's done.
    // A short timeout covers the case where the link is missing/expired and no event ever fires.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setLinkStatus('valid');
    });

    const timeoutId = setTimeout(() => {
      setLinkStatus((currentStatus) => (currentStatus === 'verifying' ? 'invalid' : currentStatus));
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });

    setIsSubmitting(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push('/post-sign-in');
    router.refresh();
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative isolate hidden overflow-hidden bg-navy-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Image src="/heroimge.png" alt="" fill sizes="50vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/95 via-navy-950/90 to-navy-950/60" />

        <Link href="/" className="relative flex items-center gap-3">
          <Image src="/ussalogo.png" alt="USSA seal" width={56} height={56} className="h-14 w-14" />
          <span>
            <span className="block text-lg font-extrabold leading-tight tracking-wide">
              UNITED STATES
              <br />
              SECURITY ACADEMY
            </span>
            <span className="block text-xs font-semibold tracking-[0.2em] text-gold-400">
              TRAIN &middot; CERTIFY &middot; SERVE &middot; LEAD
            </span>
          </span>
        </Link>

        <div className="relative">
          <h1 className="text-3xl font-extrabold leading-tight">
            TRAINING & CERTIFICATION
            <br />
            FOR THOSE WHO LEAD.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300">
            Sign in to access your courses, manage instructor content, and
            track certification progress across every training program.
          </p>
        </div>
      </section>

      <section className="flex flex-col justify-center px-4 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-3 lg:hidden">
            <Image src="/ussalogo.png" alt="USSA seal" width={48} height={48} className="h-12 w-12" />
            <span className="text-base font-extrabold leading-tight tracking-wide text-navy-900">
              UNITED STATES
              <br />
              SECURITY ACADEMY
            </span>
          </Link>

          <h2 className="text-2xl font-extrabold tracking-wide text-navy-900">SET A NEW PASSWORD</h2>

          {linkStatus === 'verifying' && <p className="mt-4 text-sm text-slate-500">Verifying your reset link...</p>}

          {linkStatus === 'invalid' && (
            <>
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                This reset link is invalid or has expired.
              </p>
              <Link
                href="/forgot-password"
                className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-gold-500 px-4 py-2.5 text-sm font-medium text-navy-950 hover:bg-gold-400"
              >
                Request a new link
              </Link>
            </>
          )}

          {linkStatus === 'valid' && (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div>
                <label htmlFor="password" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  New password
                </label>
                <PasswordInput
                  id="password"
                  placeholder="At least 8 characters"
                  minLength={8}
                  value={password}
                  onChange={(changeEvent) => setPassword(changeEvent.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Confirm new password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="At least 8 characters"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(changeEvent) => setConfirmPassword(changeEvent.target.value)}
                  required
                />
              </div>

              {errorMessage && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>}

              <Button type="submit" variant="gold" isLoading={isSubmitting} className="mt-2 w-full">
                Update password
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">
            <Link href="/sign-in" className="font-semibold text-navy-800 hover:text-gold-600">
              &larr; Back to sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
