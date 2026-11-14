"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";
import { themeModes, type ThemeMode } from "@/lib/theme/config";
import { cn } from "@/lib/utils";

const icons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

/** Compact sun/moon switch for the header. */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useI18n();
  const { resolvedTheme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dark = !mounted || resolvedTheme === "dark";
  const label = t(dark ? "theme.toggleToLight" : "theme.toggleToDark");
  const Icon = dark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn("btn-ghost rounded-full p-2.5", className)}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

/** Full three-way picker used on the profile page. */
export function ThemePicker() {
  const { t } = useI18n();
  const { mode, setMode } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label={t("theme.label")}
      className="grid gap-2 sm:grid-cols-3"
    >
      {themeModes.map((option: ThemeMode) => {
        const Icon = icons[option];
        const active = mode === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setMode(option)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition sm:flex-col sm:items-start sm:gap-2",
              active
                ? "border-saffron-400/60 bg-saffron-400/10 text-cream"
                : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.06] hover:text-cream",
            )}
          >
            <span
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full border",
                active
                  ? "border-saffron-400/40 bg-saffron-400/15 text-saffron-300"
                  : "border-white/10 bg-white/[0.04] text-white/50",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-cream">
                {t(`theme.${option}`)}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-white/40">
                {t(`theme.${option}Hint`)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
