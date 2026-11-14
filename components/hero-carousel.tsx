"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
} from "lucide-react";
import { useCart } from "@/lib/cart/cart-provider";
import { useI18n } from "@/lib/i18n/provider";
import { useToast } from "@/lib/ui/toast-provider";
import type { CatalogItem } from "@/lib/types";
import { cn, discountPercent, formatPrice, typeIsDigital } from "@/lib/utils";

export function HeroCarousel({ items }: { items: CatalogItem[] }) {
  const { t } = useI18n();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const total = items.length;

  const go = useCallback(
    (direction: -1 | 1) => {
      setIndex((current) => (current + direction + total) % total);
    },
    [total],
  );

  useEffect(() => {
    if (total <= 1 || paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [total, paused]);

  if (!items.length) return null;

  const item = items[index] ?? items[0];
  const discount = discountPercent(item.price_paise, item.mrp_paise);
  const digital = typeIsDigital(item.item_type);

  function handleAdd() {
    addItem(item);
    toast(t("item.added"), "success");
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("home.heroKicker")}
      className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-ink-800 shadow-card sm:rounded-[2.25rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="absolute inset-0">
        <Image
          key={`bg-${item.id}`}
          src={item.cover_image_url}
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className="scale-110 object-cover opacity-25 blur-2xl"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/90 to-ink-900/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-hero-radial opacity-90" />
      </div>

      <div className="relative grid gap-8 px-5 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-10 lg:grid-cols-[1.18fr_0.82fr] lg:items-center lg:px-12 lg:py-14">
        <div key={item.id} className="max-w-2xl animate-fade-up">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              {t("home.heroKicker")}
            </span>
            <span className="badge border border-white/15 bg-white/[0.06] text-white/60">
              {t(`format.${item.item_type}`)}
            </span>
          </div>

          <h1 className="mt-4 text-balance text-3xl font-extrabold leading-[1.18] text-cream sm:text-4xl lg:text-[52px] lg:leading-[1.12]">
            {item.title}
          </h1>

          {item.subtitle_or_edition && (
            <p className="mt-2 text-sm font-semibold text-saffron-300/90 sm:text-base">
              {item.subtitle_or_edition}
            </p>
          )}

          <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-relaxed text-white/55 sm:text-[15px]">
            {item.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/45">
            <span className="font-semibold text-white/65">
              {t("item.author")} {item.author_or_publisher}
            </span>
            <span className="h-1 w-1 rounded-full bg-white/25" />
            <span className="uppercase tracking-wide">{item.language_code}</span>
            <span className="h-1 w-1 rounded-full bg-white/25" />
            <span>{t(`category.${item.category}`)}</span>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-x-3 gap-y-2">
            <span className="font-display text-2xl font-extrabold text-cream sm:text-3xl">
              {formatPrice(item.price_paise)}
            </span>
            {item.mrp_paise > item.price_paise && (
              <span className="pb-1 text-sm text-white/35 line-through">
                {formatPrice(item.mrp_paise)}
              </span>
            )}
            {discount > 0 && (
              <span className="mb-1 badge bg-rose-600 text-[#fff]">
                {t("card.off", { percent: discount })}
              </span>
            )}
            <span className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium text-white/40">
              <BookOpen className="h-3.5 w-3.5" />
              {digital ? t("item.digitalDelivery") : t("item.physicalDelivery")}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href={`/item/${item.slug}`} className="btn-primary">
              {t("home.explore")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button type="button" onClick={handleAdd} className="btn-secondary">
              <Plus className="h-4 w-4" />
              {t("item.addToCart")}
            </button>
          </div>
        </div>

        <div className="relative mx-auto hidden w-full max-w-[320px] lg:block">
          <div className="absolute inset-0 -z-10 rounded-full bg-saffron-400/20 blur-3xl" />
          <div className="absolute -right-4 top-6 h-24 w-24 rounded-full border border-saffron-400/25" />
          <div className="absolute -left-5 bottom-10 h-16 w-16 rounded-full border border-rose-400/20" />
          <Link
            href={`/item/${item.slug}`}
            className="group block rotate-2 transition duration-500 hover:rotate-0 hover:scale-[1.02]"
            key={`cover-${item.id}`}
          >
            <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/15 cover-shadow">
              <Image
                src={item.cover_image_url}
                alt={item.title}
                fill
                priority
                sizes="320px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-ink-950/25 via-transparent to-white/10" />
            </div>
          </Link>
        </div>
      </div>

      {total > 1 && (
        <>
          <div className="absolute bottom-4 right-4 flex items-center gap-2 sm:bottom-5 sm:right-6">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t("common.back")}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-ink-950/60 text-white/70 backdrop-blur transition hover:border-white/30 hover:text-cream"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t("home.viewAll")}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-ink-950/60 text-white/70 backdrop-blur transition hover:border-white/30 hover:text-cream"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 lg:left-12 lg:translate-x-0">
            {items.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setIndex(slideIndex)}
                aria-label={`${slideIndex + 1} / ${total}`}
                aria-current={slideIndex === index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  slideIndex === index
                    ? "w-7 bg-saffron-400"
                    : "w-1.5 bg-white/25 hover:bg-white/40",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
