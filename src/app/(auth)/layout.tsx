import { NO_INDEX_METADATA } from '@/features/seo/site-seo';

// The auth pages are client components, so they can't export metadata themselves.
export const metadata = NO_INDEX_METADATA;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
