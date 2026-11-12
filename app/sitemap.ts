import type { MetadataRoute } from "next";
import { getCatalogItems, getLanguages } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [items, languages] = await Promise.all([getCatalogItems({}), getLanguages()]);
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/browse"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/login"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/info/about"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/info/contact"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/info/help"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/info/returns"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/info/privacy"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/info/terms"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const languageRoutes: MetadataRoute.Sitemap = languages.map((language) => ({
    url: absoluteUrl(`/browse?language=${encodeURIComponent(language.code)}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const itemRoutes: MetadataRoute.Sitemap = items.map((item) => ({
    url: absoluteUrl(`/item/${item.slug}`),
    lastModified: item.created_at ? new Date(item.created_at) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...languageRoutes, ...itemRoutes];
}
