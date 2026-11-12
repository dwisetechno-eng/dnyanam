"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export function Logo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { t } = useI18n();

  return (
    <Link
      href="/"
      aria-label={t("brand.name")}
      className={cn("group flex items-center gap-2.5", className)}
    >
      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-saffron-300 via-saffron-500 to-rose-600 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.7)] transition duration-300 group-hover:rotate-3 group-hover:scale-105">
        <BookOpen className="h-5 w-5 text-ink-950" strokeWidth={2.4} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-400 ring-2 ring-ink-900" />
      </span>
      {!compact && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="truncate font-display text-xl font-extrabold tracking-tight text-cream">
            {t("brand.name")}
          </span>
          <span className="mt-1 hidden max-w-[190px] truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35 sm:block">
            {t("brand.tagline")}
          </span>
        </span>
      )}
    </Link>
  );
}
