"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Download,
  Library,
  Loader2,
  LogIn,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  readDemoLibrary,
  subscribeDemoLibrary,
} from "@/lib/demo-library";
import { useI18n } from "@/lib/i18n/provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/ui/toast-provider";
import type { CatalogItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface LibraryEntryView {
  id: string;
  order_id: string;
  unlocked_at: string;
  item: CatalogItem;
}

interface LibraryRow {
  id: string;
  order_id: string;
  unlocked_at: string;
  catalog_items: CatalogItem | CatalogItem[] | null;
}

export function LibraryClient() {
  const { t, locale } = useI18n();
  const { user, loading: authLoading, configured } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<LibraryEntryView[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDemo = useCallback(() => {
    setEntries(
      readDemoLibrary().map((entry) => ({
        id: entry.id,
        order_id: entry.order_id,
        unlocked_at: entry.unlocked_at,
        item: entry.item,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!configured) {
      loadDemo();
      return subscribeDemoLibrary(loadDemo);
    }
    if (authLoading) return;

    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    supabase
      .from("user_library")
      .select("id, order_id, unlocked_at, catalog_items(*)")
      .eq("user_id", user.id)
      .order("unlocked_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("[library] query failed:", error.message);
          setEntries([]);
        } else {
          const rows = (data ?? []) as unknown as LibraryRow[];
          setEntries(
            rows
              .map((row) => {
                const item = Array.isArray(row.catalog_items)
                  ? row.catalog_items[0]
                  : row.catalog_items;
                if (!item) return null;
                return {
                  id: row.id,
                  order_id: row.order_id,
                  unlocked_at: row.unlocked_at,
                  item,
                };
              })
              .filter((entry): entry is LibraryEntryView => Boolean(entry)),
          );
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, configured, loadDemo, user]);

  const needsSignIn = configured && !authLoading && !user;

  return (
    <div className="container-page pb-12 pt-6 sm:pt-8">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-ink-800/70 px-6 py-8 sm:rounded-[2rem] sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-70" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="eyebrow">
              <Library className="h-3.5 w-3.5" />
              {configured ? t("brand.name") : t("common.demo")}
            </span>
            <h1 className="mt-3 text-balance text-3xl font-extrabold text-cream sm:text-4xl">
              {t("library.title")}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">
              {t("library.subtitle")}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-right">
            <p className="font-display text-2xl font-extrabold text-saffron-300">
              {entries.length}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
              {t("library.count", { count: entries.length })}
            </p>
          </div>
        </div>
      </header>

      {!configured && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-saffron-400/20 bg-saffron-400/[0.06] p-4 text-xs leading-relaxed text-saffron-100/70">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-saffron-400" />
          {t("library.demoNote")}
        </p>
      )}

      {needsSignIn ? (
        <div className="surface mt-8 flex flex-col items-center px-6 py-16 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full border border-saffron-400/25 bg-saffron-400/10">
            <LogIn className="h-7 w-7 text-saffron-400" />
          </span>
          <h2 className="mt-5 text-xl font-extrabold text-cream">
            {t("library.signInTitle")}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/45">
            {t("library.signInBody")}
          </p>
          <Link
            href="/login?next=%2Flibrary"
            className="btn-primary mt-6"
          >
            <LogIn className="h-4 w-4" />
            {t("library.signIn")}
          </Link>
        </div>
      ) : loading || authLoading ? (
        <div className="mt-8 flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-saffron-400" />
        </div>
      ) : entries.length === 0 ? (
        <div className="surface mt-8 flex flex-col items-center px-6 py-16 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-3xl border border-white/10 bg-white/[0.04]">
            <BookOpen className="h-7 w-7 text-white/30" />
          </span>
          <h2 className="mt-5 text-xl font-extrabold text-cream">
            {t("library.emptyTitle")}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/45">
            {t("library.emptyBody")}
          </p>
          <Link href="/browse?type=ebook" className="btn-primary mt-6">
            {t("library.browse")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-3.5 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              <Link
                href={`/item/${entry.item.slug}`}
                className="relative h-[132px] w-[92px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-ink-800"
              >
                <Image
                  src={entry.item.cover_image_url}
                  alt={entry.item.title}
                  fill
                  sizes="92px"
                  className="object-cover"
                />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/item/${entry.item.slug}`}
                      className="line-clamp-2 text-sm font-extrabold leading-snug text-cream transition hover:text-saffron-300"
                    >
                      {entry.item.title}
                    </Link>
                    <p className="mt-1 truncate text-[11px] text-white/40">
                      {entry.item.author_or_publisher}
                    </p>
                  </div>
                  <span className="badge shrink-0 border border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
                    {t("common.free")}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-white/35">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-white/50">
                    {t(`format.${entry.item.item_type}`)}
                  </span>
                  <span className="uppercase tracking-wide">
                    {entry.item.language_code}
                  </span>
                </div>

                <p className="mt-1 text-[10px] text-white/30">
                  {t("library.purchasedOn", {
                    date: formatDate(entry.unlocked_at, locale),
                  })}
                </p>

                <div className="mt-auto pt-3">
                  {configured ? (
                    <a
                      href={`/api/download/${entry.item.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary px-4 py-2 text-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {t("library.download")}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        toast(
                          entry.item.sample_pdf_url
                            ? t("library.demoBadge")
                            : t("library.demoNote"),
                          "info",
                        )
                      }
                      className="btn-secondary px-4 py-2 text-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {t("library.download")}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
