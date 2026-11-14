"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  ExternalLink,
  FileText,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { useCart } from "@/lib/cart/cart-provider";
import { useI18n } from "@/lib/i18n/provider";
import { useToast } from "@/lib/ui/toast-provider";
import type { CatalogItem } from "@/lib/types";
import {
  cn,
  formatPrice,
  isPhysical,
  typeIsDigital,
} from "@/lib/utils";

export function ProductActions({ item }: { item: CatalogItem }) {
  const { t } = useI18n();
  const { addItem, openCart, lastAddedId } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [sampleOpen, setSampleOpen] = useState(false);

  const physical = isPhysical(item);
  const digital = typeIsDigital(item.item_type);
  const maxQty = physical ? Math.min(10, item.stock_quantity) : 10;
  const outOfStock = physical && item.stock_quantity < 1;
  const added = lastAddedId === item.id;

  useEffect(() => {
    if (quantity > maxQty && maxQty > 0) setQuantity(maxQty);
  }, [maxQty, quantity]);

  function handleAdd() {
    if (outOfStock) return;
    addItem(item, quantity);
    toast(t("item.added"), "success");
  }

  function handleBuyNow() {
    if (outOfStock) return;
    addItem(item, quantity);
    openCart();
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast(t("item.share"), "info");
    } catch {
      // user cancelled share — do nothing
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-end gap-3">
        <span className="font-display text-3xl font-extrabold text-cream">
          {formatPrice(item.price_paise)}
        </span>
        {item.mrp_paise > item.price_paise && (
          <span className="pb-1 text-base text-white/35 line-through">
            {formatPrice(item.mrp_paise)}
          </span>
        )}
        <span className="mb-1 text-[11px] font-medium text-white/35">
          {t("item.taxNote")}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
        {outOfStock ? (
          <span className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1.5 text-rose-300">
            {t("item.outOfStock")}
          </span>
        ) : physical ? (
          <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-emerald-300">
            {t("item.inStock")}
            {item.stock_quantity <= 8 ? ` · ${t("item.stockLeft", { count: item.stock_quantity })}` : ""}
          </span>
        ) : (
          <span className="rounded-full border border-saffron-400/25 bg-saffron-400/10 px-3 py-1.5 text-saffron-300">
            {t("item.digitalDelivery")}
          </span>
        )}
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white/50">
          {t(`format.${item.item_type}`)}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-full border border-white/12 bg-white/[0.04]">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            disabled={quantity <= 1 || outOfStock}
            aria-label={t("cart.decrease")}
            className="grid h-11 w-10 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-cream disabled:opacity-30"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-7 text-center text-sm font-extrabold text-cream">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(maxQty, value + 1))}
            disabled={quantity >= maxQty || outOfStock}
            aria-label={t("cart.increase")}
            className="grid h-11 w-10 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-cream disabled:opacity-30"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          className={cn("btn-primary min-w-[170px] flex-1 sm:flex-none", added && "from-emerald-300 via-emerald-400 to-emerald-500")}
        >
          {added ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
          {added ? t("card.added") : t("item.addToCart")}
        </button>

        <button
          type="button"
          onClick={handleBuyNow}
          disabled={outOfStock}
          className="btn-secondary flex-1 sm:flex-none"
        >
          {t("item.buyNow")}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSampleOpen(true)}
          className="btn-ghost border border-white/10"
        >
          <BookOpen className="h-4 w-4 text-saffron-400" />
          {t("item.readSample")}
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="btn-ghost border border-white/10"
        >
          <Share2 className="h-4 w-4 text-white/50" />
          {t("item.share")}
        </button>
      </div>

      <ul className="mt-6 space-y-2 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/45">
        <li className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saffron-400" />
          {digital ? t("item.digitalDelivery") : t("item.freeShippingNote")}
        </li>
        {physical && (
          <li className="flex items-start gap-2">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
            {t("item.physicalDelivery")}
          </li>
        )}
      </ul>

      {sampleOpen && (
        <SampleModal item={item} onClose={() => setSampleOpen(false)} />
      )}
    </div>
  );
}

function SampleModal({
  item,
  onClose,
}: {
  item: CatalogItem;
  onClose: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label={t("item.sampleClose")}
        onClick={onClose}
        className="absolute inset-0 scrim backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sample-title"
        className="relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-850 shadow-drawer animate-fade-up sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div className="min-w-0">
            <p className="eyebrow">
              <BookOpen className="h-3.5 w-3.5" />
              {t("item.sampleTitle")}
            </p>
            <h2
              id="sample-title"
              className="mt-2 truncate text-xl font-extrabold text-cream"
            >
              {item.title}
            </h2>
            <p className="text-xs text-white/40">
              {t("item.author")} {item.author_or_publisher}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("item.sampleClose")}
            className="rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-cream"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
            <p className="whitespace-pre-line text-[15px] leading-[1.9] text-white/75">
              {item.description
                ? `${item.description}\n\n${t("item.sampleDemoBody")}`
                : t("item.sampleUnavailable")}
            </p>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-white/35">
            {t("item.sampleNote")}
          </p>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
          <span className="text-[11px] text-white/35">
            {t(`format.${item.item_type}`)} · {item.language_code.toUpperCase()}
          </span>
          <div className="flex items-center gap-2">
            {item.sample_pdf_url && (
              <Link
                href={item.sample_pdf_url}
                target="_blank"
                className="btn-secondary"
              >
                <ExternalLink className="h-4 w-4" />
                {t("item.readSample")}
              </Link>
            )}
            <Link href={`/item/${item.slug}`} onClick={onClose} className="btn-primary">
              {t("item.buyNow")}
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
