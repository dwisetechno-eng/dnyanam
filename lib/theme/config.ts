export const themeModes = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof themeModes)[number];

export type ResolvedTheme = "light" | "dark";

/** Dark stays the default until the reader picks something else. */
export const defaultThemeMode: ThemeMode = "dark";

export const themeCookieName = "dnyanam.theme";
export const themeStorageKey = "dnyanam.theme";

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (themeModes as readonly string[]).includes(value);
}

export function resolveThemeMode(
  mode: ThemeMode,
  prefersDark: boolean,
): ResolvedTheme {
  if (mode === "system") return prefersDark ? "dark" : "light";
  return mode;
}

/**
 * Runs in <head> before the first paint so the correct theme is applied
 * without a flash. Kept dependency-free and defensive.
 */
export const themeBootScript = `(function(){try{
var s=localStorage.getItem('${themeStorageKey}');
if(s!=='light'&&s!=='dark'&&s!=='system')s=null;
if(!s){var m=document.cookie.match(/(?:^|; )${themeCookieName.replaceAll(
  ".",
  "\\.",
)}(light|dark|system)/);s=m?m[1]:null;}
if(!s)s='${defaultThemeMode}';
var dark=s==='dark'||(s==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var r=document.documentElement;
r.classList.toggle('dark',dark);
r.classList.toggle('theme-light',!dark);
r.dataset.theme=dark?'dark':'light';
r.style.colorScheme=dark?'dark':'light';
}catch(e){}})();`;

export const themeMetaColors: Record<ResolvedTheme, string> = {
  dark: "#0B0F19",
  light: "#F6F3EC",
};
