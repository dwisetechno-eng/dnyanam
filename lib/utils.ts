import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CatalogItem, ItemType, Locale } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** All prices are stored in paise; display them as whole rupees. */
export function formatPrice(paise: number): string {
  return `₹${inr.format(Math.round(paise / 100))}`;
}

export function formatNumber(value: number): string {
  return inr.format(value);
}

export function formatDate(value: string | Date, locale: Locale = "mr"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const locales: Record<Locale, string> = {
    mr: "mr-IN",
    hi: "hi-IN",
    en: "en-IN",
  };
  return new Intl.DateTimeFormat(locales[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function discountPercent(price: number, mrp: number): number {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

export function isDigital(item: Pick<CatalogItem, "item_type">): boolean {
  return item.item_type === "ebook" || item.item_type === "magazine_digital";
}

export function isPhysical(item: Pick<CatalogItem, "item_type">): boolean {
  return item.item_type === "physical_book" || item.item_type === "magazine_print";
}

export function isMagazine(item: Pick<CatalogItem, "item_type">): boolean {
  return (
    item.item_type === "magazine_digital" || item.item_type === "magazine_print"
  );
}

export function isEbook(item: Pick<CatalogItem, "item_type">): boolean {
  return item.item_type === "ebook";
}

export function typeIsDigital(type: ItemType): boolean {
  return type === "ebook" || type === "magazine_digital";
}

export function getInitials(name: string | null | undefined, email?: string): string {
  const source = (name || email || "ज्ञ").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function safeFileName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function absoluteUrl(path = "/"): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function truncated(text: string, length = 140): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length).trimEnd()}…`;
}

/** Free shipping threshold in paise (₹499). */
export const FREE_SHIPPING_THRESHOLD_PAISE = 49900;
/** Flat shipping fee in paise (₹49). */
export const SHIPPING_FEE_PAISE = 4900;
export const MAX_LINE_QUANTITY = 10;
export const DEMO_LIBRARY_KEY = "dnyanam.demo.library.v1";
