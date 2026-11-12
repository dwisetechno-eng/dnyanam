"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Languages, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import type { Language, Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

function displayName(language: Language, locale: Locale) {
  if (locale === "mr") return language.name_mr;
  if (locale === "hi") return language.name_hi;
  return language.name_en;
}

export function LanguageRibbon({ languages }: { languages: Language[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();

  if (!languages.length) return null;
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth")
  ) {
    return null;
  }

  const isFilterPage =
    pathname === "/" || pathname === "/browse" || pathname === "/search";
  const active = searchParams.get("lang") ?? "";
  const basePath = isFilterPage ? pathname : "/browse";

  function hrefFor(code?: string) {
    const params = isFilterPage
      ? new URLSearchParams(searchParams.toString())
      : new URLSearchParams();
    if (code) params.set("lang", code);
    else params.delete("lang");
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  return (
    <div className="border-b border-white/[0.06] bg-ink-950/40">
      <div className="container-page flex items-center gap-3 py-2.5">
        <span className="hidden shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 sm:flex">
          <Languages className="h-3.5 w-3.5 text-saffron-400/80" />
          {t("contentLanguage.label")}
        </span>
        <div className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto scroll-smooth">
          <Link
            href={hrefFor()}
            scroll={false}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition",
              isFilterPage && !active
                ? "border-saffron-400/50 bg-saffron-400/15 text-saffron-300"
                : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-cream",
            )}
          >
            {t("contentLanguage.all")}
          </Link>
          {languages.map((language) => (
            <Link
              key={language.code}
              href={hrefFor(language.code)}
              scroll={false}
              lang={language.code}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition",
                isFilterPage && active === language.code
                  ? "border-saffron-400/50 bg-saffron-400/15 text-saffron-300"
                  : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-cream",
              )}
            >
              {displayName(language, locale)}
            </Link>
          ))}
        </div>
        <span className="hidden shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25 xl:flex">
          <Sparkles className="h-3 w-3 text-rose-400/70" />
          {t("footer.madeFor")}
        </span>
      </div>
    </div>
  );
}
