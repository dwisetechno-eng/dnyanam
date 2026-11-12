"use client";

import type { CatalogItem, DemoLibraryEntry } from "@/lib/types";
import { DEMO_LIBRARY_KEY } from "@/lib/utils";

const EVENT = "dnyanam:demo-library";

export function readDemoLibrary(): DemoLibraryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DEMO_LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is DemoLibraryEntry =>
        typeof entry?.id === "string" && Boolean(entry?.item?.id),
    );
  } catch {
    return [];
  }
}

export function addToDemoLibrary(items: CatalogItem[], orderId: string) {
  if (typeof window === "undefined") return;
  const existing = readDemoLibrary();
  const now = new Date().toISOString();
  const map = new Map(existing.map((entry) => [entry.item.id, entry]));

  for (const item of items) {
    if (map.has(item.id)) continue;
    map.set(item.id, {
      id: `${orderId}:${item.id}`,
      order_id: orderId,
      unlocked_at: now,
      item,
    });
  }

  window.localStorage.setItem(
    DEMO_LIBRARY_KEY,
    JSON.stringify(Array.from(map.values())),
  );
  window.dispatchEvent(new Event(EVENT));
}

export function clearDemoLibrary() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_LIBRARY_KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeDemoLibrary(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
