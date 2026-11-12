import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Database,
  LockKeyhole,
  ShieldAlert,
  Terminal,
} from "lucide-react";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getLanguages } from "@/lib/catalog";
import { getServerI18n, getServerLocale } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getCurrentProfile,
  getSupabaseAdmin,
} from "@/lib/supabase/server";
import type { AdBanner, CatalogItem, Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);
  return {
    title: t("admin.title"),
    description: t("admin.subtitle"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminPage() {
  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-10">
        <div className="surface mx-auto max-w-2xl px-6 py-12 text-center sm:px-10">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-saffron-400/25 bg-saffron-400/10">
            <Database className="h-7 w-7 text-saffron-400" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold text-cream">
            {t("admin.notConfigured")}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/50">
            {t("auth.demoBody")}
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Link href="/" className="btn-primary">
              <ArrowLeft className="h-4 w-4" />
              {t("admin.backHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { supabase, user, profile } = await getCurrentProfile();

  if (!user) {
    redirect("/login?next=%2Fadmin");
  }

  if (!profile || profile.role !== "admin" || !supabase) {
    return (
      <div className="container-page py-10">
        <div className="surface mx-auto max-w-2xl px-6 py-12 text-center sm:px-10">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-rose-400/25 bg-rose-500/10">
            <ShieldAlert className="h-7 w-7 text-rose-400" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold text-cream">
            {t("admin.unauthorizedTitle")}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/50">
            {t("admin.unauthorizedBody")}
          </p>
          <div className="mt-6 overflow-x-auto rounded-xl border border-white/10 bg-ink-950/60 p-4 text-left">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
              <Terminal className="h-3.5 w-3.5" />
              SQL
            </p>
            <code className="mt-2 block whitespace-pre font-mono text-[11px] leading-relaxed text-saffron-200/80">
              {`update public.profiles\nset role = 'admin'\nwhere id = '${user.id}';`}
            </code>
          </div>
          <Link href="/" className="btn-secondary mt-6">
            <ArrowLeft className="h-4 w-4" />
            {t("admin.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  const db = getSupabaseAdmin() ?? supabase;

  const [itemsResult, bannersResult, ordersResult, libraryResult, languages] =
    await Promise.all([
      db
        .from("catalog_items")
        .select("*")
        .order("created_at", { ascending: false }),
      db
        .from("ad_banners")
        .select("*")
        .order("priority", { ascending: false }),
      db
        .from("orders")
        .select(
          "*, order_items(id, catalog_item_id, quantity, unit_price_paise, catalog_items(title))",
        )
        .order("created_at", { ascending: false })
        .limit(150),
      db.from("user_library").select("id", { count: "exact", head: true }),
      getLanguages(),
    ]);

  if (itemsResult.error) {
    console.error("[admin] catalog load failed:", itemsResult.error.message);
  }
  if (bannersResult.error) {
    console.error("[admin] banners load failed:", bannersResult.error.message);
  }
  if (ordersResult.error) {
    console.error("[admin] orders load failed:", ordersResult.error.message);
  }

  const adminEmail = user.email ?? profile.full_name ?? "";

  return (
    <AdminDashboard
      locale={locale}
      adminEmail={adminEmail}
      initialItems={(itemsResult.data ?? []) as CatalogItem[]}
      initialBanners={(bannersResult.data ?? []) as AdBanner[]}
      initialOrders={(ordersResult.data ?? []) as Order[]}
      libraryCount={libraryResult.count ?? 0}
      languages={languages}
    />
  );
}
