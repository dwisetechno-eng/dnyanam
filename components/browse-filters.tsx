"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import type { CatalogFilters, Language, Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

const collections: Array<{
  value: NonNullable<CatalogFilters["collection"]>;
  key: string;
}> = [
  { value: "all", key: "browse.collectionAll" },
  { value: "trending", key: "browse.collectionTrending" },
  { value: "latest", key: "browse.collectionLatest" },
  { value: "magazines", key: "browse.collectionMagazines" },
  { value: "ebooks", key: "browse.collectionEbooks" },
  { value: "physical", key: "browse.collectionPhysical" },
];

const sortOptions: Array<{
  value: NonNullable<CatalogFilters["sort"]>;
  key: string;
}> = [
  { value: "newest", key: "browse.sortNewest" },
  { value: "trending", key: "browse.sortTrending" },
  { value: "price-low", key: "browse.sortPriceLow" },
  { value: "price-high", key: "browse.sortPriceHigh" },
];

function languageName(language: Language, locale: Locale) {
  if (locale === "mr") return language.name_mr;
  if (locale === "hi") return language.name_hi;
  return language.name_en;
}

export function BrowseFilters({
  language,
  collection,
  type,
  sort,
  query,
  languages,
  total,
}: {
  language?: string;
  collection?: string;
  type?: string;
  sort?: string;
  query?: string;
  languages: Language[];
  total: number;
}) {
  const router = useRouter();
  const { t, locale } = useI18n();

  const currentCollection: string =
    type === "ebook"
      ? "ebooks"
      : type === "magazines"
        ? "magazines"
        : type === "physical"
          ? "physical"
          : (collection ?? "all");

  function buildParams(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const values: Record<string, string | undefined> = {
      lang: language,
      collection: collection,
      type: type,
      sort: sort,
      q: query,
      ...overrides,
    };
    for (const [key, value] of Object.entries(values)) {
      if (value && value !== "all") params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/browse?${qs}` : "/browse";
  }

  function collectionHref(value: string) {
    return buildParams({
      collection: value === "all" ? undefined : value,
      type: undefined,
    });
  }

  function onLanguageChange(value: string) {
    router.push(buildParams({ lang: value || undefined }), { scroll: false });
  }

  function onSortChange(value: string) {
    router.push(
      buildParams({ sort: value === "newest" ? undefined : value }),
      { scroll: false },
    );
  }

  const hasFilters = Boolean(language || collection || type || query || (sort && sort !== "newest"));

  return (
    <div className="mt-6 space-y-4">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {collections.map((entry) => (
          <Link
            key={entry.value}
            href={collectionHref(entry.value)}
            scroll={false}
            className={cn(
              "chip",
              currentCollection === entry.value && "chip-active",
            )}
          >
            {t(entry.key)}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 sm:p-4">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {t("browse.filters")}
        </span>

        <label className="relative">
          <span className="sr-only">{t("contentLanguage.label")}</span>
          <select
            value={language ?? ""}
            onChange={(event) => onLanguageChange(event.target.value)}
            className="cursor-pointer appearance-none rounded-full border border-white/10 bg-ink-900 px-3.5 py-2 pr-8 text-xs font-semibold text-white/70 outline-none transition hover:border-white/20 focus:border-saffron-400/50"
          >
            <option value="">{t("search.allLanguages")}</option>
            {languages.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {languageName(entry, locale)}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/35">
            ▾
          </span>
        </label>

        <label className="relative">
          <span className="sr-only">{t("browse.sort")}</span>
          <select
            value={sort ?? "newest"}
            onChange={(event) => onSortChange(event.target.value)}
            className="cursor-pointer appearance-none rounded-full border border-white/10 bg-ink-900 px-3.5 py-2 pr-8 text-xs font-semibold text-white/70 outline-none transition hover:border-white/20 focus:border-saffron-400/50"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.key)}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/35">
            ▾
          </span>
        </label>

        {hasFilters && (
          <Link
            href="/browse"
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-white/40 transition hover:text-rose-300"
          >
            <X className="h-3 w-3" />
            {t("browse.clear")}
          </Link>
        )}

        <span className="ml-auto text-[11px] font-bold text-white/45">
          {t("browse.results", { count: total })}
        </span>
      </div>
    </div>
  );
}
