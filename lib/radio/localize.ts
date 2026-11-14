import type { Locale } from "@/lib/types";
import type { RadioStation } from "@/lib/radio/types";

/** Station copy exists in all three interface languages. */
export function stationName(station: RadioStation, locale: Locale): string {
  const names: Record<Locale, string> = {
    mr: station.name_mr,
    hi: station.name_hi,
    en: station.name_en,
  };
  return names[locale] || names.mr;
}

export function stationDescription(
  station: RadioStation,
  locale: Locale,
): string {
  const descriptions: Record<Locale, string> = {
    mr: station.description_mr,
    hi: station.description_hi,
    en: station.description_en,
  };
  return descriptions[locale] || descriptions.mr;
}

/** `m:ss`, or `h:mm:ss` for long-form audio (audiobooks). */
export function formatTrackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}
