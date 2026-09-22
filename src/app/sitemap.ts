import { MetadataRoute } from 'next';
import { db } from '@/lib/db/repository';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://singularity.space.edu.in';

  // Static public routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/members`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  try {
    const activeMembers = await db.findActiveMembers();
    const memberRoutes: MetadataRoute.Sitemap = activeMembers.map((member) => ({
      url: `${baseUrl}/members/${member.slug}`,
      lastModified: new Date(member.updatedAt || member.createdAt),
      changeFrequency: 'weekly',
      priority: 0.85,
    }));

    return [...staticRoutes, ...memberRoutes];
  } catch {
    return staticRoutes;
  }
}
