import "server-only";

import { demoBanners, demoCatalog, demoLanguages } from "@/lib/demo";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  AdBanner,
  CatalogFilters,
  CatalogItem,
  Language,
  Storefront,
} from "@/lib/types";
import { isEbook, isMagazine, isPhysical } from "@/lib/utils";

function byNewest(a: CatalogItem, b: CatalogItem) {
  return +new Date(b.created_at) - +new Date(a.created_at);
}

function sortItems(items: CatalogItem[], sort?: CatalogFilters["sort"]) {
  const copy = [...items];
  switch (sort) {
    case "price-low":
      return copy.sort((a, b) => a.price_paise - b.price_paise);
    case "price-high":
      return copy.sort((a, b) => b.price_paise - a.price_paise);
    case "trending":
      return copy.sort(
        (a, b) => Number(b.is_trending) - Number(a.is_trending) || byNewest(a, b),
      );
    default:
      return copy.sort(byNewest);
  }
}

function filterDemo(items: CatalogItem[], filters: CatalogFilters) {
  let result = items.filter((item) => item.is_published);

  if (filters.language) {
    result = result.filter((item) => item.language_code === filters.language);
  }

  if (filters.type && filters.type !== "all") {
    if (filters.type === "ebook") result = result.filter(isEbook);
    if (filters.type === "magazines") result = result.filter(isMagazine);
    if (filters.type === "physical") result = result.filter(isPhysical);
  }

  switch (filters.collection) {
    case "trending":
      result = result.filter((item) => item.is_trending);
      break;
    case "latest":
      result = result.filter((item) => item.is_latest_arrival);
      break;
    case "magazines":
      result = result.filter(isMagazine);
      break;
    case "ebooks":
      result = result.filter(isEbook);
      break;
    case "physical":
      result = result.filter(isPhysical);
      break;
    default:
      break;
  }

  const query = filters.query?.trim().toLowerCase();
  if (query) {
    result = result.filter((item) =>
      [item.title, item.title_en, item.author_or_publisher, item.isbn_or_issn]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }

  return sortItems(result, filters.sort);
}

function sanitizeSearch(query: string) {
  // PostgREST `.or()` uses commas and parentheses as syntax.
  return query.replace(/[,()%]/g, " ").trim();
}

export async function getLanguages(): Promise<Language[]> {
  if (isSupabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("languages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!error && data?.length) return data as Language[];
    }
  }
  return demoLanguages.filter((language) => language.is_active);
}

export async function getStorefront(
  languageCode?: string,
): Promise<Storefront> {
  let items: CatalogItem[] | null = null;
  let banners: AdBanner[] | null = null;
  let languages: Language[] | null = null;
  let source: Storefront["source"] = "demo";

  if (isSupabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      let catalogQuery = supabase
        .from("catalog_items")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (languageCode) {
        catalogQuery = catalogQuery.eq("language_code", languageCode);
      }

      const [itemsResult, bannersResult, languagesResult] = await Promise.all([
        catalogQuery,
        supabase
          .from("ad_banners")
          .select("*")
          .eq("is_active", true)
          .order("priority", { ascending: false }),
        supabase
          .from("languages")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (!itemsResult.error && itemsResult.data) {
        items = itemsResult.data as CatalogItem[];
        source = "supabase";
      } else if (itemsResult.error) {
        console.error("[catalog] storefront query failed:", itemsResult.error.message);
      }
      if (!bannersResult.error && bannersResult.data) {
        banners = bannersResult.data as AdBanner[];
      }
      if (!languagesResult.error && languagesResult.data?.length) {
        languages = languagesResult.data as Language[];
      }
    }
  }

  // Apply the content-language filter in both Supabase and demo mode. The
  // Supabase query is already scoped, but filtering again keeps the rails
  // consistent if a caller passes an unfiltered result set.
  const all = (items ?? demoCatalog.filter((item) => item.is_published)).filter(
    (item) => !languageCode || item.language_code === languageCode,
  );
  const now = Date.now();

  const activeBanners = (banners ?? demoBanners).filter((banner) => {
    if (!banner.is_active) return false;
    const starts = +new Date(banner.starts_at);
    const ends = banner.ends_at ? +new Date(banner.ends_at) : null;
    const inWindow = starts <= now && (!ends || ends > now);
    const matchesLanguage =
      !languageCode || !banner.language_code || banner.language_code === languageCode;
    return inWindow && matchesLanguage;
  });

  const trending = all.filter((item) => item.is_trending).slice(0, 12);
  const latest = all.filter((item) => item.is_latest_arrival).slice(0, 12);
  const magazines = all.filter(isMagazine).slice(0, 12);
  const ebooks = all.filter(isEbook).slice(0, 12);
  const heroItems = all.filter((item) => item.is_hero_featured).slice(0, 4);

  return {
    heroItems: heroItems.length ? heroItems : trending.slice(0, 4),
    trending,
    latest,
    magazines,
    ebooks,
    banners: activeBanners,
    languages: languages ?? (await getLanguages()),
    source,
  };
}

export async function getCatalogItems(
  filters: CatalogFilters = {},
): Promise<CatalogItem[]> {
  if (isSupabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      let query = supabase
        .from("catalog_items")
        .select("*")
        .eq("is_published", true);

      if (filters.language) {
        query = query.eq("language_code", filters.language);
      }

      if (filters.type === "ebook") {
        query = query.eq("item_type", "ebook");
      } else if (filters.type === "physical") {
        query = query.in("item_type", ["physical_book", "magazine_print"]);
      } else if (filters.type === "magazines") {
        query = query.in("item_type", ["magazine_digital", "magazine_print"]);
      }

      if (filters.collection === "trending") {
        query = query.eq("is_trending", true);
      } else if (filters.collection === "latest") {
        query = query.eq("is_latest_arrival", true);
      } else if (filters.collection === "magazines") {
        query = query.in("item_type", ["magazine_digital", "magazine_print"]);
      } else if (filters.collection === "ebooks") {
        query = query.eq("item_type", "ebook");
      } else if (filters.collection === "physical") {
        query = query.in("item_type", ["physical_book", "magazine_print"]);
      }

      const search = filters.query ? sanitizeSearch(filters.query) : "";
      if (search) {
        query = query.or(
          `title.ilike.%${search}%,title_en.ilike.%${search}%,author_or_publisher.ilike.%${search}%,isbn_or_issn.ilike.%${search}%`,
        );
      }

      switch (filters.sort) {
        case "price-low":
          query = query.order("price_paise", { ascending: true });
          break;
        case "price-high":
          query = query.order("price_paise", { ascending: false });
          break;
        case "trending":
          query = query
            .order("is_trending", { ascending: false })
            .order("created_at", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query.limit(120);
      if (!error && data) return data as CatalogItem[];
      if (error) {
        console.error("[catalog] browse query failed:", error.message);
      }
    }
  }

  return filterDemo(demoCatalog, filters);
}

export async function getCatalogItemBySlug(
  slug: string,
): Promise<CatalogItem | null> {
  if (isSupabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("catalog_items")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (!error) return (data as CatalogItem | null) ?? null;
      console.error("[catalog] item query failed:", error.message);
    }
  }

  return (
    demoCatalog.find((item) => item.slug === slug && item.is_published) ?? null
  );
}

export async function getRelatedItems(
  item: CatalogItem,
  limit = 8,
): Promise<CatalogItem[]> {
  if (isSupabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("catalog_items")
        .select("*")
        .eq("is_published", true)
        .eq("language_code", item.language_code)
        .neq("id", item.id)
        .limit(limit);
      if (!error && data?.length) return data as CatalogItem[];
    }
  }

  return demoCatalog
    .filter(
      (candidate) =>
        candidate.id !== item.id &&
        candidate.is_published &&
        (candidate.language_code === item.language_code ||
          candidate.category === item.category),
    )
    .slice(0, limit);
}

export async function searchCatalog(query: string): Promise<CatalogItem[]> {
  return getCatalogItems({ query, sort: "newest" });
}
