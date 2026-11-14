"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Headphones,
  LayoutDashboard,
  Library,
  LogIn,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { ThemePicker } from "@/components/theme-controls";
import { useAuth } from "@/lib/auth/auth-provider";
import { useI18n } from "@/lib/i18n/provider";
import { cn, formatDate, getInitials } from "@/lib/utils";

export function ProfilePage() {
  const { t, locale } = useI18n();
  const { user, profile, loading, isAdmin, signOut, configured } = useAuth();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "";
  const role = isAdmin ? t("profile.roleAdmin") : t("profile.roleCustomer");

  return (
    <div className="container-page py-8 sm:py-12">
      <header className="mb-7 max-w-2xl">
        <span className="eyebrow">
          <UserRound className="h-3.5 w-3.5" />
          {t("nav.account")}
        </span>
        <h1 className="mt-3 text-3xl font-extrabold text-cream sm:text-4xl">
          {t("profile.title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          {t("profile.subtitle")}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="surface p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-extrabold text-cream">
                {t("profile.accountTitle")}
              </h2>
              {user && (
                <span className="badge border border-saffron-400/25 bg-saffron-400/10 text-saffron-300">
                  {role}
                </span>
              )}
            </div>

            {loading && configured ? (
              <div className="mt-5 flex items-center gap-4">
                <span className="h-14 w-14 animate-pulse rounded-full bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <span className="block h-4 w-40 animate-pulse rounded bg-white/[0.06]" />
                  <span className="block h-3 w-56 animate-pulse rounded bg-white/[0.05]" />
                </div>
              </div>
            ) : user ? (
              <>
                <div className="mt-5 flex items-center gap-4">
                  <span
                    className={cn(
                      "grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-saffron-300 to-rose-600 text-lg font-extrabold text-on-accent",
                    )}
                  >
                    {getInitials(profile?.full_name, user.email)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-cream">
                      {displayName || t("nav.account")}
                    </p>
                    <p className="truncate text-xs text-white/45">
                      {t("profile.signedInAs")} · {user.email}
                    </p>
                    {profile?.created_at && (
                      <p className="mt-1 text-[11px] text-white/35">
                        {t("profile.memberSince", {
                          date: formatDate(profile.created_at, locale),
                        })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  <Link
                    href="/library"
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-saffron-400/40 hover:bg-white/[0.06]"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-saffron-400/10 text-saffron-300">
                      <Library className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-cream">
                        {t("profile.myLibrary")}
                      </span>
                      <span className="block truncate text-[11px] text-white/45">
                        {t("profile.myLibraryHint")}
                      </span>
                    </span>
                  </Link>

                  {isAdmin ? (
                    <Link
                      href="/admin"
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-rose-400/40 hover:bg-white/[0.06]"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-rose-500/10 text-rose-300">
                        <LayoutDashboard className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-cream">
                          {t("profile.adminPanel")}
                        </span>
                        <span className="block truncate text-[11px] text-white/45">
                          {t("profile.adminPanelHint")}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500/10 text-emerald-300">
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-cream">
                          {role}
                        </span>
                        <span className="block truncate text-[11px] text-white/45">
                          {t("profile.roleHint")}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold text-white/60 transition hover:border-rose-400/40 hover:text-rose-300"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {t("profile.signOut")}
                </button>
              </>
            ) : (
              <>
                <p className="mt-4 text-sm font-bold text-cream">
                  {t("profile.signedOutTitle")}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-white/50">
                  {t("profile.signedOutBody")}
                </p>
                <Link
                  href="/login"
                  className="btn-primary mt-5 px-5 py-2.5"
                >
                  <LogIn className="h-4 w-4" />
                  {t("profile.signIn")}
                </Link>
              </>
            )}
          </section>

          <section className="surface p-5 sm:p-6">
            <h2 className="text-sm font-extrabold text-cream">
              {t("profile.appearanceTitle")}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              {t("profile.appearanceSubtitle")}
            </p>
            <div className="mt-4">
              <ThemePicker />
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="surface relative overflow-hidden p-5 sm:p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-saffron-400/10 blur-3xl"
            />
            <span className="eyebrow">
              <Headphones className="h-3.5 w-3.5" />
              {t("profile.listeningTitle")}
            </span>
            <p className="mt-3 text-sm leading-relaxed text-white/55">
              {t("profile.listeningSubtitle")}
            </p>
            <Link
              href="/radio"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-saffron-300 transition hover:text-saffron-200"
            >
              {t("profile.openRadio")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <BookOpenText className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
              <p className="text-[11px] leading-relaxed text-white/45">
                {t("radio.audiobooksBody")}
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
