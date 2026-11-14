"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useCart } from "@/lib/cart/cart-provider";
import { demoCatalog } from "@/lib/demo";
import { addToDemoLibrary } from "@/lib/demo-library";
import { useI18n } from "@/lib/i18n/provider";
import type { ShippingAddress } from "@/lib/types";
import { cn, formatPrice, typeIsDigital } from "@/lib/utils";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

const emptyAddress: ShippingAddress = {
  name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

interface CheckoutSuccess {
  orderId: string;
  digital: boolean;
  physical: boolean;
  demo: boolean;
}

type AddressErrors = Partial<Record<keyof ShippingAddress, string>>;

function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no-window"));
  }
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT}"]`,
    );
    const onLoad = () => {
      if (window.Razorpay) resolve();
      else reject(new Error("razorpay-missing"));
    };
    const onError = () => reject(new Error("razorpay-load-failed"));

    if (existing) {
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", onError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.body.appendChild(script);
  });
}

export function CartDrawer() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, configured } = useAuth();
  const {
    lines,
    isOpen,
    hydrated,
    count,
    subtotalPaise,
    shippingPaise,
    totalPaise,
    hasPhysical,
    freeShippingRemainingPaise,
    setQuantity,
    removeItem,
    clearCart,
    closeCart,
  } = useCart();

  const [address, setAddress] = useState<ShippingAddress>(emptyAddress);
  const [errors, setErrors] = useState<AddressErrors>({});
  const [busy, setBusy] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CheckoutSuccess | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const demoTimerRef = useRef<number | null>(null);

  const digitalInCart = lines.some((line) => typeIsDigital(line.itemType));

  useEffect(
    () => () => {
      if (demoTimerRef.current !== null) {
        window.clearTimeout(demoTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      setPaymentError(null);
      setSuccess(null);
      setBusy(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => closeRef.current?.focus(), 120);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = original;
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!profile) return;
    setAddress((current) => ({
      ...current,
      name: current.name || profile.full_name || "",
      phone: current.phone || profile.phone || "",
    }));
  }, [profile]);

  function handleClose() {
    setPaymentError(null);
    setSuccess(null);
    closeCart();
  }

  function updateField(field: keyof ShippingAddress, value: string) {
    setAddress((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validateAddress(): boolean {
    const next: AddressErrors = {};
    if (address.name.trim().length < 2) next.name = t("validation.nameRequired");
    if (!/^[6-9]\d{9}$/.test(address.phone.replace(/\D/g, "").slice(-10))) {
      next.phone = t("validation.phone");
    }
    if (address.address.trim().length < 8) next.address = t("validation.address");
    if (address.city.trim().length < 2) next.city = t("validation.city");
    if (address.state.trim().length < 2) next.state = t("validation.state");
    if (!/^\d{6}$/.test(address.pincode.trim())) {
      next.pincode = t("validation.pincode");
    }
    setErrors(next);
    if (Object.keys(next).length) {
      const first = Object.keys(next)[0];
      document.getElementById(`cart-address-${first}`)?.focus();
      return false;
    }
    return true;
  }

  function errorMessage(code: string | undefined, fallback: string) {
    switch (code) {
      case "UNAUTHENTICATED":
        return t("checkout.loginRequired");
      case "RAZORPAY_NOT_CONFIGURED":
        return t("errors.razorpayMissing");
      case "SUPABASE_NOT_CONFIGURED":
      case "DEMO_MODE":
        return t("errors.demoCheckout");
      case "ADDRESS_REQUIRED":
        return t("validation.addressRequired");
      case "OUT_OF_STOCK":
      case "ITEM_UNAVAILABLE":
        return t("errors.checkoutFailed");
      case "INVALID_SIGNATURE":
        return t("errors.paymentVerificationFailed");
      case "GENERIC":
        return t("errors.checkoutFailed");
      default:
        return fallback;
    }
  }

  function completeDemoCheckout() {
    const orderId = `DEMO-${Date.now().toString(36).toUpperCase()}`;
    const unlocked = lines
      .filter((line) => typeIsDigital(line.itemType))
      .map((line) => demoCatalog.find((item) => item.id === line.id))
      .filter((item): item is (typeof demoCatalog)[number] => Boolean(item));

    if (unlocked.length) addToDemoLibrary(unlocked, orderId);

    setSuccess({
      orderId,
      digital: digitalInCart,
      physical: hasPhysical,
      demo: true,
    });
    setBusy(false);
    clearCart();
  }

  async function handleCheckout() {
    setPaymentError(null);
    if (!hydrated || !lines.length || busy) return;

    if (hasPhysical && !validateAddress()) return;

    if (!configured) {
      setBusy(true);
      demoTimerRef.current = window.setTimeout(() => {
        demoTimerRef.current = null;
        completeDemoCheckout();
      }, 650);
      return;
    }

    if (!user) {
      const next = encodeURIComponent(pathname || "/");
      handleClose();
      router.push(`/login?next=${next}`);
      return;
    }

    setBusy(true);
    try {
      const normalizedPhone = address.phone.replace(/\D/g, "").slice(-10);
      const response = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((line) => ({ id: line.id, quantity: line.quantity })),
          shippingAddress: hasPhysical
            ? { ...address, phone: normalizedPhone }
            : null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPaymentError(
          errorMessage(data?.code ?? data?.error, t("errors.checkoutFailed")),
        );
        setBusy(false);
        return;
      }

      await loadRazorpay();

      const digital = digitalInCart;
      const physical = hasPhysical;
      const internalOrderId = String(data.orderId);
      const payment = new window.Razorpay!({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency ?? "INR",
        name: t("brand.name"),
        description: t("cart.checkout"),
        image: "/icon.svg",
        order_id: data.razorpayOrderId,
        prefill: {
          name: address.name || profile?.full_name || undefined,
          email: user.email ?? undefined,
          contact: normalizedPhone || undefined,
        },
        notes: { internal_order_id: internalOrderId },
        theme: { color: "#F59E0B" },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setPaymentError(t("checkout.failedBody"));
          },
        },
        handler: async (result) => {
          setBusy(true);
          try {
            const verify = await fetch("/api/checkout/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(result),
            });
            const verifyData = await verify.json().catch(() => ({}));
            if (!verify.ok) {
              setPaymentError(
                errorMessage(
                  verifyData?.code ?? verifyData?.error,
                  t("errors.paymentVerificationFailed"),
                ),
              );
              setBusy(false);
              return;
            }
            setSuccess({
              orderId: internalOrderId,
              digital,
              physical,
              demo: false,
            });
            clearCart();
          } catch {
            setPaymentError(t("errors.network"));
          } finally {
            setBusy(false);
          }
        },
      });

      payment.on("payment.failed", (failure) => {
        setPaymentError(
          failure?.error?.description || t("checkout.failedBody"),
        );
        setBusy(false);
      });

      setBusy(false);
      payment.open();
    } catch (error) {
      setPaymentError(
        error instanceof Error && error.message.startsWith("razorpay")
          ? t("errors.razorpayMissing")
          : t("errors.checkoutFailed"),
      );
      setBusy(false);
    }
  }

  const shippingProgress =
    freeShippingRemainingPaise <= 0
      ? 100
      : Math.min(
          100,
          Math.round(
            (subtotalPaise / (subtotalPaise + freeShippingRemainingPaise)) * 100,
          ),
        );

  const payLabel = !configured
    ? t("checkout.payNow", { amount: formatPrice(totalPaise) })
    : !user
      ? t("cart.loginToCheckout")
      : t("checkout.payNow", { amount: formatPrice(totalPaise) });

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80]",
        isOpen ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        tabIndex={isOpen ? 0 : -1}
        aria-label={t("cart.close")}
        onClick={handleClose}
        className={cn(
          "absolute inset-0 scrim backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0",
        )}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/10 bg-ink-900 shadow-drawer transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2
              id="cart-title"
              className="flex items-center gap-2 text-lg font-extrabold text-cream"
            >
              <ShoppingBag className="h-5 w-5 text-saffron-400" />
              {success ? t("checkout.successTitle") : t("cart.title")}
            </h2>
            {!success && (
              <p className="mt-0.5 text-xs text-white/40">
                {t("cart.subtitle", { count })}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={handleClose}
            aria-label={t("cart.close")}
            className="rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-cream"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {success ? (
          <div className="flex flex-1 flex-col overflow-y-auto px-5 py-8 animate-fade-up">
            <div className="text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-emerald-400/30 bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </span>
              <h3 className="mt-5 text-xl font-extrabold text-cream">
                {t("checkout.successTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                {t("checkout.successBody")}
              </p>
            </div>

            <div className="surface-soft mt-6 space-y-3 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/45">{t("checkout.orderRef")}</span>
                <span className="truncate font-mono text-xs font-bold text-saffron-300">
                  {success.orderId}
                </span>
              </div>
              {success.digital && (
                <p className="flex items-start gap-2 leading-relaxed text-white/60">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-saffron-400" />
                  {t("checkout.successDigital")}
                </p>
              )}
              {success.physical && (
                <p className="flex items-start gap-2 leading-relaxed text-white/60">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  {t("checkout.successPhysical")}
                </p>
              )}
              {success.demo && (
                <p className="rounded-xl border border-saffron-400/20 bg-saffron-400/[0.06] p-3 text-xs leading-relaxed text-saffron-200/80">
                  {t("checkout.demoBody")}
                </p>
              )}
            </div>

            <div className="mt-6 space-y-2.5">
              <Link
                href="/library"
                onClick={handleClose}
                className="btn-primary w-full"
              >
                {t("checkout.libraryCta")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/browse"
                onClick={handleClose}
                className="btn-secondary w-full"
              >
                {t("checkout.homeCta")}
              </Link>
            </div>
          </div>
        ) : !hydrated ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-saffron-400" />
          </div>
        ) : lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 py-12 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
              <ShoppingBag className="h-7 w-7 text-white/25" />
            </span>
            <h3 className="mt-5 text-lg font-extrabold text-cream">
              {t("cart.emptyTitle")}
            </h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/45">
              {t("cart.emptyBody")}
            </p>
            <Link
              href="/browse"
              onClick={handleClose}
              className="btn-primary mt-6"
            >
              {t("cart.browse")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {hasPhysical && (
                <div className="mb-4 rounded-2xl border border-saffron-400/20 bg-saffron-400/[0.05] p-3.5 text-xs leading-relaxed text-saffron-100/70">
                  <p className="flex items-start gap-2">
                    <Truck className="mt-0.5 h-4 w-4 shrink-0 text-saffron-400" />
                    {digitalInCart ? t("cart.mixedNote") : t("cart.shippingNote")}
                  </p>
                </div>
              )}
              {!hasPhysical && digitalInCart && (
                <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] p-3.5 text-xs leading-relaxed text-emerald-100/70">
                  <p className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {t("cart.digitalNote")}
                  </p>
                </div>
              )}

              <ul className="space-y-3">
                {lines.map((line) => (
                  <li
                    key={line.id}
                    className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-2.5"
                  >
                    <Link
                      href={`/item/${line.slug}`}
                      onClick={handleClose}
                      className="relative h-[86px] w-[60px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-ink-800"
                    >
                      <Image
                        src={line.cover}
                        alt={line.title}
                        fill
                        sizes="60px"
                        className="object-cover"
                      />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/item/${line.slug}`}
                            onClick={handleClose}
                            className="line-clamp-2 text-[13px] font-bold leading-snug text-cream hover:text-saffron-300"
                          >
                            {line.title}
                          </Link>
                          <p className="mt-0.5 truncate text-[11px] text-white/35">
                            {line.author}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(line.id)}
                          aria-label={t("cart.remove")}
                          className="shrink-0 rounded-full p-1.5 text-white/30 transition hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                        <div className="flex items-center rounded-full border border-white/10 bg-ink-950/50">
                          <button
                            type="button"
                            onClick={() => setQuantity(line.id, line.quantity - 1)}
                            disabled={line.quantity <= 1}
                            aria-label={t("cart.decrease")}
                            className="grid h-7 w-7 place-items-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-cream disabled:opacity-30"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-5 text-center text-[11px] font-extrabold text-cream">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity(line.id, line.quantity + 1)}
                            aria-label={t("cart.increase")}
                            className="grid h-7 w-7 place-items-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-cream"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-cream">
                            {formatPrice(line.pricePaise * line.quantity)}
                          </p>
                          <p className="text-[10px] text-white/30">
                            {t(`format.${line.itemType}`)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {hasPhysical && (
                <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-start gap-2">
                    <Truck className="mt-0.5 h-4 w-4 shrink-0 text-saffron-400" />
                    <div>
                      <h3 className="text-sm font-extrabold text-cream">
                        {t("checkout.shippingTitle")}
                      </h3>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-white/40">
                        {t("checkout.shippingHint")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="field-label" htmlFor="cart-address-name">
                        {t("checkout.name")}
                      </label>
                      <input
                        id="cart-address-name"
                        value={address.name}
                        onChange={(event) => updateField("name", event.target.value)}
                        placeholder={t("checkout.namePlaceholder")}
                        autoComplete="name"
                        aria-invalid={Boolean(errors.name)}
                        className={cn("field", errors.name && "border-rose-500/60")}
                      />
                      {errors.name && (
                        <p className="mt-1 text-[11px] text-rose-400">{errors.name}</p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <label className="field-label" htmlFor="cart-address-phone">
                        {t("checkout.phone")}
                      </label>
                      <input
                        id="cart-address-phone"
                        value={address.phone}
                        onChange={(event) => updateField("phone", event.target.value)}
                        placeholder={t("checkout.phonePlaceholder")}
                        inputMode="tel"
                        autoComplete="tel"
                        aria-invalid={Boolean(errors.phone)}
                        className={cn("field", errors.phone && "border-rose-500/60")}
                      />
                      {errors.phone && (
                        <p className="mt-1 text-[11px] text-rose-400">{errors.phone}</p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <label className="field-label" htmlFor="cart-address-address">
                        {t("checkout.address")}
                      </label>
                      <textarea
                        id="cart-address-address"
                        value={address.address}
                        onChange={(event) => updateField("address", event.target.value)}
                        placeholder={t("checkout.addressPlaceholder")}
                        rows={2}
                        autoComplete="street-address"
                        aria-invalid={Boolean(errors.address)}
                        className={cn(
                          "field resize-none",
                          errors.address && "border-rose-500/60",
                        )}
                      />
                      {errors.address && (
                        <p className="mt-1 text-[11px] text-rose-400">{errors.address}</p>
                      )}
                    </div>

                    <div>
                      <label className="field-label" htmlFor="cart-address-city">
                        {t("checkout.city")}
                      </label>
                      <input
                        id="cart-address-city"
                        value={address.city}
                        onChange={(event) => updateField("city", event.target.value)}
                        placeholder={t("checkout.cityPlaceholder")}
                        autoComplete="address-level2"
                        aria-invalid={Boolean(errors.city)}
                        className={cn("field", errors.city && "border-rose-500/60")}
                      />
                      {errors.city && (
                        <p className="mt-1 text-[11px] text-rose-400">{errors.city}</p>
                      )}
                    </div>

                    <div>
                      <label className="field-label" htmlFor="cart-address-state">
                        {t("checkout.state")}
                      </label>
                      <input
                        id="cart-address-state"
                        value={address.state}
                        onChange={(event) => updateField("state", event.target.value)}
                        placeholder={t("checkout.statePlaceholder")}
                        autoComplete="address-level1"
                        aria-invalid={Boolean(errors.state)}
                        className={cn("field", errors.state && "border-rose-500/60")}
                      />
                      {errors.state && (
                        <p className="mt-1 text-[11px] text-rose-400">{errors.state}</p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <label className="field-label" htmlFor="cart-address-pincode">
                        {t("checkout.pincode")}
                      </label>
                      <input
                        id="cart-address-pincode"
                        value={address.pincode}
                        onChange={(event) => updateField("pincode", event.target.value)}
                        placeholder={t("checkout.pincodePlaceholder")}
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="postal-code"
                        aria-invalid={Boolean(errors.pincode)}
                        className={cn(
                          "field",
                          errors.pincode && "border-rose-500/60",
                        )}
                      />
                      {errors.pincode && (
                        <p className="mt-1 text-[11px] text-rose-400">{errors.pincode}</p>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </div>

            <footer className="border-t border-white/10 bg-ink-900 px-5 pb-5 pt-4">
              {hasPhysical && (
                <div className="mb-4">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 text-white/45">
                      <Truck className="h-3.5 w-3.5" />
                      {freeShippingRemainingPaise > 0
                        ? t("cart.freeShippingProgress", {
                            amount: formatPrice(freeShippingRemainingPaise),
                          })
                        : t("cart.freeShippingDone")}
                    </span>
                    <span className="font-bold text-saffron-300">
                      {shippingPaise === 0
                        ? t("cart.free")
                        : formatPrice(shippingPaise)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-saffron-400 to-rose-500 transition-all duration-500"
                      style={{ width: `${shippingProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <dl className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-white/45">{t("cart.subtotal")}</dt>
                  <dd className="font-semibold text-cream">
                    {formatPrice(subtotalPaise)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-white/45">{t("cart.shipping")}</dt>
                  <dd className="font-semibold text-cream">
                    {!hasPhysical
                      ? t("common.free")
                      : shippingPaise === 0
                        ? t("cart.free")
                        : formatPrice(shippingPaise)}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <dt className="text-sm font-bold text-cream">{t("cart.total")}</dt>
                  <dd className="text-base font-extrabold text-saffron-300">
                    {formatPrice(totalPaise)}
                  </dd>
                </div>
              </dl>

              {paymentError && (
                <p className="mt-3 flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 p-2.5 text-[11px] leading-relaxed text-rose-200">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {paymentError}
                </p>
              )}

              {!configured && (
                <p className="mt-3 rounded-xl border border-saffron-400/20 bg-saffron-400/[0.06] p-2.5 text-[11px] leading-relaxed text-saffron-200/75">
                  {t("checkout.demoBody")}
                </p>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={busy}
                className="btn-primary mt-3 w-full"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("checkout.paying")}
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    {payLabel}
                  </>
                )}
              </button>

              {configured && !user && (
                <p className="mt-2 text-center text-[11px] text-white/35">
                  {t("cart.loginHint")}
                </p>
              )}

              <div className="mt-2 flex items-center justify-between text-[10px] text-white/30">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-400/70" />
                  {t("checkout.secure")}
                </span>
                <button
                  type="button"
                  onClick={handleClose}
                  className="font-semibold text-white/40 transition hover:text-cream"
                >
                  {t("cart.continueShopping")}
                </button>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
