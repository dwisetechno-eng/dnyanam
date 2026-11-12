import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Compass, SearchX } from "lucide-react";
import { BookCard } from "@/components/book-card";
import { BrowseFilters } from "@/components/browse-filters";
import { getCatalogItems, getLanguages } from "@/lib/catalog";
import { getServerI18n, getServerLocale } from "@/lib/i18n/server";
import type { CatalogFilters } from "@/lib/types";

const allowedTypes = ["all", "physical", "ebook", "magazines"] as const;
const allowedCollections = [
  "all",
  "trending",
  "latest",
  "magazines",
  "ebooks",
  "physical",
] as const;
const allowedSorts = ["newest", "price-low", "price-high", "trending"] as const;

function pick<T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
): T[number] | undefined {
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T[number])
    : undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);
  return {
    title: t("browse.title"),
    description: t("browse.subtitle"),
  };
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);

  const single = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : undefined;

  const language = single(params.lang)?.slice(0, 5) || undefined;
  const query = single(params.q)?.trim() || undefined;
  const filters: CatalogFilters = {
    language,
    type: pick(single(params.type), allowedTypes),
    collection: pick(single(params.collection), allowedCollections),
    sort: pick(single(params.sort), allowedSorts),
    query,
  };

  const [items, languages] = await Promise.all([
    getCatalogItems(filters),
    getLanguages(),
  ]);

  return (
    <div className="container-page pb-12 pt-6 sm:pt-8">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-ink-800/70 px-6 py-8 sm:rounded-[2rem] sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-70" />
        <div className="relative max-w-2xl">
          <span className="eyebrow">
            <Compass className="h-3.5 w-3.5" />
            {t("footer.madeFor")}
          </span>
          <h1 className="mt-3 text-balance text-3xl font-extrabold text-cream sm:text-4xl">
            {t("browse.title")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            {query
              ? t("search.resultsFor", { query })
              : t("browse.subtitle")}
          </p>
        </div>
      </header>

      <BrowseFilters
        language={language}
        collection={filters.collection}
        type={filters.type}
        sort={filters.sort}
        query={query}
        languages={languages}
        total={items.length}
      />

      {items.length ? (
        <div className="mt-8 grid grid-cols-2 gap-x-3.5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) => (
            <BookCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="surface mt-8 flex flex-col items-center px-6 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <SearchX className="h-6 w-6 text-white/35" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-cream">
            {t("browse.empty")}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/45">
            {t("browse.emptyBody")}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link href="/browse" className="btn-primary">
              <BookOpen className="h-4 w-4" />
              {t("browse.clear")}
            </Link>
            <Link href="/" className="btn-secondary">
              {t("nav.home")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
