'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/supabase/browser-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsSubmitting(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    // Supabase never reveals whether an email is registered here — we keep the same generic
    // message regardless, so this page can't be used to check which emails have accounts.
    setIsSubmitted(true);
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

          <h2 className="text-2xl font-extrabold tracking-wide text-navy-900">RESET PASSWORD</h2>
          <p className="mt-1 text-sm text-slate-500">Enter your email and we&apos;ll send you a link to reset your password.</p>

          {isSubmitted ? (
            <p className="mt-8 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              If an account exists for that email, a password reset link is on its way. Check your inbox.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(changeEvent) => setEmail(changeEvent.target.value)}
                  required
                />
              </div>

              {errorMessage && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>}

              <Button type="submit" variant="gold" isLoading={isSubmitting} className="mt-2 w-full">
                Send reset link
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
