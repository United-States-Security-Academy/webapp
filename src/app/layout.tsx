import type { Metadata, Viewport } from 'next';
import NextTopLoader from 'nextjs-toploader';
import { env } from '@/env';
import './globals.css';

const SITE_NAME = 'United States Security Academy';
const SITE_DESCRIPTION =
  'Online training and certification for security, law enforcement, corrections, military and safety professionals.';

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: { default: SITE_NAME, template: `%s | USSA` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: SITE_DESCRIPTION },
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
        <NextTopLoader color="#c6a15b" height={3} showSpinner={false} shadow="0 0 10px #c6a15b,0 0 5px #c6a15b" />
        {children}
      </body>
    </html>
  );
}
