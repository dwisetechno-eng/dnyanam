import en from "@/messages/en.json";
import hi from "@/messages/hi.json";
import mr from "@/messages/mr.json";
import type { Locale } from "@/lib/types";

type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

export type Dictionary = DeepString<typeof en>;

type Paths<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${K}.${Paths<T[K]>}`
        : K;
    }[keyof T & string]
  : never;

export type MessageKey = Paths<Dictionary>;

export const dictionaries: Record<Locale, Dictionary> = {
  mr: mr as Dictionary,
  hi: hi as Dictionary,
  en: en as Dictionary,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.mr;
}

export function interpolate(
  template: string,
  values?: Record<string, string | number>,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

export function translate(
  locale: Locale,
  key: string,
  values?: Record<string, string | number>,
): string {
  const dict = getDictionary(locale) as unknown as Record<string, unknown>;
  const path = key.split(".");
  let current: unknown = dict;

  for (const part of path) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }

  if (typeof current !== "string") return key;
  return interpolate(current, values);
}
