"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  Clock,
  ExternalLink,
  Headphones,
  Languages,
  Loader2,
  Music4,
  Pause,
  Play,
  Radio as RadioIcon,
  Sparkles,
} from "lucide-react";
import { useRadio } from "@/components/radio/radio-provider";
import { useI18n } from "@/lib/i18n/provider";
import {
  formatTrackTime,
  stationDescription,
  stationName,
} from "@/lib/radio/localize";
import type { RadioSource, RadioStation } from "@/lib/radio/types";
import { cn, formatDate } from "@/lib/utils";

const ALL_LANGUAGES = "all";

export function RadioPage({
  stations,
  source,
  generatedAt,
}: {
  stations: RadioStation[];
  source: RadioSource;
  generatedAt: string;
}) {
  const { t, locale } = useI18n();
  const {
    station: playingStation,
    current,
    isPlaying,
    buffering,
    playStation,
    playTrack,
    toggle,
  } = useRadio();

  const [activeId, setActiveId] = useState(stations[0]?.id ?? "");
  const [language, setLanguage] = useState(ALL_LANGUAGES);

  const station =
    stations.find((entry) => entry.id === activeId) ?? stations[0] ?? null;

  useEffect(() => {
    setLanguage(ALL_LANGUAGES);
  }, [activeId]);

  const languages = useMemo(() => {
    if (!station) return [];
    const map = new Map<string, string>();
    for (const track of station.tracks) {
      const code = track.language_code || track.language_name;
      if (!map.has(code)) map.set(code, track.language_name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [station]);

  const tracks = useMemo(() => {
    if (!station) return [];
    if (language === ALL_LANGUAGES) return station.tracks;
    return station.tracks.filter(
      (track) => (track.language_code || track.language_name) === language,
    );
  }, [station, language]);

  if (!station) return null;

  const stationPlaying = playingStation?.id === station.id;
  const playAllLabel =
    stationPlaying && isPlaying ? t("radio.pause") : t("radio.playAll");

  function handlePlayAll() {
    if (!station) return;
    if (stationPlaying && isPlaying) {
      toggle();
      return;
    }
    playStation(station, tracks);
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-800/60 p-6 sm:p-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-saffron-400/10 blur-3xl"
        />
        <div className="relative max-w-3xl">
          <span className="eyebrow">
            <RadioIcon className="h-3.5 w-3.5" />
            {t("radio.eyebrow")}
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-cream sm:text-4xl">
            {t("radio.title")}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">
            {t("radio.subtitle")}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePlayAll}
              className="btn-primary px-5 py-2.5"
            >
              {stationPlaying && isPlaying ? (
                <Pause className="h-4 w-4" fill="currentColor" />
              ) : (
                <Play className="h-4 w-4" fill="currentColor" />
              )}
              {playAllLabel}
            </button>
            <a
              href={source.homepage}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary px-4 py-2.5 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {source.name}
            </a>
            <span className="text-[11px] font-semibold text-white/40">
              {t("radio.license")} · {t("radio.updated", {
                date: formatDate(generatedAt, locale),
              })}
            </span>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
              {t("radio.stationLabel")}
            </span>
            {stations.map((entry) => {
              const active = entry.id === station.id;
              const live = playingStation?.id === entry.id && isPlaying;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setActiveId(entry.id)}
                  aria-pressed={active}
                  className={cn(
                    "chip",
                    active && "chip-active",
                  )}
                >
                  {live ? (
                    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
                      <span className="w-[2px] animate-pulse rounded-full bg-current h-2" />
                      <span className="w-[2px] animate-pulse rounded-full bg-current h-3 [animation-delay:120ms]" />
                      <span className="w-[2px] animate-pulse rounded-full bg-current h-1.5 [animation-delay:240ms]" />
                    </span>
                  ) : (
                    <RadioIcon className="h-3.5 w-3.5" />
                  )}
                  {stationName(entry, locale)}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold text-cream sm:text-2xl">
                {stationName(station, locale)}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/50">
                {stationDescription(station, locale)}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/50">
              <Music4 className="h-3.5 w-3.5 text-saffron-400" />
              {t("radio.tracksCount", { count: station.tracks.length })}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
              <Languages className="h-3.5 w-3.5" />
              {t("radio.languages")}
            </span>
            <button
              type="button"
              onClick={() => setLanguage(ALL_LANGUAGES)}
              aria-pressed={language === ALL_LANGUAGES}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-bold transition",
                language === ALL_LANGUAGES
                  ? "border-saffron-400/60 bg-saffron-400/15 text-saffron-300"
                  : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-cream",
              )}
            >
              {t("radio.allLanguages")}
            </button>
            {languages.map(([code, name]) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                aria-pressed={language === code}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-bold transition",
                  language === code
                    ? "border-saffron-400/60 bg-saffron-400/15 text-saffron-300"
                    : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-cream",
                )}
              >
                {name}
              </button>
            ))}
          </div>

          <ol className="mt-5 space-y-2">
            {tracks.map((track, index) => {
              const active = current?.id === track.id;
              const playing = active && isPlaying;
              return (
                <li
                  key={track.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition sm:px-4",
                    active
                      ? "border-saffron-400/40 bg-saffron-400/[0.07]"
                      : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]",
                  )}
                >
                  <span className="w-5 shrink-0 text-center text-[11px] font-bold tabular-nums text-white/30">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <button
                    type="button"
                    onClick={() => playTrack(track, station, tracks)}
                    aria-label={
                      playing ? t("radio.pause") : t("radio.play")
                    }
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full transition",
                      active
                        ? "bg-gradient-to-br from-saffron-300 to-saffron-500 text-on-accent"
                        : "border border-white/15 bg-white/[0.05] text-white/70 hover:border-saffron-400/50 hover:text-saffron-300",
                    )}
                  >
                    {active && buffering ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : playing ? (
                      <Pause className="h-3.5 w-3.5" fill="currentColor" />
                    ) : (
                      <Play
                        className="h-3.5 w-3.5 translate-x-[1px]"
                        fill="currentColor"
                      />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm font-bold",
                        active ? "text-saffron-300" : "text-cream",
                      )}
                    >
                      {track.title_native || track.title}
                    </p>
                    <p className="truncate text-[11px] text-white/45">
                      {track.title_native && track.title !== track.title_native
                        ? `${track.title} · `
                        : ""}
                      {track.language_name} · {track.genre}
                    </p>
                  </div>

                  <span className="hidden shrink-0 items-center gap-1 text-[11px] tabular-nums text-white/40 sm:flex">
                    <Clock className="h-3 w-3" />
                    {formatTrackTime(track.duration_seconds)}
                  </span>

                  <a
                    href={track.source_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${t("radio.sourceLink")} — ${track.title}`}
                    className="hidden shrink-0 rounded-full p-1.5 text-white/35 transition hover:bg-white/10 hover:text-cream sm:grid"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
              );
            })}
          </ol>

          {tracks.length === 0 && (
            <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/50">
              {t("radio.empty")}
            </p>
          )}
        </div>

        <aside className="space-y-4">
          <section className="surface p-5">
            <span className="eyebrow">
              <Headphones className="h-3.5 w-3.5" />
              {t("radio.nowPlaying")}
            </span>
            {current ? (
              <div className="mt-3">
                <p className="text-base font-bold text-cream">
                  {current.title_native || current.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/45">
                  {current.title_native &&
                  current.title !== current.title_native
                    ? `${current.title} · `
                    : ""}
                  {current.language_name}
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-white/40">
                  <span className="inline-flex items-center gap-1.5">
                    <RadioIcon className="h-3 w-3 text-saffron-400" />
                    {playingStation
                      ? stationName(playingStation, locale)
                      : t("radio.title")}
                  </span>
                  <span>
                    {formatTrackTime(current.duration_seconds)} ·{" "}
                    {t("radio.kindSong")}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      playTrack(
                        current,
                        playingStation ?? station,
                        (playingStation ?? station).tracks,
                      )
                    }
                    className="btn-secondary flex-1 px-3 py-2 text-xs"
                  >
                    {isPlaying ? (
                      <Pause className="h-3.5 w-3.5" fill="currentColor" />
                    ) : (
                      <Play className="h-3.5 w-3.5" fill="currentColor" />
                    )}
                    {isPlaying ? t("radio.pause") : t("radio.play")}
                  </button>
                  <a
                    href={current.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary px-3 py-2 text-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/50">{t("radio.idle")}</p>
            )}
          </section>

          <section className="surface p-5">
            <h2 className="text-sm font-extrabold text-cream">
              {t("radio.sourceTitle")}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-white/50">
              {t("radio.sourceNote")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={source.category_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-white/65 transition hover:border-saffron-400/40 hover:text-cream"
              >
                {t("radio.sourceLink")}
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={source.license_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-white/65 transition hover:border-saffron-400/40 hover:text-cream"
              >
                {source.license}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </section>

          <section className="surface relative overflow-hidden p-5">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-600/10 blur-2xl"
            />
            <span className="badge bg-rose-600/15 text-rose-300">
              <Sparkles className="h-3 w-3" />
              {t("radio.audiobooksBadge")}
            </span>
            <h2 className="mt-3 flex items-center gap-2 text-sm font-extrabold text-cream">
              <BookOpenText className="h-4 w-4 text-saffron-400" />
              {t("radio.audiobooksTitle")}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-white/50">
              {t("radio.audiobooksBody")}
            </p>
          </section>
        </aside>
      </div>

      <p className="mt-10 text-center text-[11px] text-white/30">
        {t("radio.footerNote", {
          date: formatDate(generatedAt, locale),
          source: source.name,
        })}
      </p>
    </div>
  );
}
