import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, SearchX, Sparkles } from "lucide-react";
import { BookCard } from "@/components/book-card";
import { SearchBox } from "@/components/search-box";
import { getCatalogItems } from "@/lib/catalog";
import { getServerI18n, getServerLocale } from "@/lib/i18n/server";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);
  return {
    title: q ? t("search.resultsFor", { query: q }) : t("search.title"),
    description: t("meta.description"),
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; lang?: string }>;
}) {
  const params = await searchParams;
  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);

  const query = typeof params.q === "string" ? params.q.trim() : "";
  const language =
    typeof params.lang === "string" && params.lang.trim()
      ? params.lang.trim()
      : undefined;

  const results = query
    ? await getCatalogItems({ query, language, sort: "trending" })
    : await getCatalogItems({ collection: "trending", language, sort: "trending" });

  return (
    <div className="container-page pb-12 pt-6 sm:pt-8">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-ink-800/70 px-6 py-8 sm:rounded-[2rem] sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-70" />
        <div className="relative">
          <span className="eyebrow">
            <Sparkles className="h-3.5 w-3.5" />
            {t("search.title")}
          </span>
          <h1 className="mt-3 text-balance text-3xl font-extrabold text-cream sm:text-4xl">
            {query
              ? t("search.resultsFor", { query })
              : t("home.trending")}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">
            {query ? t("browse.results", { count: results.length }) : t("home.trendingSub")}
          </p>
          <SearchBox initialQuery={query} language={language} />
        </div>
      </header>

      {results.length ? (
        <>
          {query && (
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
              {t("browse.results", { count: results.length })}
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-x-3.5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.map((item) => (
              <BookCard key={item.id} item={item} />
            ))}
          </div>
        </>
      ) : (
        <div className="surface mt-8 flex flex-col items-center px-6 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <SearchX className="h-6 w-6 text-white/35" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-cream">
            {t("search.noResults")}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/45">
            {t("search.noResultsBody")}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link href="/browse" className="btn-primary">
              <BookOpen className="h-4 w-4" />
              {t("nav.browse")}
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
