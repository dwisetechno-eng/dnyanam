"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Loader2,
  Maximize2,
  Pause,
  Play,
  Radio as RadioIcon,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { stationName, formatTrackTime } from "@/lib/radio/localize";
import { useI18n } from "@/lib/i18n/provider";
import { useRadio } from "@/components/radio/radio-provider";
import { cn } from "@/lib/utils";

/**
 * Persistent mini-player pinned to the bottom of every page. Rendered once in
 * the root layout; it reserves page padding while a track is loaded so the
 * footer is never hidden behind it.
 */
export function RadioBar() {
  const { t, locale } = useI18n();
  const {
    current,
    station,
    isPlaying,
    buffering,
    hasError,
    currentTime,
    duration,
    volume,
    muted,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    stop,
  } = useRadio();

  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!current) {
      root.style.removeProperty("--radio-bar-h");
      return;
    }
    const node = barRef.current;
    if (!node) return;

    const update = () => {
      root.style.setProperty("--radio-bar-h", `${node.offsetHeight}px`);
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--radio-bar-h");
    };
  }, [current]);

  if (!current) return null;

  const max = Math.max(1, Math.round(duration || current.duration_seconds || 0));
  const value = Math.min(Math.round(currentTime), max);
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 glass pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_40px_-30px_rgba(0,0,0,0.9)]"
      role="region"
      aria-label={t("radio.title")}
    >
      <div className="container-page">
        <div className="flex items-center gap-2.5 py-2.5 sm:gap-4">
          <button
            type="button"
            onClick={toggle}
            aria-label={isPlaying ? t("radio.pause") : t("radio.play")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-saffron-300 to-saffron-500 text-on-accent shadow-[0_8px_24px_-10px_rgba(245,158,11,0.85)] transition hover:from-saffron-200 hover:to-saffron-400 active:scale-95"
          >
            {buffering ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4" fill="currentColor" />
            ) : (
              <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-saffron-400">
              <RadioIcon className="h-3 w-3" />
              <span className="truncate">
                {station ? stationName(station, locale) : t("radio.title")}
              </span>
              <span className="hidden text-white/30 sm:inline">· GeetGanga</span>
            </div>

            <div className="flex items-baseline gap-2">
              <p className="truncate text-sm font-bold text-cream">
                {current.title_native || current.title}
              </p>
              <span className="hidden shrink-0 text-[11px] text-white/40 sm:block">
                {current.language_name}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-2">
              <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-white/40">
                {formatTrackTime(value)}
              </span>
              <input
                type="range"
                min={0}
                max={max}
                step={1}
                value={value}
                onChange={(event) => seek(Number(event.target.value))}
                aria-label={t("radio.nowPlaying")}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-saffron-400"
              />
              <span className="w-9 shrink-0 text-[10px] tabular-nums text-white/40">
                {formatTrackTime(max)}
              </span>
            </div>

            {hasError && (
              <p className="truncate text-[10px] font-semibold text-rose-300">
                {t("radio.barError")}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={previous}
              aria-label={t("radio.prev")}
              className="hidden rounded-full p-2 text-white/55 transition hover:bg-white/10 hover:text-cream sm:grid"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label={t("radio.next")}
              className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-cream"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={t("radio.barVolume")}
              className="rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-cream"
            >
              <VolumeIcon className="h-4 w-4" />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              aria-label={t("radio.barVolume")}
              className="hidden h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/15 accent-saffron-400 lg:block"
            />
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <a
              href={current.source_url}
              target="_blank"
              rel="noreferrer"
              aria-label={t("radio.sourceLink")}
              className="hidden rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-cream xl:grid"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <Link
              href="/radio"
              aria-label={t("radio.barOpen")}
              className="hidden rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-cream sm:grid"
            >
              <Maximize2 className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={stop}
              aria-label={t("radio.barClose")}
              className={cn(
                "rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-cream",
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
