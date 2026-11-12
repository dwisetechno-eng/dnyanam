import type { Locale } from "@/lib/types";

export const locales = ["mr", "hi", "en"] as const;

/** Marathi is the default application UI language. */
export const defaultLocale: Locale = "mr";

export const localeCookieName = "dnyanam.locale";
export const localeStorageKey = "dnyanam.locale";

export const localeNames: Record<Locale, string> = {
  mr: "मराठी",
  hi: "हिन्दी",
  en: "English",
};

export const htmlLang: Record<Locale, string> = {
  mr: "mr",
  hi: "hi",
  en: "en",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
