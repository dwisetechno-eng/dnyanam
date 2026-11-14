"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  RadioStation,
  RadioTrack,
} from "@/lib/radio/types";

const VOLUME_KEY = "dnyanam.radio.volume";
const DEFAULT_VOLUME = 0.85;

interface RadioContextValue {
  station: RadioStation | null;
  queue: RadioTrack[];
  current: RadioTrack | null;
  isPlaying: boolean;
  buffering: boolean;
  hasError: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playStation: (station: RadioStation, tracks?: RadioTrack[]) => void;
  playTrack: (
    track: RadioTrack,
    station: RadioStation,
    tracks?: RadioTrack[],
  ) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  stop: () => void;
}

const RadioContext = createContext<RadioContextValue | null>(null);

/**
 * One persistent <audio> element for the whole app, so playback survives
 * client-side navigation (browse ↔ reader ↔ radio page).
 *
 * The queue/station model is intentionally generic — a "station" is just a
 * named list of tracks, which is how audiobook chapters will slot in later.
 */
export function RadioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedUrlRef = useRef<string | null>(null);

  const [station, setStation] = useState<RadioStation | null>(null);
  const [queue, setQueue] = useState<RadioTrack[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [muted, setMuted] = useState(false);

  const current = useMemo(
    () => queue.find((track) => track.id === currentId) ?? null,
    [queue, currentId],
  );

  // Restore the listener's volume once on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(VOLUME_KEY);
      // No saved value means "first visit": keep the audible default. Without
      // this guard `Number(null)` is 0 and the player starts silent.
      if (raw === null) return;
      const stored = Number(raw);
      if (Number.isFinite(stored) && stored >= 0 && stored <= 1) {
        setVolumeState(stored);
      }
    } catch {
      // Private mode — keep the default.
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const load = useCallback((track: RadioTrack) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (loadedUrlRef.current === track.audio_url) return;

    loadedUrlRef.current = track.audio_url;
    setCurrentTime(0);
    setDuration(track.duration_seconds || 0);
    setBuffering(true);
    setHasError(false);
    audio.src = track.audio_url;
    audio.load();
  }, []);

  const playStation = useCallback(
    (nextStation: RadioStation, tracks?: RadioTrack[]) => {
      const list = tracks && tracks.length > 0 ? tracks : nextStation.tracks;
      if (list.length === 0) return;

      const audio = audioRef.current;
      if (!audio) return;

      setStation(nextStation);
      setQueue(list);
      setCurrentId(list[0].id);
      setHasError(false);
      load(list[0]);
      void audio.play().catch(() => {
        setBuffering(false);
        setIsPlaying(false);
      });
    },
    [load],
  );

  const playTrack = useCallback(
    (track: RadioTrack, nextStation: RadioStation, tracks?: RadioTrack[]) => {
      const audio = audioRef.current;
      if (!audio) return;

      const list = tracks && tracks.length > 0 ? tracks : nextStation.tracks;

      if (track.id === currentId) {
        if (audio.paused) void audio.play().catch(() => setIsPlaying(false));
        else audio.pause();
        return;
      }

      setStation(nextStation);
      setQueue(list);
      setCurrentId(track.id);
      setHasError(false);
      load(track);
      void audio.play().catch(() => {
        setBuffering(false);
        setIsPlaying(false);
      });
    },
    [currentId, load],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) void audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [current]);

  const index = currentId ? queue.findIndex((track) => track.id === currentId) : -1;

  const goTo = useCallback(
    (offset: number) => {
      if (queue.length === 0 || index === -1) return;
      const nextIndex = (index + offset + queue.length) % queue.length;
      const track = queue[nextIndex];
      const audio = audioRef.current;
      if (!audio) return;

      setCurrentId(track.id);
      setHasError(false);
      load(track);
      void audio.play().catch(() => {
        setBuffering(false);
        setIsPlaying(false);
      });
    },
    [queue, index, load],
  );

  const next = useCallback(() => goTo(1), [goTo]);

  const previous = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    goTo(-1);
  }, [goTo]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const limit = Number.isFinite(audio.duration)
      ? audio.duration
      : duration || 0;
    const value = Math.min(Math.max(seconds, 0), limit);
    audio.currentTime = value;
    setCurrentTime(value);
  }, [duration]);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.min(Math.max(value, 0), 1);
    setVolumeState(clamped);
    if (clamped > 0) setMuted(false);
    try {
      window.localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      // ignore
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (muted) {
      setMuted(false);
      return;
    }
    if (volume === 0) {
      // The speaker icon doubles as "restore sound" when the slider is at 0.
      setVolumeState(DEFAULT_VOLUME);
      try {
        window.localStorage.setItem(VOLUME_KEY, String(DEFAULT_VOLUME));
      } catch {
        // ignore
      }
      return;
    }
    setMuted(true);
  }, [muted, volume]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    loadedUrlRef.current = null;
    setStation(null);
    setQueue([]);
    setCurrentId(null);
    setIsPlaying(false);
    setBuffering(false);
    setHasError(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  // Wire the media element to React state.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => {
      setIsPlaying(true);
      setBuffering(false);
      setHasError(false);
    };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => {
      setBuffering(false);
      setIsPlaying(true);
    };
    const onError = () => {
      setBuffering(false);
      setIsPlaying(false);
      setHasError(true);
    };
    const onEnded = () => {
      // Keep the station running: wrap around to the first track.
      next();
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("loadedmetadata", onDurationChange);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onError);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("loadedmetadata", onDurationChange);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("ended", onEnded);
    };
  }, [next]);

  // OS-level media controls (lock screen, headset buttons, media keys).
  useEffect(() => {
    if (!current) return;
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    const session = navigator.mediaSession;
    if (typeof MediaMetadata !== "undefined") {
      session.metadata = new MediaMetadata({
        title: current.title_native || current.title,
        artist: station?.name_en ? `${station.name_en} · GeetGanga` : "GeetGanga",
        album: "Dnyanam Radio",
      });
    }

    const handlers: Array<
      [MediaSessionAction, MediaSessionActionHandler | null]
    > = [
      ["play", () => void toggle()],
      ["pause", () => void toggle()],
      ["previoustrack", () => previous()],
      ["nexttrack", () => next()],
      ["seekto", (details) => {
        if (typeof details.seekTime === "number") seek(details.seekTime);
      }],
    ];

    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Some browsers do not support every action.
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // ignore
        }
      }
    };
  }, [current, station, toggle, next, previous, seek]);

  const value = useMemo<RadioContextValue>(
    () => ({
      station,
      queue,
      current,
      isPlaying,
      buffering,
      hasError,
      currentTime,
      duration,
      volume,
      muted,
      playStation,
      playTrack,
      toggle,
      next,
      previous,
      seek,
      setVolume,
      toggleMute,
      stop,
    }),
    [
      station,
      queue,
      current,
      isPlaying,
      buffering,
      hasError,
      currentTime,
      duration,
      volume,
      muted,
      playStation,
      playTrack,
      toggle,
      next,
      previous,
      seek,
      setVolume,
      toggleMute,
      stop,
    ],
  );

  return (
    <RadioContext.Provider value={value}>
      {children}
      {/* The single media element lives outside the page tree so it is never
          unmounted while the reader navigates. */}
      <audio ref={audioRef} preload="none" />
    </RadioContext.Provider>
  );
}

export function useRadio(): RadioContextValue {
  const context = useContext(RadioContext);
  if (!context) throw new Error("useRadio must be used inside <RadioProvider>");
  return context;
}
