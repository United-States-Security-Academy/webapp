import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { SignOutButton } from '@/features/auth/sign-out-button';
import { ThemeToggle } from '@/features/theme/theme-toggle';
import { ConsoleNavLinks, type ConsoleVariant } from './console-nav-links';

type ConsoleSidebarProps = { variant: ConsoleVariant; displayName: string; email: string };

export function ConsoleSidebar(props: ConsoleSidebarProps) {
  return (
    <aside className="theme-fixed sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-navy-950 px-4 py-6 text-white print:hidden lg:flex">
      <ConsoleSidebarContent {...props} />
    </aside>
  );
}

// Shared by the desktop sidebar and the mobile slide-out menu.
export function ConsoleSidebarContent({ variant, displayName, email }: ConsoleSidebarProps) {
  return (
    <>
      <Link href={variant === 'admin' ? '/admin' : '/instructor/courses'} className="flex items-center gap-3 px-2">
        <Image src="/ussalogo.png" alt="USSA seal" width={36} height={36} className="h-9 w-9" />
        <div>
          <p className="text-xs font-extrabold leading-tight">UNITED STATES</p>
          <p className="text-xs font-extrabold leading-tight">SECURITY ACADEMY</p>
          <p
            className={`mt-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              variant === 'admin' ? 'text-red-400' : 'text-gold-400'
            }`}
          >
            {variant === 'admin' ? 'Admin Console' : 'Instructor Portal'}
          </p>
        </div>
      </Link>

      <ConsoleNavLinks variant={variant} />

      <div className="mt-auto pt-8">
        <ThemeToggle />
        <div className="mt-2 flex items-center gap-3 rounded-md bg-white/5 px-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{displayName}</p>
            <p className="truncate text-[11px] text-slate-400">{email}</p>
          </div>
          <SignOutButton className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-gold-400">
            <Icon name="logOut" className="h-4 w-4" />
            <span className="sr-only">Sign out</span>
          </SignOutButton>
        </div>
      </div>
    </>
  );
}
