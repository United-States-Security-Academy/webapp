import { redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getDashboardHref } from '@/features/auth/get-dashboard-href';

// The sign-in form can't know the caller's role client-side (it lives in our own `users`
// table, not Supabase auth metadata) — this route resolves it server-side, right after the
// session cookie is set, and sends each role to its own home.
export default async function PostSignInPage() {
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');
  if (authenticatedUser.isAwaitingAdminTwoFactor) redirect('/two-factor');

  redirect(getDashboardHref(authenticatedUser.role));
}
