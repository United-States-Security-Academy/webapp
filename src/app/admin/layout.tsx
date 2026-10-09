import { redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { ConsoleShell } from '@/features/admin/console-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');
  if (authenticatedUser.role !== 'admin') redirect('/sign-in');

  return <ConsoleShell authenticatedUser={authenticatedUser}>{children}</ConsoleShell>;
}
