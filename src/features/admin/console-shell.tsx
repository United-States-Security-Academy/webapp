import Image from 'next/image';
import Link from 'next/link';
import { SidebarDrawer } from '@/components/layout/sidebar-drawer';
import { DashboardSearchForm } from '@/features/dashboard/dashboard-search-form';
import type { AuthenticatedUser } from '@/features/auth/auth-types';
import { ConsoleSidebar, ConsoleSidebarContent } from './console-sidebar';
import type { ConsoleVariant } from './console-nav-links';
import { getThemePreference } from '@/features/theme/get-theme-preference';
import { ThemeScope } from '@/features/theme/theme-scope';

// The sidebar + top bar frame shared by the admin console and the instructor portal, so moving
// between /admin and /instructor pages keeps the same navigation.
export async function ConsoleShell({ authenticatedUser, children }: { authenticatedUser: AuthenticatedUser; children: React.ReactNode }) {
  const variant: ConsoleVariant = authenticatedUser.role === 'admin' ? 'admin' : 'instructor';
  const { displayName, email } = authenticatedUser;
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const themePreference = await getThemePreference();

  return (
    <ThemeScope initialPreference={themePreference} className="flex min-h-screen bg-slate-100 dark:bg-[#0a1120] dark:text-slate-900">
      <ConsoleSidebar variant={variant} displayName={displayName} email={email} />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur print:hidden sm:px-6">
          <div className="lg:hidden">
            <SidebarDrawer label={variant === 'admin' ? 'Admin menu' : 'Instructor menu'}>
              <ConsoleSidebarContent variant={variant} displayName={displayName} email={email} />
            </SidebarDrawer>
          </div>
          <Link href={variant === 'admin' ? '/admin' : '/instructor/courses'} className="shrink-0 lg:hidden">
            <Image src="/ussalogo.png" alt="USSA seal" width={32} height={32} className="h-8 w-8" />
          </Link>
          {variant === 'admin' && (
            <div className="min-w-0 flex-1 sm:max-w-sm">
              <DashboardSearchForm targetPath="/admin/users" placeholder="Search users..." />
            </div>
          )}
          <div className="ml-auto hidden items-center gap-3 sm:flex">
            <div className="text-right">
              <p className="text-sm font-semibold text-navy-900">{displayName}</p>
              <p
                className={`text-[11px] font-semibold uppercase tracking-wide ${variant === 'admin' ? 'text-red-500' : 'text-gold-600'}`}
              >
                {variant === 'admin' ? 'Admin' : 'Instructor'}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-gold-400">
              {initials || 'U'}
            </span>
          </div>
        </header>

        {children}
      </div>
    </ThemeScope>
  );
}
