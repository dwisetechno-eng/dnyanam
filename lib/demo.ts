import catalogData from "@/data/catalog.json";
import bannersData from "@/data/banners.json";
import languagesData from "@/data/languages.json";
import type { AdBanner, CatalogItem, Language } from "@/lib/types";

/**
 * Demo-mode data. Used whenever Supabase is not configured (or temporarily
 * unreachable) so the storefront always renders a rich, explorable catalogue.
 * The same JSON files generate the SQL seed data.
 */
export const demoCatalog = [...(catalogData as unknown as CatalogItem[])].sort(
  (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
);

export const demoLanguages = languagesData as Language[];

export const demoBanners = (
  bannersData as unknown as AdBanner[]
).sort((a, b) => b.priority - a.priority);
