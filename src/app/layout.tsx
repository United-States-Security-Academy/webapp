import type { Metadata, Viewport } from 'next';
import NextTopLoader from 'nextjs-toploader';
import { JsonLd } from '@/components/seo/json-ld';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, OPEN_GRAPH_DEFAULTS, SITE_NAME, SITE_URL } from '@/features/seo/site-seo';
import { buildOrganizationStructuredData } from '@/features/seo/structured-data';
import './globals.css';

// The share image comes from app/opengraph-image.tsx.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: `%s | ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { ...OPEN_GRAPH_DEFAULTS, title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
  twitter: { card: 'summary_large_image', title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b1e3d',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <JsonLd data={buildOrganizationStructuredData()} />
        <NextTopLoader color="#c6a15b" height={3} showSpinner={false} shadow="0 0 10px #c6a15b,0 0 5px #c6a15b" />
        {children}
      </body>
    </html>
  );
}
