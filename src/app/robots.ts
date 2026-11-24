import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/features/seo/site-seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Signed-in areas and one-off flows have nothing useful for search results.
      disallow: [
        '/admin',
        '/instructor',
        '/dashboard',
        '/api/',
        '/auth/',
        '/checkout/',
        '/sign-in',
        '/sign-up',
        '/forgot-password',
        '/post-sign-in',
        '/reset-password',
        '/two-factor',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
