import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getDashboardHref } from '@/features/auth/get-dashboard-href';
import { AdminTwoFactorForm } from '@/features/auth/admin-two-factor-form';
import { SignOutButton } from '@/features/auth/sign-out-button';

// Second sign-in step for admins: enroll an authenticator app the first time, then enter its
// 6-digit code on every sign-in. Anyone else who lands here is sent on to their own home.
export default async function TwoFactorPage() {
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');
  if (!authenticatedUser.isAwaitingAdminTwoFactor) redirect(getDashboardHref(authenticatedUser.role));

  return (
    <main className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-16">
      <div className="mx-auto w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/ussalogo.png" alt="USSA seal" width={40} height={40} className="h-10 w-10" />
          <span className="text-sm font-extrabold leading-tight tracking-wide text-navy-900">
            UNITED STATES
            <br />
            SECURITY ACADEMY
          </span>
        </div>

        <h1 className="text-2xl font-extrabold tracking-wide text-navy-900">TWO-FACTOR CHECK</h1>
        <p className="mt-1 text-sm text-slate-500">
          Admin accounts need a code from an authenticator app. Signed in as {authenticatedUser.email}.
        </p>

        <AdminTwoFactorForm />

        <p className="mt-6 text-center text-xs text-slate-400">
          <SignOutButton className="font-semibold text-navy-800 hover:text-gold-600">Sign out</SignOutButton>
        </p>
      </div>
    </main>
  );
}
