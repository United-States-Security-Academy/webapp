'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/icon';

type NavLink = { label: string; href: string; icon: IconName };
type NavGroup = { title: string; links: NavLink[] };
export type ConsoleVariant = 'admin' | 'instructor';

const ADMIN_GROUP: NavGroup = {
  title: 'Menu',
  links: [
    { label: 'Overview', href: '/admin', icon: 'monitor' },
    { label: 'Users', href: '/admin/users', icon: 'users' },
    { label: 'Discounts', href: '/admin/discounts', icon: 'target' },
  ],
};

const COURSE_GROUP: NavGroup = {
  title: 'Courses',
  links: [
    { label: 'Course Tools', href: '/instructor/courses', icon: 'bookOpen' },
    { label: 'New Course', href: '/instructor/courses/new', icon: 'plus' },
    { label: 'Analytics', href: '/instructor/analytics', icon: 'chart' },
  ],
};

const OTHER_GROUP: NavGroup = {
  title: 'Other',
  links: [
    { label: 'Student View', href: '/dashboard', icon: 'classroom' },
    { label: 'Website', href: '/', icon: 'globe' },
  ],
};

const NAV_GROUPS_BY_VARIANT: Record<ConsoleVariant, NavGroup[]> = {
  admin: [ADMIN_GROUP, COURSE_GROUP, OTHER_GROUP],
  instructor: [COURSE_GROUP, OTHER_GROUP],
};

// The most specific matching link wins, so /instructor/courses/new highlights "New Course"
// rather than also lighting up "Course Tools".
function findActiveHref(navGroups: NavGroup[], pathname: string): string | null {
  const matchingHrefs = navGroups
    .flatMap((navGroup) => navGroup.links.map((navLink) => navLink.href))
    .filter((href) => (href === '/admin' || href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)));
  return matchingHrefs.sort((a, b) => b.length - a.length)[0] ?? null;
}

export function ConsoleNavLinks({ variant }: { variant: ConsoleVariant }) {
  const pathname = usePathname();
  const navGroups = NAV_GROUPS_BY_VARIANT[variant];
  const activeHref = findActiveHref(navGroups, pathname);

  return (
    <nav className="mt-8 flex flex-col gap-6">
      {navGroups.map((navGroup) => (
        <div key={navGroup.title} className="flex flex-col gap-1">
          <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">{navGroup.title}</p>
          {navGroup.links.map((navLink) => {
            const isActive = navLink.href === activeHref;
            return (
              <Link
                key={navLink.href}
                href={navLink.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${
                  isActive ? 'bg-gold-500/15 text-gold-400' : 'text-slate-300 hover:bg-white/5 hover:text-gold-400'
                }`}
              >
                <Icon name={navLink.icon} className="h-4 w-4" />
                {navLink.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
