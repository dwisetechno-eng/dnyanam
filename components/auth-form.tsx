"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookMarked,
  Check,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useAuth } from "@/lib/auth/auth-provider";
import { useI18n } from "@/lib/i18n/provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "signIn" | "signUp";

type AuthErrorKind =
  | "invalid"
  | "unconfirmed"
  | "rate"
  | "exists"
  | "weak"
  | "generic";

interface FieldErrors {
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
}

/** Supabase returns English messages; classify them so we can show useful copy. */
function classifyAuthError(message: string): AuthErrorKind {
  const text = message.toLowerCase();
  if (text.includes("email not confirmed") || text.includes("not confirmed")) {
    return "unconfirmed";
  }
  if (
    text.includes("rate limit") ||
    text.includes("too many") ||
    text.includes("sending confirmation") ||
    text.includes("error sending")
  ) {
    return "rate";
  }
  if (
    text.includes("already registered") ||
    text.includes("already been registered") ||
    text.includes("user already exists")
  ) {
    return "exists";
  }
  if (text.includes("weak") || text.includes("password should")) {
    return "weak";
  }
  if (text.includes("invalid")) return "invalid";
  return "generic";
}

const AUTH_ERROR_KEYS: Record<AuthErrorKind, string> = {
  invalid: "auth.invalidCredentials",
  unconfirmed: "auth.emailNotConfirmed",
  rate: "auth.emailRateLimited",
  exists: "auth.emailExists",
  weak: "auth.weakPassword",
  generic: "auth.genericError",
};

export function AuthForm({
  next,
  initialError,
}: {
  next: string;
  initialError?: string | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { user, loading, configured } = useAuth();

  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(
    initialError ? t("auth.callbackError") : null,
  );
  const [errorKind, setErrorKind] = useState<AuthErrorKind | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(
    initialError && initialError !== "auth_callback" ? initialError : null,
  );
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const [resendNote, setResendNote] = useState<"sent" | "error" | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace(next);
    }
  }, [loading, next, router, user]);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = t("validation.email");
    }
    if (password.length < 8) {
      nextErrors.password = t("validation.minPassword");
    }
    if (mode === "signUp") {
      if (fullName.trim().length < 2) {
        nextErrors.fullName = t("validation.nameRequired");
      }
      if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.replace(/\D/g, "").slice(-10))) {
        nextErrors.phone = t("validation.phone");
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function fail(message: string, kind?: AuthErrorKind) {
    const resolved = kind ?? classifyAuthError(message);
    setErrorKind(resolved);
    setErrorDetail(message || null);
    setFormError(t(AUTH_ERROR_KEYS[resolved]));
    setResendNote(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setErrorKind(null);
    setErrorDetail(null);
    setResendNote(null);
    if (!validate()) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFormError(t("auth.demoBody"));
      return;
    }

    setBusy(true);
    try {
      if (mode === "signIn") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          fail(error.message || t("auth.genericError"));
          return;
        }
        router.push(next);
        router.refresh();
      } else {
        const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
        setPendingEmail(email.trim());
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: normalizedPhone || null,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) {
          fail(error.message || t("auth.genericError"));
          return;
        }
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setCheckEmail(true);
        }
      }
    } catch {
      setErrorKind("generic");
      setErrorDetail(null);
      setFormError(t("auth.genericError"));
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation(target: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const address = (target || pendingEmail || email).trim();
    if (!address) return;

    setResendBusy(true);
    setResendNote(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: address,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setResendNote(error ? "error" : "sent");
      if (error) setErrorDetail(error.message);
    } catch {
      setResendNote("error");
    } finally {
      setResendBusy(false);
    }
  }

  function switchMode() {
    setMode((current) => (current === "signIn" ? "signUp" : "signIn"));
    setErrors({});
    setFormError(null);
    setErrorKind(null);
    setErrorDetail(null);
    setCheckEmail(false);
    setResendNote(null);
  }

  const isSignUp = mode === "signUp";

  if (loading && configured) {
    return (
      <div className="container-page flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-saffron-400" />
      </div>
    );
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-ink-800/60 shadow-card lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="relative hidden overflow-hidden border-r border-white/10 bg-ink-900/60 p-9 lg:flex lg:flex-col">
          <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-90" />
          <div className="relative flex flex-1 flex-col">
            <Logo />
            <div className="mt-auto py-10">
              <span className="eyebrow">
                <Sparkles className="h-3.5 w-3.5" />
                {t("brand.tagline")}
              </span>
              <h2 className="mt-4 text-balance text-3xl font-extrabold leading-tight text-cream">
                {t("meta.title")}
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/50">
                {t("meta.description")}
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  { icon: BookMarked, label: t("library.subtitle") },
                  { icon: Sparkles, label: t("home.ebooksSub") },
                  { icon: Lock, label: t("checkout.secure") },
                ].map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-start gap-2.5 text-xs leading-relaxed text-white/55"
                  >
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-saffron-400/15">
                      <Check className="h-3 w-3 text-saffron-400" />
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            <p className="relative text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
              {t("footer.madeFor")}
            </p>
          </div>
        </aside>

        <div className="p-6 sm:p-9">
          <div className="flex items-center justify-between gap-3">
            <span className="lg:hidden">
              <Logo compact />
            </span>
            <LanguageSwitcher className="ml-auto" />
          </div>

          {!configured ? (
            <div className="mt-8 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-saffron-400/25 bg-saffron-400/10">
                <Lock className="h-6 w-6 text-saffron-400" />
              </span>
              <h1 className="mt-5 text-2xl font-extrabold text-cream">
                {t("auth.demoTitle")}
              </h1>
              <p className="mt-3 text-left text-sm leading-relaxed text-white/50">
                {t("auth.demoBody")}
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Link href="/browse" className="btn-primary">
                  {t("cart.browse")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/" className="btn-secondary">
                  {t("auth.backHome")}
                </Link>
              </div>
            </div>
          ) : checkEmail ? (
            <div className="mt-8 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-emerald-400/25 bg-emerald-500/10">
                <Mail className="h-6 w-6 text-emerald-400" />
              </span>
              <h1 className="mt-5 text-2xl font-extrabold text-cream">
                {t("auth.checkEmail")}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-white/50">
                {t("auth.checkEmailBody")}
              </p>
              {pendingEmail && (
                <p className="mt-1.5 text-xs font-semibold text-white/60">
                  {pendingEmail}
                </p>
              )}
              <p className="mx-auto mt-4 max-w-xs text-[11px] leading-relaxed text-white/40">
                {t("auth.checkEmailSpam")}
              </p>
              <button
                type="button"
                onClick={() => void resendConfirmation(pendingEmail)}
                disabled={resendBusy || !pendingEmail}
                className="btn-secondary mt-5"
              >
                {resendBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {resendBusy ? t("auth.resending") : t("auth.resend")}
              </button>
              {resendNote === "sent" && (
                <p className="mt-2 text-[11px] font-semibold text-emerald-400">
                  {t("auth.resent")}
                </p>
              )}
              {resendNote === "error" && (
                <p className="mt-2 text-[11px] font-semibold text-rose-300">
                  {t("auth.resendFailed")}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setCheckEmail(false);
                  setMode("signIn");
                }}
                className="btn-secondary mt-6"
              >
                {t("auth.signIn")}
              </button>
            </div>
          ) : (
            <>
              <h1 className="mt-6 text-2xl font-extrabold text-cream sm:text-3xl">
                {isSignUp ? t("auth.signUpTitle") : t("auth.signInTitle")}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/45">
                {isSignUp ? t("auth.signUpSubtitle") : t("auth.signInSubtitle")}
              </p>

              <div className="mt-6 flex rounded-full border border-white/10 bg-white/[0.03] p-1">
                <button
                  type="button"
                  onClick={() => setMode("signIn")}
                  className={cn(
                    "flex-1 rounded-full px-4 py-2 text-xs font-bold transition",
                    mode === "signIn"
                      ? "bg-saffron-400 text-on-accent"
                      : "text-white/50 hover:text-cream",
                  )}
                >
                  {t("auth.signIn")}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signUp")}
                  className={cn(
                    "flex-1 rounded-full px-4 py-2 text-xs font-bold transition",
                    mode === "signUp"
                      ? "bg-saffron-400 text-on-accent"
                      : "text-white/50 hover:text-cream",
                  )}
                >
                  {t("auth.signUp")}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                {isSignUp && (
                  <div>
                    <label className="field-label" htmlFor="auth-name">
                      {t("auth.fullName")}
                    </label>
                    <input
                      id="auth-name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder={t("auth.namePlaceholder")}
                      autoComplete="name"
                      className={cn("field", errors.fullName && "border-rose-500/60")}
                    />
                    {errors.fullName && (
                      <p className="mt-1 text-[11px] text-rose-400">{errors.fullName}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="field-label" htmlFor="auth-email">
                    {t("auth.email")}
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t("auth.emailPlaceholder")}
                    autoComplete="email"
                    className={cn("field", errors.email && "border-rose-500/60")}
                  />
                  {errors.email && (
                    <p className="mt-1 text-[11px] text-rose-400">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="field-label" htmlFor="auth-password">
                    {t("auth.password")}
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    className={cn("field", errors.password && "border-rose-500/60")}
                  />
                  {errors.password ? (
                    <p className="mt-1 text-[11px] text-rose-400">{errors.password}</p>
                  ) : (
                    <p className="mt-1 text-[10px] text-white/30">
                      {t("auth.passwordHint")}
                    </p>
                  )}
                </div>

                {isSignUp && (
                  <div>
                    <label className="field-label" htmlFor="auth-phone">
                      {t("auth.phone")}{" "}
                      <span className="normal-case tracking-normal text-white/25">
                        ({t("common.optional")})
                      </span>
                    </label>
                    <input
                      id="auth-phone"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder={t("auth.phonePlaceholder")}
                      inputMode="tel"
                      autoComplete="tel"
                      className={cn("field", errors.phone && "border-rose-500/60")}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-[11px] text-rose-400">{errors.phone}</p>
                    )}
                  </div>
                )}

                {formError && (
                  <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-200">
                    <p>{formError}</p>
                    {errorKind === "unconfirmed" && (
                      <button
                        type="button"
                        onClick={() =>
                          void resendConfirmation(pendingEmail || email)
                        }
                        disabled={resendBusy}
                        className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-rose-300/40 bg-rose-500/10 px-3 py-1.5 text-[11px] font-bold text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-60"
                      >
                        {resendBusy ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Mail className="h-3 w-3" />
                        )}
                        {resendBusy ? t("auth.resending") : t("auth.resend")}
                      </button>
                    )}
                    {resendNote === "sent" && (
                      <p className="mt-2 text-[11px] font-semibold text-emerald-300">
                        {t("auth.resent")}
                      </p>
                    )}
                    {resendNote === "error" && (
                      <p className="mt-2 text-[11px] font-semibold text-rose-300">
                        {t("auth.resendFailed")}
                      </p>
                    )}
                    {errorDetail && errorDetail !== formError && (
                      <p className="mt-2 font-mono text-[10px] leading-relaxed text-rose-200/70">
                        {errorDetail}
                      </p>
                    )}
                  </div>
                )}

                <button type="submit" disabled={busy} className="btn-primary w-full">
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isSignUp ? t("auth.signingUp") : t("auth.signingIn")}
                    </>
                  ) : isSignUp ? (
                    <>
                      <UserPlus className="h-4 w-4" />
                      {t("auth.signUp")}
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      {t("auth.signIn")}
                    </>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={switchMode}
                className="mt-5 w-full text-center text-xs font-semibold text-white/40 transition hover:text-saffron-300"
              >
                {isSignUp ? t("auth.switchToSignIn") : t("auth.switchToSignUp")}
              </button>
            </>
          )}

          <Link
            href="/"
            className="mt-8 block text-center text-[11px] font-semibold text-white/30 transition hover:text-cream"
          >
            {t("auth.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
