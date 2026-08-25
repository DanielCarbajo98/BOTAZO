import type { MetadataRoute } from 'next';
import { site } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Las áreas privadas y las de acceso por token no deben indexarse.
        disallow: ['/admin', '/admin/', '/api/', '/presupuesto/AL-', '/seguimiento'],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
