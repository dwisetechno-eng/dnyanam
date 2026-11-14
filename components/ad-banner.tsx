"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import type { AdBanner as AdBannerType } from "@/lib/types";

export function AdBanner({ banner }: { banner: AdBannerType }) {
  const { t } = useI18n();

  return (
    <Link
      href={banner.target_url}
      className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-ink-800 shadow-card sm:rounded-3xl"
    >
      <div className="relative aspect-[16/9] sm:aspect-[16/5.4]">
        <Image
          src={banner.desktop_image_url}
          alt={banner.title}
          fill
          sizes="(max-width: 1440px) 100vw, 1440px"
          className="object-cover transition duration-700 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/65 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 via-transparent to-transparent sm:hidden" />
      </div>

      <div className="absolute inset-0 flex flex-col justify-center gap-2 px-5 sm:gap-3 sm:px-10 lg:px-12">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-ink-950/55 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/55 backdrop-blur sm:text-[10px]">
          <Megaphone className="h-3 w-3 text-saffron-400" />
          {t("home.advertisement")}
        </span>
        <h2 className="max-w-xl text-balance text-lg font-extrabold leading-snug text-cream sm:text-2xl lg:text-3xl">
          {banner.title}
        </h2>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-saffron-400 px-3.5 py-2 text-[11px] font-extrabold text-on-accent shadow-lg transition group-hover:bg-saffron-300 sm:px-4 sm:text-xs">
          {t("home.adCta")}
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
