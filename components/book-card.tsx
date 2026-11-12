"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen, Check, Plus, Smartphone } from "lucide-react";
import { useCart } from "@/lib/cart/cart-provider";
import { useI18n } from "@/lib/i18n/provider";
import { useToast } from "@/lib/ui/toast-provider";
import type { CatalogItem } from "@/lib/types";
import {
  cn,
  discountPercent,
  formatPrice,
  isPhysical,
  typeIsDigital,
} from "@/lib/utils";

export function BookCard({
  item,
  className,
  showAdd = true,
}: {
  item: CatalogItem;
  className?: string;
  showAdd?: boolean;
}) {
  const { t } = useI18n();
  const { addItem, lastAddedId } = useCart();
  const { toast } = useToast();

  const discount = discountPercent(item.price_paise, item.mrp_paise);
  const outOfStock = isPhysical(item) && item.stock_quantity < 1;
  const added = lastAddedId === item.id;
  const digital = typeIsDigital(item.item_type);

  function handleAdd(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (outOfStock) return;
    addItem(item);
    toast(
      t("item.added"),
      "success",
    );
  }

  return (
    <article className={cn("group relative flex min-w-0 flex-col", className)}>
      <div className="relative">
        <Link
          href={`/item/${item.slug}`}
          className="block overflow-hidden rounded-2xl border border-white/10 bg-ink-800 cover-shadow"
          aria-label={item.title}
        >
          <div className="relative aspect-[2/3] overflow-hidden">
            <Image
              src={item.cover_image_url}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 190px"
              className="object-cover transition duration-500 ease-out group-hover:scale-[1.045]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/75 via-transparent to-ink-950/10 opacity-80 transition group-hover:opacity-95" />

            <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5">
              <span className="badge border border-white/15 bg-ink-950/75 text-white/75 backdrop-blur">
                {digital ? (
                  <Smartphone className="h-3 w-3 text-saffron-300" />
                ) : (
                  <BookOpen className="h-3 w-3 text-rose-400" />
                )}
                {t(`format.${item.item_type}`)}
              </span>
              {item.is_latest_arrival && !outOfStock && (
                <span className="badge bg-saffron-400 text-ink-950">
                  {t("home.newBadge")}
                </span>
              )}
            </div>

            {discount > 0 && (
              <span className="absolute right-2 top-2 badge bg-rose-600 text-white shadow-lg">
                {t("card.off", { percent: discount })}
              </span>
            )}

            <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
              <span className="rounded-full border border-white/15 bg-ink-950/70 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/70 backdrop-blur">
                {item.language_code}
              </span>
              {outOfStock ? (
                <span className="rounded-full bg-ink-950/85 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-300">
                  {t("item.outOfStock")}
                </span>
              ) : (
                <span className="rounded-full bg-ink-950/70 px-2 py-0.5 text-[9px] font-bold text-white/55 backdrop-blur">
                  {digital ? t("format.digital") : t("format.physical")}
                </span>
              )}
            </div>
          </div>
        </Link>

        {showAdd && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            aria-label={t("item.addToCart")}
            className={cn(
              "absolute -bottom-3 right-2 grid h-9 w-9 place-items-center rounded-full border-2 border-ink-900 shadow-xl transition duration-300",
              added
                ? "bg-emerald-500 text-ink-950"
                : "bg-gradient-to-br from-saffron-300 to-saffron-500 text-ink-950 hover:scale-110",
              outOfStock && "cursor-not-allowed bg-white/15 text-white/30",
              "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
            )}
          >
            {added ? (
              <Check className="h-4 w-4" strokeWidth={3} />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={3} />
            )}
          </button>
        )}
      </div>

      <div className="mt-3 flex min-w-0 flex-1 flex-col">
        <Link href={`/item/${item.slug}`} className="min-w-0">
          <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-cream transition group-hover:text-saffron-300 sm:text-sm">
            {item.title}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-1 text-[11px] font-medium text-white/40">
          {item.author_or_publisher}
        </p>
        <div className="mt-auto flex items-baseline gap-1.5 pt-2">
          <span className="text-sm font-extrabold text-cream">
            {formatPrice(item.price_paise)}
          </span>
          {item.mrp_paise > item.price_paise && (
            <span className="text-[11px] font-medium text-white/30 line-through">
              {formatPrice(item.mrp_paise)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
