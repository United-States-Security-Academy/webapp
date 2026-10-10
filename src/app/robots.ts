import type { MetadataRoute } from 'next';
import { env } from '@/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Signed-in areas and one-off flows have nothing useful for search results.
      disallow: ['/admin', '/instructor', '/dashboard', '/api/', '/auth/', '/checkout/', '/post-sign-in', '/reset-password'],
    },
    sitemap: `${env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  };
}
