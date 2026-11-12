"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Smartphone,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { BookCard } from "@/components/book-card";
import { useI18n } from "@/lib/i18n/provider";
import type { CatalogItem } from "@/lib/types";

const ICONS = {
  book: BookOpen,
  trending: TrendingUp,
  sparkles: Sparkles,
  newspaper: Newspaper,
  smartphone: Smartphone,
} as const;

export type SliderIcon = keyof typeof ICONS;

export function ContentSlider({
  title,
  subtitle,
  items,
  href,
  icon,
  accent = "saffron",
}: {
  title: string;
  subtitle?: string;
  items: CatalogItem[];
  href?: string;
  icon?: SliderIcon;
  accent?: "saffron" | "rose";
}) {
  const { t } = useI18n();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const Icon = icon ? ICONS[icon] : null;

  if (!items.length) return null;

  function scroll(direction: -1 | 1) {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollBy({
      left: direction * Math.max(280, node.clientWidth * 0.82),
      behavior: "smooth",
    });
  }

  return (
    <section className="py-6 sm:py-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2.5 text-xl font-extrabold text-cream sm:text-2xl">
            {Icon && (
              <span
                className={
                  accent === "rose"
                    ? "grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-400"
                    : "grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-saffron-400/15 text-saffron-400"
                }
              >
                <Icon className="h-4 w-4" />
              </span>
            )}
            <span className="truncate">{title}</span>
          </h2>
          {subtitle && (
            <p className="mt-1.5 truncate text-xs text-white/40 sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {href && (
            <Link
              href={href}
              className="group hidden items-center gap-1.5 text-xs font-bold text-saffron-400 transition hover:text-saffron-300 sm:flex"
            >
              {t("home.viewAll")}
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </Link>
          )}
          <div className="hidden items-center gap-1.5 md:flex">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label={t("common.back")}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-white/25 hover:text-cream"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label={t("home.viewAll")}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-white/25 hover:text-cream"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto scroll-smooth px-4 pb-3 sm:mx-0 sm:gap-4 sm:px-0"
      >
        {items.map((item) => (
          <BookCard
            key={item.id}
            item={item}
            className="w-[144px] shrink-0 snap-start sm:w-[164px] md:w-[178px] lg:w-[190px]"
          />
        ))}
        {href && (
          <Link
            href={href}
            className="flex w-[132px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-center text-[11px] font-bold text-white/45 transition hover:border-saffron-400/40 hover:bg-saffron-400/[0.04] hover:text-saffron-300 sm:hidden"
          >
            <ArrowRight className="h-5 w-5" />
            {t("home.viewAll")}
          </Link>
        )}
      </div>
    </section>
  );
}
