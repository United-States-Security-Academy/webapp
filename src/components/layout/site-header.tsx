'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { SignOutButton } from '@/features/auth/sign-out-button';
import { getDashboardHref } from '@/features/auth/get-dashboard-href';
import type { AuthenticatedUser } from '@/features/auth/auth-types';

interface NavLink {
  label: string;
  href: string;
}

interface NavGroup {
  label: string;
  href: string;
  children: NavLink[];
}

type NavItem = NavLink | NavGroup;

function isNavGroup(navItem: NavItem): navItem is NavGroup {
  return 'children' in navItem;
}

const NAV_LINKS: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  {
    label: 'Programs',
    href: '/courses',
    children: [
      { label: 'Courses & Programs', href: '/courses' },
      { label: 'Certifications', href: '/certifications' },
      { label: 'Training Modes', href: '/training-modes' },
    ],
  },
  { label: 'Resources', href: '/resources' },
  { label: 'Contact Us', href: '/contact' },
];

export function SiteHeader({ authenticatedUser }: { authenticatedUser: AuthenticatedUser | null }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-navy-900 text-white">
      <div className="mx-auto hidden max-w-7xl items-center justify-between gap-3 px-4 py-2 text-xs sm:flex">
        <div className="flex items-center gap-4">
          <Link href="/contact" className="hover:text-gold-400">
            Contact Us
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Icon name="phone" className="h-3.5 w-3.5" />
            (832) 260-6092
          </span>
          <span className="flex items-center gap-1">
            <Icon name="mail" className="h-3.5 w-3.5" />
            info@ussa-academy.com
          </span>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <Image
              src="/ussalogo.png"
              alt="USSA seal"
              width={80}
              height={80}
              className="h-16 w-16 sm:h-20 sm:w-20 lg:h-14 lg:w-14"
            />
            <span>
              <span className="block text-base font-extrabold leading-tight tracking-wide sm:text-xl lg:text-sm">
                UNITED STATES
                <br />
                SECURITY ACADEMY
              </span>
              <span className="block text-[10px] font-semibold tracking-[0.2em] text-gold-400 sm:text-xs lg:text-[9px] lg:tracking-[0.15em]">
                TRAIN &middot; CERTIFY &middot; SERVE &middot; LEAD
              </span>
            </span>
          </Link>

          <nav className="hidden flex-1 justify-end lg:flex">
            <ul className="flex items-center gap-5 text-xs font-semibold tracking-wide">
              {NAV_LINKS.map((navItem) =>
                isNavGroup(navItem) ? (
                  <li key={navItem.label} className="group relative">
                    <Link href={navItem.href} className="flex items-center gap-1 py-2 hover:text-gold-400">
                      {navItem.label.toUpperCase()}
                      <Icon name="chevronDown" className="h-3 w-3" />
                    </Link>
                    <ul
                      className="invisible absolute left-0 top-full z-10 w-56 rounded-md border border-white/10 bg-navy-900 py-2 opacity-0
                        shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                    >
                      {navItem.children.map((childLink) => (
                        <li key={childLink.href}>
                          <Link href={childLink.href} className="block px-4 py-2 hover:bg-white/5 hover:text-gold-400">
                            {childLink.label.toUpperCase()}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : (
                  <li key={navItem.href}>
                    <Link href={navItem.href} className="hover:text-gold-400">
                      {navItem.label.toUpperCase()}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            {authenticatedUser ? (
              <div className="hidden items-center gap-4 lg:flex">
                <SignOutButton className="text-xs font-semibold tracking-wide text-white hover:text-gold-400" />
                <Link
                  href={getDashboardHref(authenticatedUser.role)}
                  className="rounded-md bg-gold-500 px-4 py-2 text-sm font-bold tracking-wide text-navy-950 hover:bg-gold-400"
                >
                  MY DASHBOARD
                </Link>
              </div>
            ) : (
              <div className="hidden items-center gap-3 lg:flex">
                <Link
                  href="/sign-in"
                  className="rounded-md border border-white/30 px-4 py-2 text-sm font-bold tracking-wide text-white hover:border-gold-400 hover:text-gold-400"
                >
                  LOG IN
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-md bg-gold-500 px-4 py-2 text-sm font-bold tracking-wide text-navy-950 hover:bg-gold-400"
                >
                  SIGN UP
                </Link>
              </div>
            )}

            <button
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((currentIsOpen) => !currentIsOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-white/20 lg:hidden"
            >
              <Icon name={isMobileMenuOpen ? 'close' : 'menu'} className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <nav className="border-t border-white/10 lg:hidden">
            <ul className="mx-auto flex max-w-7xl flex-col px-4 py-3 text-sm font-semibold tracking-wide">
              {NAV_LINKS.filter((navItem) => navItem.label !== 'Contact Us').map((navItem) =>
                isNavGroup(navItem) ? (
                  <li key={navItem.label}>
                    <Link
                      href={navItem.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block py-2 hover:text-gold-400"
                    >
                      {navItem.label.toUpperCase()}
                    </Link>
                    <ul className="flex flex-col border-l border-white/10 pl-4">
                      {navItem.children.map((childLink) => (
                        <li key={childLink.href}>
                          <Link
                            href={childLink.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block py-2 text-xs text-slate-300 hover:text-gold-400"
                          >
                            {childLink.label.toUpperCase()}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : (
                  <li key={navItem.href}>
                    <Link
                      href={navItem.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block py-2 hover:text-gold-400"
                    >
                      {navItem.label.toUpperCase()}
                    </Link>
                  </li>
                ),
              )}
              {authenticatedUser ? (
                <>
                  <li className="mt-2">
                    <Link
                      href={getDashboardHref(authenticatedUser.role)}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block rounded-md bg-gold-500 px-4 py-2.5 text-center text-sm font-bold tracking-wide text-navy-950 hover:bg-gold-400"
                    >
                      MY DASHBOARD
                    </Link>
                  </li>
                  <li className="mt-1 text-center">
                    <SignOutButton className="py-2 text-sm font-semibold text-slate-300 hover:text-gold-400" />
                  </li>
                </>
              ) : (
                <li className="mt-2 flex flex-col gap-2">
                  <Link
                    href="/sign-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block rounded-md border border-white/30 px-4 py-2.5 text-center text-sm font-bold tracking-wide text-white hover:border-gold-400 hover:text-gold-400"
                  >
                    LOG IN
                  </Link>
                  <Link
                    href="/sign-up"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block rounded-md bg-gold-500 px-4 py-2.5 text-center text-sm font-bold tracking-wide text-navy-950 hover:bg-gold-400"
                  >
                    SIGN UP
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
