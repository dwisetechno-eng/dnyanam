"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultThemeMode,
  isThemeMode,
  resolveThemeMode,
  themeCookieName,
  themeMetaColors,
  themeStorageKey,
  type ResolvedTheme,
  type ThemeMode,
} from "@/lib/theme/config";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = "(prefers-color-scheme: dark)";

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("theme-light", theme === "light");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = themeMetaColors[theme];
}

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches;
}

export function ThemeProvider({
  initialMode = defaultThemeMode,
  children,
}: {
  initialMode?: ThemeMode;
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    initialMode === "light" ? "light" : "dark",
  );

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(themeStorageKey, next);
    } catch {
      // Private mode / storage disabled — the cookie below still works.
    }
    document.cookie = `${themeCookieName}=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  // Follow the OS while the reader keeps the "system" option selected.
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const sync = () => {
      if (mode !== "system") return;
      setResolvedTheme(media.matches ? "dark" : "light");
    };

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [mode]);

  useEffect(() => {
    const next = resolveThemeMode(mode, systemPrefersDark());
    setResolvedTheme(next);
    applyTheme(next);
  }, [mode]);

  // Adopt a theme chosen in another tab / on a previous page load.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(themeStorageKey);
    } catch {
      stored = null;
    }
    if (isThemeMode(stored) && stored !== mode) {
      setModeState(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(() => {
    setMode(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedTheme, setMode, toggle }),
    [mode, resolvedTheme, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
}
