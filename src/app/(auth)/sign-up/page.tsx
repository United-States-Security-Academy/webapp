'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AuthError } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/supabase/browser-client';
import { ResendConfirmationButton } from '@/features/auth/resend-confirmation-button';
import { ContinueWithGoogleButton } from '@/features/auth/continue-with-google-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';

const CONFIRMATION_MESSAGE = 'Check your email to confirm your account, then sign in.';
// Errors answered with the confirmation screen, as if sign-up worked. Besides existing accounts this
// includes the project-wide email quota: confirmed accounts never reach the email-send step, so a
// distinct "too many attempts" message would reveal which addresses are registered.
const CONFIRMATION_SCREEN_ERROR_CODES = new Set(['user_already_exists', 'email_exists', 'over_email_send_rate_limit']);

// Supabase's own error text can reveal account details, so only fixed messages are shown —
// except for weak passwords, where its text only lists the project's password requirements.
function getSignUpErrorMessage(error: AuthError): string {
  switch (error.code) {
    case 'weak_password':
      return error.message;
    case 'email_address_invalid':
      return 'Enter a valid email address.';
    case 'over_request_rate_limit':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'signup_disabled':
      return 'New sign-ups are currently closed.';
    default:
      return 'We couldn’t create your account. Please try again.';
  }
}

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setErrorMessage(null);
    setConfirmationMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    setIsSubmitting(false);
    // An email that already has an account gets the same screen as a brand-new sign-up, so the
    // form can't be used to find out who is registered.
    if (error && !CONFIRMATION_SCREEN_ERROR_CODES.has(error.code ?? '')) {
      setErrorMessage(getSignUpErrorMessage(error));
      return;
    }

    // Email confirmation is required by the Supabase project — no session yet.
    if (error || !data.session) {
      setConfirmationMessage(CONFIRMATION_MESSAGE);
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
            START YOUR
            <br />
            TRAINING TODAY.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300">
            Create a free account to enroll in courses, track your progress, and earn
            certificates across every training program.
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

          <h2 className="text-2xl font-extrabold tracking-wide text-navy-900">CREATE ACCOUNT</h2>
          <p className="mt-1 text-sm text-slate-500">Sign up as a student to start enrolling in courses.</p>

          {confirmationMessage ? (
            <div className="mt-8 flex flex-col gap-3">
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{confirmationMessage}</p>
              <p className="text-center text-xs text-slate-400">Didn&apos;t get the email?</p>
              <ResendConfirmationButton email={email} />
            </div>
          ) : (
            <>
              <div className="mt-6">
                <ContinueWithGoogleButton />
              </div>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="fullName" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Full name
                </label>
                <Input
                  id="fullName"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(changeEvent) => setFullName(changeEvent.target.value)}
                  required
                />
              </div>
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
              <div>
                <label htmlFor="password" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Password
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
                  Confirm password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Re-enter your password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(changeEvent) => setConfirmPassword(changeEvent.target.value)}
                  required
                />
              </div>

              {errorMessage && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>}

              <Button type="submit" variant="gold" isLoading={isSubmitting} className="mt-2 w-full">
                CREATE ACCOUNT
              </Button>
            </form>
            </>
          )}

          <p className="mt-8 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/sign-in" className="font-semibold text-navy-800 hover:text-gold-600">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
