import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

const SOCIAL_LINKS = [
  { label: 'Facebook', initials: 'f', href: '#' },
  { label: 'LinkedIn', initials: 'in', href: '#' },
  { label: 'YouTube', initials: '▶', href: '#' },
];

export function SiteFooter() {
  return (
    <footer className="bg-navy-900 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/ussalogo.png" alt="USSA seal" width={64} height={64} className="h-16 w-16 shrink-0" />
            <div>
              <p className="text-sm font-extrabold leading-tight">
                UNITED STATES
                <br />
                SECURITY ACADEMY
              </p>
              <p className="text-[10px] font-semibold tracking-[0.15em] text-gold-400">TRAIN &middot; CERTIFY &middot; SERVE &middot; LEAD</p>
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-300">
          We are committed to providing high-quality training and certification
          programs that support the men and women who protect, serve, and lead
          our communities and nation.
        </div>

        <div id="contact">
          <h3 className="text-sm font-bold tracking-wide text-gold-400">CONTACT US</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <Icon name="phone" className="h-4 w-4" /> (832) 260-6092
            </li>
            <li className="flex items-center gap-2">
              <Icon name="mail" className="h-4 w-4" /> info@ussa-academy.com
            </li>
            <li className="flex items-center gap-2">
              <Icon name="globe" className="h-4 w-4" /> www.ussa-academy.com
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold tracking-wide text-gold-400">FOLLOW US</h3>
          <div className="mt-3 flex gap-2">
            {SOCIAL_LINKS.map((socialLink) => (
              <Link
                key={socialLink.label}
                href={socialLink.href}
                aria-label={socialLink.label}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold hover:bg-gold-500 hover:text-navy-900"
              >
                {socialLink.initials}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} United States Security Academy. All Rights Reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-gold-400">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-gold-400">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
