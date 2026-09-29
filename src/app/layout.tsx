import type { Metadata, Viewport } from 'next';
import NextTopLoader from 'nextjs-toploader';
import './globals.css';

export const metadata: Metadata = {
  title: 'United States Security Academy',
  description: 'Training & certification for those who protect, serve & lead.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
