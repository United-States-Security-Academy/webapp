import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getStudentProfile, isProfileComplete } from '@/features/profile/profile-queries';
import { DashboardSidebar, DashboardSidebarContent } from '@/features/dashboard/dashboard-sidebar';
import { SidebarDrawer } from '@/components/layout/sidebar-drawer';
import { getThemePreference } from '@/features/theme/get-theme-preference';
import { ThemeScope } from '@/features/theme/theme-scope';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');
  if (authenticatedUser.isAwaitingAdminTwoFactor) redirect('/two-factor');

  const [profile, themePreference] = await Promise.all([getStudentProfile(authenticatedUser.userId), getThemePreference()]);

  const displayName = profile?.legalName || authenticatedUser.displayName;
  const hasCompleteProfile = isProfileComplete(profile);

  return (
    <ThemeScope initialPreference={themePreference} className="flex min-h-screen bg-slate-50 print:block dark:bg-[#0a1120] dark:text-slate-900">
      <DashboardSidebar displayName={displayName} isProfileComplete={hasCompleteProfile} />

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 print:hidden lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image src="/ussalogo.png" alt="USSA seal" width={36} height={36} className="h-9 w-9" />
            <p className="text-sm font-extrabold leading-tight text-navy-900">UNITED STATES SECURITY ACADEMY</p>
          </Link>
          <SidebarDrawer label="Dashboard menu">
            <DashboardSidebarContent displayName={displayName} isProfileComplete={hasCompleteProfile} />
          </SidebarDrawer>
        </header>

        {children}
      </div>
    </ThemeScope>
  );
}
