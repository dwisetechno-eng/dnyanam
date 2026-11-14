"use client";

import { Check, ChevronDown, Globe2, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { localeNames, locales } from "@/lib/i18n/config";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  variant = "pill",
  className,
}: {
  variant?: "pill" | "list";
  className?: string;
}) {
  const { locale, setLocale, t } = useI18n();

  if (variant === "list") {
    return (
      <div className={cn("space-y-1", className)}>
        <p className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
          <Languages className="h-3 w-3" />
          {t("uiLanguage.label")}
        </p>
        {locales.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              locale === code
                ? "bg-saffron-400/15 text-saffron-300"
                : "text-white/60 hover:bg-white/[0.06] hover:text-cream",
            )}
          >
            <span className="flex items-center gap-2">
              <Globe2 className="h-4 w-4" />
              {localeNames[code]}
            </span>
            {locale === code && <Check className="h-4 w-4" />}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 bg-white/[0.055] p-1 backdrop-blur",
        className,
      )}
      role="group"
      aria-label={t("uiLanguage.label")}
    >
      {locales.map((code: Locale) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={cn(
            "min-w-[52px] rounded-full px-2.5 py-1.5 text-[12px] font-bold leading-none transition sm:min-w-[58px]",
            locale === code
              ? "bg-gradient-to-r from-saffron-300 to-saffron-500 text-on-accent shadow-[0_6px_16px_-8px_rgba(245,158,11,0.9)]"
              : "text-white/55 hover:text-cream",
          )}
        >
          {t(`uiLanguage.short.${code}`)}
        </button>
      ))}
    </div>
  );
}

export function LanguageSwitcherMenu() {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <span className="flex items-center gap-2 text-[11px] font-semibold text-white/45">
        <Languages className="h-3.5 w-3.5" />
        {t("uiLanguage.label")}
      </span>
      <LanguageSwitcher />
    </div>
  );
}

export function LanguageChevron() {
  return <ChevronDown className="h-3 w-3 opacity-40" />;
}
