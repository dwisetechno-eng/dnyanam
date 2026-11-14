"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  Library,
  LogIn,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { LanguageSwitcher, LanguageSwitcherMenu } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-controls";
import { useAuth } from "@/lib/auth/auth-provider";
import { useCart } from "@/lib/cart/cart-provider";
import { useI18n } from "@/lib/i18n/provider";
import { cn, getInitials } from "@/lib/utils";

const navLinks = [
  { href: "/", key: "nav.home" },
  { href: "/browse", key: "nav.browse" },
  { href: "/radio", key: "nav.radio" },
  { href: "/library", key: "nav.library" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { count, openCart, hydrated } = useCart();
  const { user, profile, loading, isAdmin, signOut, configured } = useAuth();

  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [query, setQuery] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAccountOpen(false);
    setMobileOpen(false);
    setMobileSearch(false);
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!term) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(term)}`);
    setMobileSearch(false);
    setMobileOpen(false);
  }

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-900/85 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center gap-3 sm:h-[72px] sm:gap-5">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="btn-ghost -ml-2 p-2.5 lg:hidden"
          aria-label={t("nav.menu")}
        >
          <Menu className="h-5 w-5" />
        </button>

        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label={t("nav.menu")}>
          {navLinks.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[13px] font-semibold transition",
                  active
                    ? "bg-white/[0.08] text-cream"
                    : "text-white/55 hover:bg-white/[0.05] hover:text-cream",
                )}
              >
                {t(link.key)}
              </Link>
            );
          })}
        </nav>

        <form
          onSubmit={submitSearch}
          className="relative ml-auto hidden w-full max-w-md md:block"
          role="search"
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("nav.searchPlaceholder")}
            aria-label={t("nav.search")}
            className="w-full rounded-full border border-white/10 bg-white/[0.05] py-2.5 pl-10 pr-4 text-sm text-cream outline-none transition placeholder:text-white/30 focus:border-saffron-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-saffron-400/15"
          />
        </form>

        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <button
            type="button"
            onClick={() => setMobileSearch((open) => !open)}
            className="btn-ghost p-2.5 md:hidden"
            aria-label={t("nav.search")}
            aria-expanded={mobileSearch}
          >
            <Search className="h-5 w-5" />
          </button>

          <LanguageSwitcher className="hidden sm:inline-flex" />

          <ThemeToggle className="hidden sm:inline-flex" />

          {loading && configured ? (
            <span className="hidden h-9 w-24 animate-pulse rounded-full bg-white/[0.06] sm:block" />
          ) : user ? (
            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] p-1 pr-1.5 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-saffron-300 to-rose-600 text-[11px] font-extrabold text-on-accent">
                  {getInitials(profile?.full_name, user.email)}
                </span>
                <span className="hidden max-w-[110px] truncate text-xs font-semibold text-cream sm:block">
                  {displayName}
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-white/40 sm:block" />
              </button>

              {accountOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+10px)] w-64 overflow-hidden rounded-2xl border border-white/10 bg-ink-850/95 p-2 shadow-drawer backdrop-blur-xl animate-fade-up"
                >
                  <div className="border-b border-white/10 px-3 pb-3 pt-2">
                    <p className="truncate text-sm font-bold text-cream">
                      {displayName || t("nav.account")}
                    </p>
                    <p className="truncate text-xs text-white/40">{user.email}</p>
                  </div>
                  <div className="space-y-0.5 pt-2">
                    <Link
                      href="/profile"
                      role="menuitem"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/[0.06] hover:text-cream"
                    >
                      <UserRound className="h-4 w-4 text-saffron-400" />
                      {t("nav.profile")}
                    </Link>
                    <Link
                      href="/library"
                      role="menuitem"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/[0.06] hover:text-cream"
                    >
                      <Library className="h-4 w-4 text-saffron-400" />
                      {t("nav.library")}
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        role="menuitem"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/[0.06] hover:text-cream"
                      >
                        <LayoutDashboard className="h-4 w-4 text-rose-400" />
                        {t("nav.admin")}
                      </Link>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAccountOpen(false);
                        void signOut();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/60 transition hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("nav.signOut")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-bold text-cream transition hover:border-saffron-400/40 hover:bg-white/[0.08] sm:flex"
            >
              <UserRound className="h-4 w-4 text-saffron-400" />
              {t("nav.signIn")}
            </Link>
          )}

          <button
            type="button"
            onClick={openCart}
            className="relative flex items-center gap-2 rounded-full bg-gradient-to-r from-saffron-300 to-saffron-500 px-3 py-2.5 text-on-accent shadow-[0_8px_24px_-10px_rgba(245,158,11,0.8)] transition hover:from-saffron-200 hover:to-saffron-400 active:scale-95 sm:px-4"
            aria-label={t("nav.cart")}
          >
            <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2.4} />
            <span className="hidden text-xs font-extrabold sm:block">
              {t("nav.cart")}
            </span>
            {hydrated && count > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#0B0F19] px-1 text-[10px] font-extrabold text-[#FCD34D]">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {mobileSearch && (
        <div className="container-page pb-3 md:hidden">
          <form onSubmit={submitSearch} role="search" className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("nav.searchPlaceholder")}
              aria-label={t("nav.search")}
              className="w-full rounded-full border border-white/10 bg-white/[0.05] py-2.5 pl-10 pr-4 text-sm text-cream outline-none focus:border-saffron-400/50"
            />
          </form>
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("nav.close")}
            className="absolute inset-0 scrim backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col border-r border-white/10 bg-ink-900 p-5 shadow-drawer animate-slide-in">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-cream"
                aria-label={t("nav.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitSearch} role="search" className="relative mt-6">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("nav.searchPlaceholder")}
                aria-label={t("nav.search")}
                className="w-full rounded-full border border-white/10 bg-white/[0.05] py-2.5 pl-10 pr-4 text-sm text-cream outline-none focus:border-saffron-400/50"
              />
            </form>

            <nav className="mt-6 space-y-1" aria-label={t("nav.menu")}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3.5 py-3 text-[15px] font-semibold transition",
                    pathname === link.href
                      ? "bg-saffron-400/10 text-saffron-300"
                      : "text-white/65 hover:bg-white/[0.06] hover:text-cream",
                  )}
                >
                  {t(link.key)}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center justify-between rounded-xl px-3.5 py-3 text-[15px] font-semibold text-white/65 transition hover:bg-white/[0.06] hover:text-cream"
                >
                  {t("nav.admin")}
                </Link>
              )}
            </nav>

            <div className="mt-auto space-y-4 border-t border-white/10 pt-5">
              <LanguageSwitcherMenu />
              <div className="flex items-center gap-2">
                <ThemeToggle />
                {user && (
                  <Link
                    href="/profile"
                    className="btn-secondary flex-1 px-4 py-2.5"
                    onClick={() => setMobileOpen(false)}
                  >
                    <UserRound className="h-4 w-4" />
                    {t("nav.profile")}
                  </Link>
                )}
              </div>
              {!user && (
                <Link
                  href="/login"
                  className="btn-primary w-full"
                  onClick={() => setMobileOpen(false)}
                >
                  <LogIn className="h-4 w-4" />
                  {t("nav.signIn")}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
