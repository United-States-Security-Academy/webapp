import Image from 'next/image';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icon';
import { SignOutButton } from '@/features/auth/sign-out-button';

const SIDEBAR_LINKS: { label: string; href: string; icon: IconName }[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'monitor' },
  { label: 'Active Courses', href: '/dashboard#courses', icon: 'bookOpen' },
  { label: 'Certificates', href: '/dashboard#certificates', icon: 'award' },
  { label: 'Activity', href: '/dashboard#activity', icon: 'clock' },
  { label: 'Browse Courses', href: '/dashboard/courses', icon: 'search' },
  { label: 'My Profile', href: '/dashboard/profile', icon: 'instructor' },
];

export function DashboardSidebar({
  displayName,
  photoUrl,
  isProfileComplete,
}: {
  displayName: string;
  photoUrl: string | null;
  isProfileComplete: boolean;
}) {
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-navy-950 px-4 py-6 text-white print:hidden lg:flex">
      <Link href="/" className="flex items-center gap-3 px-2">
        <Image src="/ussalogo.png" alt="USSA seal" width={36} height={36} className="h-9 w-9" />
        <div>
          <p className="text-xs font-extrabold leading-tight">UNITED STATES</p>
          <p className="text-xs font-extrabold leading-tight">SECURITY ACADEMY</p>
        </div>
      </Link>

      <nav className="mt-10 flex flex-1 flex-col gap-1">
        {SIDEBAR_LINKS.map((sidebarLink) => (
          <Link
            key={sidebarLink.href}
            href={sidebarLink.href}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-gold-400"
          >
            <Icon name={sidebarLink.icon} className="h-4 w-4" />
            {sidebarLink.label}
            {sidebarLink.href === '/dashboard/profile' && !isProfileComplete && (
              <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-label="Profile incomplete" />
            )}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3 rounded-md bg-white/5 px-3 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold-500 text-xs font-bold text-navy-950">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials || 'U'
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white">{displayName}</p>
          <SignOutButton className="flex items-center gap-1 text-xs text-slate-400 hover:text-gold-400" />
        </div>
      </div>
    </aside>
  );
}
