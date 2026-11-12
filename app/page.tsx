import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Languages,
} from "lucide-react";
import { AdBanner } from "@/components/ad-banner";
import { ContentSlider } from "@/components/content-slider";
import { HeroCarousel } from "@/components/hero-carousel";
import { getStorefront } from "@/lib/catalog";
import { getServerI18n, getServerLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);
  const params = await searchParams;
  const languageCode =
    typeof params.lang === "string" && params.lang.trim()
      ? params.lang.trim()
      : undefined;

  const storefront = await getStorefront(languageCode);
  const hasAny =
    storefront.heroItems.length +
      storefront.trending.length +
      storefront.latest.length +
      storefront.magazines.length +
      storefront.ebooks.length >
    0;

  const midOne = storefront.banners.find(
    (banner) => banner.slot_position === "mid_feed_1",
  );
  const midTwo = storefront.banners.find(
    (banner) => banner.slot_position === "mid_feed_2",
  );

  const withLanguage = (href: string) => {
    if (!languageCode) return href;
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}lang=${encodeURIComponent(languageCode)}`;
  };

  return (
    <div className="container-page pb-10 pt-4 sm:pt-6">
      {hasAny ? (
        <>
          <HeroCarousel items={storefront.heroItems} />

          <ContentSlider
            title={t("home.trending")}
            subtitle={t("home.trendingSub")}
            items={storefront.trending}
            href={withLanguage("/browse?collection=trending")}
            icon="trending"
          />

          {midOne && (
            <div className="py-4">
              <AdBanner banner={midOne} />
            </div>
          )}

          <ContentSlider
            title={t("home.latest")}
            subtitle={t("home.latestSub")}
            items={storefront.latest}
            href={withLanguage("/browse?collection=latest")}
            icon="sparkles"
            accent="rose"
          />

          <ContentSlider
            title={t("home.magazines")}
            subtitle={t("home.magazinesSub")}
            items={storefront.magazines}
            href={withLanguage("/browse?collection=magazines")}
            icon="newspaper"
          />

          {midTwo && (
            <div className="py-4">
              <AdBanner banner={midTwo} />
            </div>
          )}

          <ContentSlider
            title={t("home.ebooks")}
            subtitle={t("home.ebooksSub")}
            items={storefront.ebooks}
            href={withLanguage("/browse?type=ebook")}
            icon="smartphone"
            accent="rose"
          />

          <section className="deal-glow mt-8 overflow-hidden rounded-[1.75rem] border border-white/10 bg-ink-800/80 px-6 py-10 sm:rounded-[2rem] sm:px-10 sm:py-12">
            <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-xl">
                <span className="eyebrow">
                  <Languages className="h-3.5 w-3.5" />
                  {t("footer.madeFor")}
                </span>
                <h2 className="mt-3 text-balance text-2xl font-extrabold text-cream sm:text-3xl">
                  {t("home.browseAll")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  {t("browse.subtitle")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href={withLanguage("/browse")} className="btn-primary">
                  <Compass className="h-4 w-4" />
                  {t("home.browseAll")}
                </Link>
                <Link href="/library" className="btn-secondary">
                  <BookOpen className="h-4 w-4" />
                  {t("nav.library")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="surface mt-6 flex flex-col items-center px-6 py-20 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-3xl border border-saffron-400/25 bg-saffron-400/10">
            <BookOpen className="h-7 w-7 text-saffron-400" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold text-cream">
            {t("home.emptyTitle")}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/50">
            {t("home.emptyBody")}
          </p>
          <Link href="/browse" className="btn-primary mt-6">
            {t("home.browseAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}
    </div>
  );
}
