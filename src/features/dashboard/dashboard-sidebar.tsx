import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { DashboardNavLinks } from './dashboard-nav-links';
import { SignOutButton } from '@/features/auth/sign-out-button';
import { ThemeToggle } from '@/features/theme/theme-toggle';

type DashboardSidebarProps = { displayName: string; isProfileComplete: boolean };

export function DashboardSidebar(props: DashboardSidebarProps) {
  return (
    <aside className="theme-fixed sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-navy-950 px-4 py-6 text-white print:hidden lg:flex">
      <DashboardSidebarContent {...props} />
    </aside>
  );
}

// Shared by the desktop sidebar and the mobile slide-out menu, so both always show the same thing.
export function DashboardSidebarContent({ displayName, isProfileComplete }: DashboardSidebarProps) {
  return (
    <>
      <Link href="/" className="flex items-center gap-3 px-2">
        <Image src="/ussalogo.png" alt="USSA seal" width={36} height={36} className="h-9 w-9" />
        <div>
          <p className="text-xs font-extrabold leading-tight">UNITED STATES</p>
          <p className="text-xs font-extrabold leading-tight">SECURITY ACADEMY</p>
        </div>
      </Link>

      <DashboardNavLinks isProfileComplete={isProfileComplete} />

      <div className="mt-auto pt-8">
        <div className="rounded-2xl bg-gradient-to-br from-gold-500 to-gold-600 p-4 text-navy-950">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-950/10">
            <Icon name={isProfileComplete ? 'bookOpen' : 'shieldCheck'} className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-extrabold">{isProfileComplete ? 'Keep training' : 'Complete your profile'}</p>
          <p className="mt-1 text-xs text-navy-950/80">
            {isProfileComplete
              ? 'Explore more courses to grow your skills and earn certificates.'
              : 'Your profile details are required before certificates can be issued.'}
          </p>
          <Link
            href={isProfileComplete ? '/dashboard/courses' : '/dashboard/profile'}
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-navy-950 px-3 py-2 text-xs font-bold text-white hover:bg-navy-900"
          >
            {isProfileComplete ? 'Browse courses' : 'Complete now'} &rarr;
          </Link>
        </div>
      </div>

      <div className="mt-4">
        <ThemeToggle />
      </div>

      <div className="mt-2 flex items-center gap-3 rounded-md bg-white/5 px-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white">{displayName}</p>
        </div>
        <SignOutButton className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-gold-400">
          <Icon name="logOut" className="h-4 w-4" />
          <span className="sr-only">Sign out</span>
        </SignOutButton>
      </div>
    </>
  );
}
