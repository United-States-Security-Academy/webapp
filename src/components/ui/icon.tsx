import type { SVGProps } from 'react';

export const ICON_NAME = {
  monitor: 'monitor',
  classroom: 'classroom',
  instructor: 'instructor',
  military: 'military',
  lawEnforcement: 'lawEnforcement',
  corrections: 'corrections',
  security: 'security',
  safety: 'safety',
  target: 'target',
  shieldCheck: 'shieldCheck',
  document: 'document',
  chart: 'chart',
  globe: 'globe',
  phone: 'phone',
  mail: 'mail',
  menu: 'menu',
  close: 'close',
  quote: 'quote',
  users: 'users',
  award: 'award',
  mapPin: 'mapPin',
  clock: 'clock',
  chevronDown: 'chevronDown',
  bookOpen: 'bookOpen',
  checkCircle: 'checkCircle',
  lock: 'lock',
  play: 'play',
  pause: 'pause',
  search: 'search',
  logOut: 'logOut',
  download: 'download',
  minus: 'minus',
  plus: 'plus',
  eye: 'eye',
  eyeOff: 'eyeOff',
} as const;

export type IconName = (typeof ICON_NAME)[keyof typeof ICON_NAME];

const ICON_PATHS: Record<IconName, string> = {
  monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
  classroom: 'M4 19V9l8-4 8 4v10M4 19h16M9 19v-6h6v6',
  instructor: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-4 3.5-6 8-6s8 2 8 6',
  military: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',
  lawEnforcement: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9.5 12l1.8 1.8L15 10',
  corrections: 'M6 21V9l6-4 6 4v12M9 21v-6h6v6M4 9h16',
  security: 'M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z',
  safety: 'M12 3l8 3v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6zM12 8v5M9.5 10.5h5',
  target: 'M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0M12 12m-5 0a5 5 0 1010 0 5 5 0 10-10 0M12 12m-1 0a1 1 0 102 0 1 1 0 10-2 0',
  shieldCheck: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9 12l2 2 4-4',
  document: 'M6 3h9l3 3v15H6zM15 3v3h3M9 12h6M9 16h6',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2C9.5 21 3 14.5 3 6a2 2 0 012-2z',
  mail: 'M4 5h16v14H4zM4 6l8 7 8-7',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  quote: 'M7 7h4v6l-3 5H5l2.5-5H7V7zM15 7h4v6l-3 5h-3l2.5-5H15V7z',
  users: 'M9 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 8.5a3 3 0 110-6M16 20c0-2.6-1.4-4.6-3.5-5.4M21 20c0-2.4-1.2-4.2-3-5',
  award: 'M12 3l2 4 4 .5-3 3 1 4.5-4-2-4 2 1-4.5-3-3 4-.5z',
  mapPin: 'M12 21s7-6.5 7-11.5A7 7 0 105 9.5C5 14.5 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3.5 2',
  chevronDown: 'M6 9l6 6 6-6',
  bookOpen: 'M12 6c-1.5-1.3-4-2-7-2v13c3 0 5.5.7 7 2 1.5-1.3 4-2 7-2V4c-3 0-5.5.7-7 2zM12 6v13',
  checkCircle: 'M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0M9 12l2 2 4-4',
  lock: 'M7 10V7a5 5 0 0110 0v3M5 10h14v10H5zM12 15v2',
  play: 'M8 5l12 7-12 7z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
  search: 'M19 11a8 8 0 11-16 0 8 8 0 0116 0zM17 17l5 5',
  logOut: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  minus: 'M5 12h14',
  plus: 'M12 5v14M5 12h14',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z M12 15a3 3 0 100-6 3 3 0 000 6z',
  eyeOff: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z M12 15a3 3 0 100-6 3 3 0 000 6z M3 3l18 18',
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
