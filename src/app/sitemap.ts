import type { MetadataRoute } from 'next';

import { learnGuides } from '@/lib/learn';
import { absoluteUrl } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['/', '/learn', ...learnGuides.map((guide) => guide.href)];

  return routes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date('2026-04-05T00:00:00.000Z'),
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : route === '/learn' ? 0.8 : 0.7,
  }));
}
