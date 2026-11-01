import type { Metadata } from 'next';

// The production address search engines should treat as the one true URL. Hard-coded rather than
// read from NEXT_PUBLIC_APP_URL so preview and local builds still point canonicals at the live site
// (the bare domain 308-redirects here).
export const SITE_URL = 'https://www.ussa-academy.com';
export const SITE_NAME = 'United States Security Academy';
export const SITE_TAGLINE = 'Professional Training, Operational Excellence';
export const DEFAULT_TITLE = 'Security, Law Enforcement & Corrections Training | United States Security Academy';
export const DEFAULT_DESCRIPTION =
  'Online and classroom training and certification for security officers, law enforcement, corrections, military and safety professionals. Enroll today.';

// Shared by every page's openGraph block. Next replaces a parent's openGraph object rather than
// merging it, so each page has to repeat these or it loses the site name and locale.
export const OPEN_GRAPH_DEFAULTS = { siteName: SITE_NAME, type: 'website', locale: 'en_US' } as const;

// Served by app/opengraph-image.tsx. Named explicitly because a page that sets its own openGraph
// block no longer inherits the file-based image.
export const DEFAULT_SHARE_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
};

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path === '/' ? '' : path}`;
}

// A public page's title, description, canonical URL and social cards in one call. Leave `title`
// out to use the site's default title (the homepage). `image` replaces the default share image.
export function buildPageMetadata({
  title,
  description,
  path,
  image,
}: {
  title?: string;
  description: string;
  path: string;
  image?: { url: string; alt: string };
}): Metadata {
  const socialTitle = title ?? DEFAULT_TITLE;
  const shareImage = image ?? DEFAULT_SHARE_IMAGE;
  return {
    ...(title && { title }),
    description,
    alternates: { canonical: path },
    openGraph: {
      ...OPEN_GRAPH_DEFAULTS,
      title: socialTitle,
      description,
      url: path,
      images: [shareImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [shareImage.url],
    },
  };
}

// For signed-in areas, auth screens and one-off flows: keep them out of search results.
export const NO_INDEX_METADATA: Metadata = { robots: { index: false, follow: false } };

// Search snippets cut off around 160 characters; trim long course summaries at a word boundary.
export function toMetaDescription(text: string, maxLength = 160): string {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLength) return singleLine;
  const cut = singleLine.slice(0, maxLength - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,.;:–—-]+$/, '')}…`;
}
