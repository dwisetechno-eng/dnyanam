import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  FileText,
  Languages,
  Sparkles,
  Tag,
} from "lucide-react";
import { ContentSlider } from "@/components/content-slider";
import { ProductActions } from "@/components/product-actions";
import {
  getCatalogItemBySlug,
  getLanguages,
  getRelatedItems,
} from "@/lib/catalog";
import { getServerI18n, getServerLocale } from "@/lib/i18n/server";
import { formatPrice, typeIsDigital } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [item, { locale }] = await Promise.all([
    getCatalogItemBySlug(slug),
    getServerLocale(),
  ]);
  const { t } = getServerI18n(locale);
  if (!item) return { title: t("errors.notFound") };

  const description =
    item.description?.slice(0, 155) ??
    `${item.title} — ${item.author_or_publisher}`;

  return {
    title: item.title_en ? `${item.title} (${item.title_en})` : item.title,
    description,
    openGraph: {
      title: item.title,
      description,
      images: [{ url: item.cover_image_url }],
      type: "article",
    },
  };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);

  const item = await getCatalogItemBySlug(slug);
  if (!item) notFound();

  const [related, languages] = await Promise.all([
    getRelatedItems(item, 10),
    getLanguages(),
  ]);

  const language = languages.find((entry) => entry.code === item.language_code);
  const languageName =
    locale === "mr"
      ? language?.name_mr
      : locale === "hi"
        ? language?.name_hi
        : language?.name_en;

  const digital = typeIsDigital(item.item_type);
  const details = [
    { label: t("item.language"), value: languageName ?? item.language_code },
    { label: t("item.publisher"), value: item.author_or_publisher },
    { label: t("item.format"), value: t(`format.${item.item_type}`) },
    { label: t("item.category"), value: t(`category.${item.category}`) },
    ...(item.isbn_or_issn
      ? [{ label: t("item.isbn"), value: item.isbn_or_issn }]
      : []),
    ...(item.subtitle_or_edition
      ? [{ label: t("item.edition"), value: item.subtitle_or_edition }]
      : []),
  ];

  return (
    <div className="container-page pb-10 pt-5">
      <nav className="flex items-center gap-1.5 text-[11px] font-semibold text-white/35">
        <Link href="/" className="transition hover:text-cream">
          {t("nav.home")}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/browse" className="transition hover:text-cream">
          {t("nav.browse")}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate text-white/55">{item.title}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-12">
        <div>
          <div className="relative mx-auto w-full max-w-[340px] lg:sticky lg:top-32 lg:max-w-none">
            <div className="absolute inset-8 -z-10 rounded-full bg-saffron-400/15 blur-3xl" />
            <div className="relative aspect-[2/3] overflow-hidden rounded-3xl border border-white/12 bg-ink-800 cover-shadow">
              <Image
                src={item.cover_image_url}
                alt={item.title}
                fill
                priority
                sizes="(max-width: 1024px) 340px, 360px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-ink-950/20 via-transparent to-white/10" />
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] text-white/45">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-saffron-400" />
                {digital ? t("format.digital") : t("format.physical")}
              </span>
              <span className="font-bold text-white/60">
                {formatPrice(item.price_paise)}
              </span>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge border border-saffron-400/30 bg-saffron-400/10 text-saffron-300">
              <Languages className="h-3 w-3" />
              {languageName ?? item.language_code}
            </span>
            <span className="badge border border-white/12 bg-white/[0.05] text-white/55">
              {t(`format.${item.item_type}`)}
            </span>
            <span className="badge border border-white/12 bg-white/[0.05] text-white/55">
              <Tag className="h-3 w-3" />
              {t(`category.${item.category}`)}
            </span>
            {item.is_latest_arrival && (
              <span className="badge bg-saffron-400 text-on-accent">
                {t("home.newBadge")}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-balance text-3xl font-extrabold leading-[1.18] text-cream sm:text-4xl lg:text-[44px]">
            {item.title}
          </h1>
          {item.title_en && (
            <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-white/30">
              {item.title_en}
            </p>
          )}
          {item.subtitle_or_edition && (
            <p className="mt-2 text-base font-semibold text-saffron-300/85">
              {item.subtitle_or_edition}
            </p>
          )}
          <p className="mt-3 text-sm text-white/50">
            {t("item.author")}{" "}
            <span className="font-bold text-white/75">{item.author_or_publisher}</span>
          </p>

          <ProductActions item={item} />

          <section className="mt-8 border-t border-white/10 pt-6">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-cream">
              <Sparkles className="h-4 w-4 text-saffron-400" />
              {t("item.synopsis")}
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-[1.85] text-white/55">
              {item.description || t("item.sampleUnavailable")}
            </p>
          </section>

          <section className="mt-8 border-t border-white/10 pt-6">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-cream">
              <FileText className="h-4 w-4 text-rose-400" />
              {t("item.details")}
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {details.map((detail) => (
                <div
                  key={detail.label}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3"
                >
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
                    {detail.label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-white/70">
                    {detail.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <Link
            href="/browse"
            className="mt-8 inline-flex items-center gap-1.5 text-xs font-bold text-white/45 transition hover:text-cream"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("nav.browse")}
          </Link>
        </div>
      </div>

      <div className="mt-8 border-t border-white/10">
        <ContentSlider
          title={t("item.related")}
          items={related}
          href={`/browse?language=${encodeURIComponent(item.language_code)}`}
          icon="book"
        />
      </div>
    </div>
  );
}
