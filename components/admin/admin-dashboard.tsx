"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  IndianRupee,
  LayoutDashboard,
  Library,
  Megaphone,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  ReceiptText,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { ItemFormModal } from "@/components/admin/item-form";
import { BannerFormModal } from "@/components/admin/banner-form";
import { BulkUploadModal } from "@/components/admin/bulk-upload-modal";
import { useI18n } from "@/lib/i18n/provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/ui/toast-provider";
import type {
  AdBanner,
  CatalogItem,
  Language,
  Locale,
  Order,
  OrderStatus,
} from "@/lib/types";
import { cn, formatDate, formatPrice } from "@/lib/utils";

type Tab = "items" | "banners" | "orders";

const statusStyles: Record<OrderStatus, string> = {
  created: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  paid: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  failed: "border-rose-400/25 bg-rose-500/10 text-rose-300",
  refunded: "border-white/15 bg-white/[0.06] text-white/50",
};

const statusIcons = {
  created: Clock,
  paid: CheckCircle2,
  failed: XCircle,
  refunded: RefreshCw,
} as const;

export function AdminDashboard({
  locale,
  adminEmail,
  initialItems,
  initialBanners,
  initialOrders,
  libraryCount,
  languages,
}: {
  locale: Locale;
  adminEmail: string;
  initialItems: CatalogItem[];
  initialBanners: AdBanner[];
  initialOrders: Order[];
  libraryCount: number;
  languages: Language[];
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("items");
  const [items, setItems] = useState(initialItems);
  const [banners, setBanners] = useState(initialBanners);
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [itemModal, setItemModal] = useState<CatalogItem | null | undefined>(
    undefined,
  );
  const [bannerModal, setBannerModal] = useState<AdBanner | null | undefined>(
    undefined,
  );
  const [bulkOpen, setBulkOpen] = useState(false);

  const revenue = useMemo(
    () =>
      orders
        .filter((order) => order.status === "paid")
        .reduce((sum, order) => sum + order.total_paise, 0),
    [orders],
  );

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [item.title, item.title_en, item.slug, item.author_or_publisher]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [items, search]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const stats = [
    {
      label: t("admin.stats.books"),
      value: String(items.length),
      icon: BookOpen,
      tone: "text-saffron-300 bg-saffron-400/10",
    },
    {
      label: t("admin.stats.orders"),
      value: String(orders.length),
      icon: ReceiptText,
      tone: "text-rose-300 bg-rose-500/10",
    },
    {
      label: t("admin.stats.revenue"),
      value: formatPrice(revenue),
      icon: IndianRupee,
      tone: "text-emerald-300 bg-emerald-500/10",
    },
    {
      label: t("admin.stats.digital"),
      value: String(libraryCount),
      icon: Library,
      tone: "text-sky-300 bg-sky-500/10",
    },
  ];

  const tabs: Array<{ id: Tab; label: string; icon: typeof BookOpen; count: number }> = [
    { id: "items", label: t("admin.tabs.items"), icon: BookOpen, count: items.length },
    { id: "banners", label: t("admin.tabs.banners"), icon: Megaphone, count: banners.length },
    { id: "orders", label: t("admin.tabs.orders"), icon: ReceiptText, count: orders.length },
  ];

  async function deleteItem(item: CatalogItem) {
    if (!window.confirm(t("admin.confirmDelete"))) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.from("catalog_items").delete().eq("id", item.id);
    if (error) {
      console.error("[admin] delete item failed:", error.message);
      toast(t("admin.toastError"), "error");
      return;
    }
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    toast(t("admin.saved"), "success");
  }

  async function deleteBanner(banner: AdBanner) {
    if (!window.confirm(t("admin.confirmDelete"))) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.from("ad_banners").delete().eq("id", banner.id);
    if (error) {
      console.error("[admin] delete banner failed:", error.message);
      toast(t("admin.toastError"), "error");
      return;
    }
    setBanners((current) => current.filter((entry) => entry.id !== banner.id));
    toast(t("admin.saved"), "success");
  }

  async function reloadItems() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data, error } = await supabase
      .from("catalog_items")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[admin] catalogue reload failed:", error.message);
      return;
    }
    setItems((data ?? []) as CatalogItem[]);
  }

  function onItemSaved(item: CatalogItem, created: boolean) {    setItems((current) =>
      created
        ? [item, ...current]
        : current.map((entry) => (entry.id === item.id ? item : entry)),
    );
    setItemModal(undefined);
  }

  function onBannerSaved(banner: AdBanner, created: boolean) {
    setBanners((current) =>
      created
        ? [banner, ...current]
        : current.map((entry) => (entry.id === banner.id ? banner : entry)),
    );
    setBannerModal(undefined);
  }

  return (
    <div className="container-page pb-12 pt-6 sm:pt-8">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-ink-800/70 px-6 py-7 sm:rounded-[2rem] sm:px-9 sm:py-8">
        <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-60" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="eyebrow">
              <LayoutDashboard className="h-3.5 w-3.5" />
              {adminEmail}
            </span>
            <h1 className="mt-2 text-3xl font-extrabold text-cream sm:text-4xl">
              {t("admin.title")}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-white/45">
              {t("admin.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="btn-ghost border border-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">{t("common.retry")}</span>
            </button>
            <Link href="/" className="btn-secondary">
              <ExternalLink className="h-4 w-4" />
              {t("footer.shop")}
            </Link>
          </div>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                {stat.label}
              </p>
              <span className={cn("grid h-8 w-8 place-items-center rounded-xl", stat.tone)}>
                <stat.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold text-cream">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="no-scrollbar mt-6 flex gap-1.5 overflow-x-auto border-b border-white/10 pb-px">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-4 py-2.5 text-xs font-bold transition",
              tab === entry.id
                ? "border-saffron-400 bg-white/[0.04] text-saffron-300"
                : "border-transparent text-white/45 hover:bg-white/[0.03] hover:text-cream",
            )}
          >
            <entry.icon className="h-4 w-4" />
            {entry.label}
            <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/40">
              {entry.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "items" && (
        <section className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-cream">
                {t("admin.items.title")}
              </h2>
              <p className="text-xs text-white/40">{t("admin.items.subtitle")}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("admin.items.search")}
                  className="field w-52 py-2 pl-9 text-xs sm:w-64"
                />
              </div>
              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                className="btn-secondary px-4 py-2.5 text-xs"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {t("admin.bulk.title")}
              </button>
              <button
                type="button"
                onClick={() => setItemModal(null)}
                className="btn-primary px-4 py-2.5 text-xs"
              >
                <Plus className="h-4 w-4" />
                {t("admin.items.add")}
              </button>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="surface mt-4 flex flex-col items-center px-6 py-14 text-center">
              <Package className="h-8 w-8 text-white/25" />
              <p className="mt-3 text-sm text-white/45">{t("admin.items.empty")}</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[840px] border-collapse text-left text-xs">
                <thead className="bg-white/[0.04] text-[10px] uppercase tracking-[0.12em] text-white/35">
                  <tr>
                    <th className="px-4 py-3 font-bold">{t("admin.items.columns.title")}</th>
                    <th className="px-4 py-3 font-bold">{t("admin.items.columns.type")}</th>
                    <th className="px-4 py-3 font-bold">{t("admin.items.columns.language")}</th>
                    <th className="px-4 py-3 font-bold">{t("admin.items.columns.price")}</th>
                    <th className="px-4 py-3 font-bold">{t("admin.items.columns.stock")}</th>
                    <th className="px-4 py-3 font-bold">{t("admin.items.columns.status")}</th>
                    <th className="px-4 py-3 text-right font-bold">{t("admin.items.columns.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredItems.map((item) => {
                    const physical =
                      item.item_type === "physical_book" ||
                      item.item_type === "magazine_print";
                    return (
                      <tr key={item.id} className="transition hover:bg-white/[0.025]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded border border-white/10 bg-ink-800">
                              <Image
                                src={item.cover_image_url}
                                alt=""
                                fill
                                sizes="32px"
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[220px] truncate font-bold text-cream">
                                {item.title}
                              </p>
                              <p className="max-w-[220px] truncate text-[10px] text-white/35">
                                {item.author_or_publisher} · {item.slug}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/55">
                          {t(`format.${item.item_type}`)}
                        </td>
                        <td className="px-4 py-3 font-semibold uppercase text-white/50">
                          {item.language_code}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-cream">
                            {formatPrice(item.price_paise)}
                          </p>
                          {item.mrp_paise > item.price_paise && (
                            <p className="text-[10px] text-white/30 line-through">
                              {formatPrice(item.mrp_paise)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/55">
                          {physical ? item.stock_quantity : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1">
                            <span
                              className={cn(
                                "badge",
                                item.is_published
                                  ? "border border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                                  : "border border-white/15 bg-white/[0.06] text-white/45",
                              )}
                            >
                              {item.is_published
                                ? t("admin.published")
                                : t("admin.unpublished")}
                            </span>
                            {item.is_trending && (
                              <span className="badge border border-saffron-400/25 bg-saffron-400/10 text-saffron-300">
                                T
                              </span>
                            )}
                            {item.is_hero_featured && (
                              <span className="badge border border-rose-400/25 bg-rose-500/10 text-rose-300">
                                H
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/item/${item.slug}`}
                              target="_blank"
                              className="rounded-lg p-2 text-white/35 transition hover:bg-white/10 hover:text-cream"
                              aria-label={t("nav.browse")}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setItemModal(item)}
                              className="rounded-lg p-2 text-white/35 transition hover:bg-saffron-400/10 hover:text-saffron-300"
                              aria-label={t("common.edit")}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteItem(item)}
                              className="rounded-lg p-2 text-white/35 transition hover:bg-rose-500/10 hover:text-rose-300"
                              aria-label={t("common.delete")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "banners" && (
        <section className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-cream">
                {t("admin.banners.title")}
              </h2>
              <p className="text-xs text-white/40">{t("admin.banners.subtitle")}</p>
            </div>
            <button
              type="button"
              onClick={() => setBannerModal(null)}
              className="btn-primary px-4 py-2.5 text-xs"
            >
              <Plus className="h-4 w-4" />
              {t("admin.banners.add")}
            </button>
          </div>

          {banners.length === 0 ? (
            <div className="surface mt-4 flex flex-col items-center px-6 py-14 text-center">
              <Megaphone className="h-8 w-8 text-white/25" />
              <p className="mt-3 text-sm text-white/45">{t("admin.banners.empty")}</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                <thead className="bg-white/[0.04] text-[10px] uppercase tracking-[0.12em] text-white/35">
                  <tr>
                    <th className="px-4 py-3 font-bold">{t("admin.banners.columns.title")}</th>
                    <th className="px-4 py-3 font-bold">{t("admin.banners.columns.slot")}</th>
                    <th className="px-4 py-3 font-bold">{t("admin.banners.columns.priority")}</th>
                    <th className="px-4 py-3 font-bold">{t("admin.banners.columns.active")}</th>
                    <th className="px-4 py-3 text-right font-bold">{t("admin.banners.columns.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {banners.map((banner) => (
                    <tr key={banner.id} className="transition hover:bg-white/[0.025]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-20 shrink-0 overflow-hidden rounded border border-white/10 bg-ink-800">
                            <Image
                              src={banner.desktop_image_url}
                              alt=""
                              fill
                              sizes="80px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[240px] truncate font-bold text-cream">
                              {banner.title}
                            </p>
                            <p className="max-w-[240px] truncate text-[10px] text-white/35">
                              {banner.target_url}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/55">
                        {t(`admin.banners.slots.${banner.slot_position}`)}
                      </td>
                      <td className="px-4 py-3 font-bold text-white/60">
                        {banner.priority}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "badge",
                            banner.is_active
                              ? "border border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                              : "border border-white/15 bg-white/[0.06] text-white/45",
                          )}
                        >
                          {banner.is_active ? t("admin.active") : t("admin.inactive")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setBannerModal(banner)}
                            className="rounded-lg p-2 text-white/35 transition hover:bg-saffron-400/10 hover:text-saffron-300"
                            aria-label={t("common.edit")}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteBanner(banner)}
                            className="rounded-lg p-2 text-white/35 transition hover:bg-rose-500/10 hover:text-rose-300"
                            aria-label={t("common.delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "orders" && (
        <section className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-cream">
                {t("admin.orders.title")}
              </h2>
              <p className="text-xs text-white/40">{t("admin.orders.subtitle")}</p>
            </div>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | OrderStatus)
              }
              className="field w-auto cursor-pointer py-2 text-xs"
            >
              <option value="all">{t("admin.orders.filterAll")}</option>
              {(["created", "paid", "failed", "refunded"] as OrderStatus[]).map(
                (status) => (
                  <option key={status} value={status}>
                    {t(`orders.status.${status}`)}
                  </option>
                ),
              )}
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="surface mt-4 flex flex-col items-center px-6 py-14 text-center">
              <ReceiptText className="h-8 w-8 text-white/25" />
              <p className="mt-3 text-sm text-white/45">{t("admin.orders.empty")}</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                <thead className="bg-white/[0.04] text-[10px] uppercase tracking-[0.12em] text-white/35">
                  <tr>
                    <th className="px-4 py-3 font-bold">{t("admin.orders.columns.order")}</th>
                    <th className="px-4 py-3 font-bold">{t("admin.orders.columns.customer")}</th>
                    <th className="px-4 py-3 font-bold">{t("admin.orders.columns.date")}</th>
                    <th className="px-4 py-3 font-bold">{t("admin.orders.columns.items")}</th>
                    <th className="px-4 py-3 font-bold">{t("admin.orders.columns.amount")}</th>
                    <th className="px-4 py-3 font-bold">{t("admin.orders.columns.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredOrders.map((order) => {
                    const StatusIcon = statusIcons[order.status];
                    const itemCount = (order.order_items ?? []).reduce(
                      (sum, line) => sum + line.quantity,
                      0,
                    );
                    const customer =
                      order.shipping_address?.name ||
                      t("admin.orders.customerFallback");
                    return (
                      <tr key={order.id} className="transition hover:bg-white/[0.025]">
                        <td className="px-4 py-3">
                          <p className="font-mono text-[11px] font-bold text-cream">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="max-w-[160px] truncate font-mono text-[9px] text-white/25">
                            {order.razorpay_order_id}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white/65">{customer}</p>
                          {order.shipping_address?.city && (
                            <p className="text-[10px] text-white/30">
                              {order.shipping_address.city},{" "}
                              {order.shipping_address.state}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/45">
                          {formatDate(order.created_at, locale)}
                        </td>
                        <td className="px-4 py-3 text-white/55">
                          {t("admin.orders.itemCount", { count: itemCount })}
                        </td>
                        <td className="px-4 py-3 font-bold text-cream">
                          {formatPrice(order.total_paise)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "badge gap-1 border",
                              statusStyles[order.status],
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {t(`orders.status.${order.status}`)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {itemModal !== undefined && (
        <ItemFormModal
          item={itemModal}
          languages={languages}
          locale={locale}
          defaultLanguage={languages[0]?.code ?? "mr"}
          onClose={() => setItemModal(undefined)}
          onSaved={onItemSaved}
        />
      )}

      {bulkOpen && (
        <BulkUploadModal
          languages={languages}
          onClose={() => setBulkOpen(false)}
          onImported={() => void reloadItems()}
        />
      )}

      {bannerModal !== undefined && (
        <BannerFormModal
          banner={bannerModal}
          languages={languages}
          locale={locale}
          onClose={() => setBannerModal(undefined)}
          onSaved={onBannerSaved}
        />
      )}
    </div>
  );
}
