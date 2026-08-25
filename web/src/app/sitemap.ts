import type { MetadataRoute } from 'next';
import { site } from '@/config/site';

const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '', priority: 1, changeFrequency: 'weekly' },
  { path: '/presupuesto', priority: 0.95, changeFrequency: 'monthly' },
  { path: '/como-funciona', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/precios', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/trucos', priority: 0.75, changeFrequency: 'monthly' },
  { path: '/opiniones', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contacto', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/aviso-legal', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/privacidad', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/cookies', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/condiciones', priority: 0.2, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map((route) => ({
    url: `${site.url}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
