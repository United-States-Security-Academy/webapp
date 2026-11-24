// USSA's social profiles, used by the footer and the organization's structured data (sameAs).
// A profile with an empty href is simply not shown anywhere.
// TODO(owner): supply the real profile URLs — Facebook, LinkedIn and YouTube are all still missing.
export const SOCIAL_LINKS: { label: string; initials: string; href: string }[] = [
  { label: 'Facebook', initials: 'f', href: '' },
  { label: 'LinkedIn', initials: 'in', href: '' },
  { label: 'YouTube', initials: '▶', href: '' },
];

export const ACTIVE_SOCIAL_LINKS = SOCIAL_LINKS.filter((socialLink) => socialLink.href);
