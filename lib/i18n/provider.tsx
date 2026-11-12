"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/types";
import {
  defaultLocale,
  htmlLang,
  isLocale,
  localeCookieName,
  localeStorageKey,
} from "@/lib/i18n/config";
import {
  getDictionary,
  translate,
  type Dictionary,
} from "@/lib/i18n/dictionaries";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  dict: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  initialLocale,
  hasLocaleCookie,
  children,
}: {
  initialLocale?: Locale;
  hasLocaleCookie?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(
    initialLocale ?? defaultLocale,
  );

  // Cookie is the server source of truth. localStorage is a graceful
  // fallback for the very first visit when no cookie has been written yet.
  useEffect(() => {
    if (hasLocaleCookie) return;
    try {
      const stored = window.localStorage.getItem(localeStorageKey);
      if (isLocale(stored) && stored !== locale) {
        setLocaleState(stored);
        document.cookie = `${localeCookieName}=${stored};path=/;max-age=31536000;SameSite=Lax`;
        document.documentElement.lang = htmlLang[stored];
        router.refresh();
      }
    } catch {
      // localStorage can be unavailable in private mode — ignore.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = htmlLang[locale];
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      if (!isLocale(next)) return;
      setLocaleState(next);
      try {
        window.localStorage.setItem(localeStorageKey, next);
      } catch {
        // ignore
      }
      document.cookie = `${localeCookieName}=${next};path=/;max-age=31536000;SameSite=Lax`;
      document.documentElement.lang = htmlLang[next];
      // Refresh server components (metadata, <html lang>) without losing
      // client state, the cart, or the current route.
      router.refresh();
    },
    [router],
  );

  const value = useMemo<I18nContextValue>(() => {
    const dict = getDictionary(locale);
    return {
      locale,
      setLocale,
      dict,
      t: (key, values) => translate(locale, key, values),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return context;
}

export function useT() {
  return useI18n().t;
}
