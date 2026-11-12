import "server-only";

import { cookies } from "next/headers";
import type { Locale } from "@/lib/types";
import {
  defaultLocale,
  isLocale,
  localeCookieName,
} from "@/lib/i18n/config";
import { getDictionary, translate } from "@/lib/i18n/dictionaries";

export async function getServerLocale(): Promise<{
  locale: Locale;
  hasCookie: boolean;
}> {
  const store = await cookies();
  const value = store.get(localeCookieName)?.value;
  return {
    locale: isLocale(value) ? value : defaultLocale,
    hasCookie: Boolean(value),
  };
}

/** Server-side dictionary for metadata and server-rendered copy. */
export function getServerI18n(locale: Locale) {
  return {
    locale,
    dict: getDictionary(locale),
    t: (key: string, values?: Record<string, string | number>) =>
      translate(locale, key, values),
  };
}
