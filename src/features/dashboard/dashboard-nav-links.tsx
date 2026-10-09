'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/icon';

const SIDEBAR_LINKS: { label: string; href: string; icon: IconName }[] = [
  { label: 'Overview', href: '/dashboard', icon: 'monitor' },
  { label: 'My Courses', href: '/dashboard#courses', icon: 'bookOpen' },
  { label: 'Browse Courses', href: '/dashboard/courses', icon: 'search' },
  { label: 'Certificates', href: '/dashboard#certificates', icon: 'award' },
  { label: 'Activity', href: '/dashboard#activity', icon: 'clock' },
  { label: 'My Profile', href: '/dashboard/profile', icon: 'instructor' },
];

function isLinkActive(href: string, pathname: string): boolean {
  // Section anchors on the overview page never show as the current page — Overview does.
  if (href.includes('#')) return false;
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNavLinks({ isProfileComplete }: { isProfileComplete: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="mt-8 flex flex-col gap-1">
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Menu</p>
      {SIDEBAR_LINKS.map((sidebarLink) => {
        const isActive = isLinkActive(sidebarLink.href, pathname);
        return (
          <Link
            key={sidebarLink.href}
            href={sidebarLink.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${
              isActive ? 'bg-gold-500/15 text-gold-400' : 'text-slate-300 hover:bg-white/5 hover:text-gold-400'
            }`}
          >
            <Icon name={sidebarLink.icon} className="h-4 w-4" />
            {sidebarLink.label}
            {sidebarLink.href === '/dashboard/profile' && !isProfileComplete && (
              <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-label="Profile incomplete" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
