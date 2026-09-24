import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getStudentProfile, isProfileComplete } from '@/features/profile/profile-queries';
import { DashboardSidebar } from '@/features/dashboard/dashboard-sidebar';
import { SignOutButton } from '@/features/auth/sign-out-button';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');

  const profile = await getStudentProfile(authenticatedUser.userId);

  return (
    <div className="flex min-h-screen bg-slate-50 print:block">
      <DashboardSidebar
        displayName={profile?.legalName || authenticatedUser.displayName}
        photoUrl={profile?.photoUrl ?? null}
        isProfileComplete={isProfileComplete(profile)}
      />

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 print:hidden lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image src="/ussalogo.png" alt="USSA seal" width={36} height={36} className="h-9 w-9" />
            <p className="text-sm font-extrabold leading-tight text-navy-900">UNITED STATES SECURITY ACADEMY</p>
          </Link>
          <SignOutButton />
        </header>

        {children}
      </div>
    </div>
  );
}
