import "server-only";

import { cookies } from "next/headers";
import {
  defaultThemeMode,
  isThemeMode,
  themeCookieName,
  type ThemeMode,
} from "@/lib/theme/config";

/**
 * Reads the reader's saved theme so the very first server render already has
 * the right class. "system" (and a missing cookie) fall back to dark on the
 * server; the inline boot script corrects it before paint.
 */
export async function getServerThemeMode(): Promise<ThemeMode> {
  const store = await cookies();
  const value = store.get(themeCookieName)?.value;
  return isThemeMode(value) ? value : defaultThemeMode;
}
