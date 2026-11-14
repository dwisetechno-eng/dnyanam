"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  ImagePlus,
  Loader2,
  Megaphone,
  Upload,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/ui/toast-provider";
import type { AdBanner, BannerSlot, Language, Locale } from "@/lib/types";
import { safeFileName, slugify } from "@/lib/utils";

const slots: BannerSlot[] = ["hero_carousel", "mid_feed_1", "mid_feed_2"];

function toLocalInput(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

interface BannerFormState {
  title: string;
  slot_position: BannerSlot;
  target_url: string;
  language_code: string;
  priority: string;
  desktop_image_url: string;
  mobile_image_url: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
}

function initialBanner(banner: AdBanner | null): BannerFormState {
  return {
    title: banner?.title ?? "",
    slot_position: banner?.slot_position ?? "hero_carousel",
    target_url: banner?.target_url ?? "/browse",
    language_code: banner?.language_code ?? "",
    priority: banner ? String(banner.priority) : "0",
    desktop_image_url: banner?.desktop_image_url ?? "",
    mobile_image_url: banner?.mobile_image_url ?? "",
    is_active: banner?.is_active ?? true,
    starts_at: toLocalInput(banner?.starts_at),
    ends_at: banner?.ends_at ? toLocalInput(banner.ends_at) : "",
  };
}

function languageLabel(language: Language, locale: Locale) {
  if (locale === "mr") return language.name_mr;
  if (locale === "hi") return language.name_hi;
  return language.name_en;
}

export function BannerFormModal({
  banner,
  languages,
  locale,
  onClose,
  onSaved,
}: {
  banner: AdBanner | null;
  languages: Language[];
  locale: Locale;
  onClose: () => void;
  onSaved: (banner: AdBanner, created: boolean) => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [values, setValues] = useState<BannerFormState>(() => initialBanner(banner));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"desktop" | "mobile" | null>(null);
  const desktopInput = useRef<HTMLInputElement>(null);
  const mobileInput = useRef<HTMLInputElement>(null);

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

  function set<K extends keyof BannerFormState>(
    key: K,
    value: BannerFormState[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function uploadImage(kind: "desktop" | "mobile", file: File) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast(t("admin.notConfigured"), "error");
      return;
    }
    const folder = slugify(values.title) || "banner";
    const path = `admin/banners/${folder}/${kind}-${Date.now()}-${safeFileName(file.name)}`;
    setUploading(kind);
    try {
      const { error } = await supabase.storage
        .from("covers")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("covers").getPublicUrl(path);
      set(kind === "desktop" ? "desktop_image_url" : "mobile_image_url", data.publicUrl);
      toast(t("admin.uploaded"), "success");
    } catch (error) {
      console.error("[admin] banner upload failed:", error);
      toast(t("admin.uploadFailed"), "error");
    } finally {
      setUploading(null);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (
      !values.title.trim() ||
      !values.target_url.trim() ||
      (!values.desktop_image_url.trim() && !values.mobile_image_url.trim())
    ) {
      setFormError(t("admin.banners.form.required"));
      return;
    }

    const desktop =
      values.desktop_image_url.trim() || values.mobile_image_url.trim();
    const mobile =
      values.mobile_image_url.trim() || values.desktop_image_url.trim();

    const payload = {
      title: values.title.trim(),
      slot_position: values.slot_position,
      desktop_image_url: desktop,
      mobile_image_url: mobile,
      target_url: values.target_url.trim(),
      language_code: values.language_code || null,
      starts_at: new Date(values.starts_at).toISOString(),
      ends_at: values.ends_at ? new Date(values.ends_at).toISOString() : null,
      is_active: values.is_active,
      priority: Math.max(0, Number(values.priority) || 0),
    };

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast(t("admin.notConfigured"), "error");
      return;
    }

    setSaving(true);
    try {
      if (banner) {
        const { data, error } = await supabase
          .from("ad_banners")
          .update(payload)
          .eq("id", banner.id)
          .select("*")
          .single();
        if (error) throw error;
        toast(t("admin.toastUpdated"), "success");
        onSaved(data as AdBanner, false);
      } else {
        const { data, error } = await supabase
          .from("ad_banners")
          .insert(payload)
          .select("*")
          .single();
        if (error) throw error;
        toast(t("admin.toastBannerCreated"), "success");
        onSaved(data as AdBanner, true);
      }
    } catch (error) {
      console.error("[admin] save banner failed:", error);
      setFormError(
        error instanceof Error && error.message
          ? error.message
          : t("admin.toastError"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label={t("admin.cancel")}
        onClick={onClose}
        className="absolute inset-0 scrim backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-850 shadow-drawer animate-fade-up sm:rounded-3xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="eyebrow">
              <Megaphone className="h-3.5 w-3.5" />
              {t("admin.banners.title")}
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-cream">
              {banner ? t("admin.banners.edit") : t("admin.banners.add")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-cream"
            aria-label={t("admin.cancel")}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form
          id="banner-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="banner-title">
                {t("admin.banners.form.title")} *
              </label>
              <input
                id="banner-title"
                value={values.title}
                onChange={(event) => set("title", event.target.value)}
                placeholder={t("admin.banners.form.titlePlaceholder")}
                className="field"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="banner-slot">
                {t("admin.banners.form.slot")}
              </label>
              <select
                id="banner-slot"
                value={values.slot_position}
                onChange={(event) =>
                  set("slot_position", event.target.value as BannerSlot)
                }
                className="field cursor-pointer"
              >
                {slots.map((slot) => (
                  <option key={slot} value={slot}>
                    {t(`admin.banners.slots.${slot}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="banner-language">
                {t("admin.banners.form.language")}
              </label>
              <select
                id="banner-language"
                value={values.language_code}
                onChange={(event) => set("language_code", event.target.value)}
                className="field cursor-pointer"
              >
                <option value="">{t("admin.banners.form.allLanguages")}</option>
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {languageLabel(language, locale)}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="banner-target">
                {t("admin.banners.form.target")} *
              </label>
              <input
                id="banner-target"
                value={values.target_url}
                onChange={(event) => set("target_url", event.target.value)}
                placeholder={t("admin.banners.form.targetPlaceholder")}
                className="field"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="banner-priority">
                {t("admin.banners.form.priority")}
              </label>
              <input
                id="banner-priority"
                type="number"
                min={0}
                step={1}
                value={values.priority}
                onChange={(event) => set("priority", event.target.value)}
                className="field"
              />
            </div>

            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-white/60">
                <input
                  type="checkbox"
                  checked={values.is_active}
                  onChange={(event) => set("is_active", event.target.checked)}
                  className="h-4 w-4 accent-saffron-500"
                />
                {t("admin.banners.form.active")}
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="banner-desktop">
                {t("admin.banners.form.desktop")}
              </label>
              <div className="flex gap-3">
                <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-ink-800">
                  {values.desktop_image_url ? (
                    <Image
                      src={values.desktop_image_url}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="grid h-full place-items-center">
                      <ImagePlus className="h-5 w-5 text-white/20" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    id="banner-desktop"
                    value={values.desktop_image_url}
                    onChange={(event) => set("desktop_image_url", event.target.value)}
                    placeholder="/banners/hero.svg"
                    className="field"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      ref={desktopInput}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadImage("desktop", file);
                        event.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => desktopInput.current?.click()}
                      disabled={uploading === "desktop"}
                      className="btn-secondary px-3 py-2 text-[11px]"
                    >
                      {uploading === "desktop" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {uploading === "desktop" ? t("admin.uploading") : t("admin.banners.form.desktop")}
                    </button>
                    <span className="text-[10px] text-white/30">
                      {t("admin.banners.form.desktopHint")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="banner-mobile">
                {t("admin.banners.form.mobile")}
              </label>
              <div className="flex gap-2">
                <input
                  id="banner-mobile"
                  value={values.mobile_image_url}
                  onChange={(event) => set("mobile_image_url", event.target.value)}
                  placeholder="/banners/hero-mobile.svg"
                  className="field"
                />
                <input
                  ref={mobileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadImage("mobile", file);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => mobileInput.current?.click()}
                  disabled={uploading === "mobile"}
                  className="btn-secondary shrink-0 px-3"
                >
                  {uploading === "mobile" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-white/30">
                {t("admin.banners.form.mobileHint")}
              </p>
            </div>

            <div>
              <label className="field-label" htmlFor="banner-starts">
                {t("admin.banners.form.startsAt")}
              </label>
              <input
                id="banner-starts"
                type="datetime-local"
                value={values.starts_at}
                onChange={(event) => set("starts_at", event.target.value)}
                className="field"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="banner-ends">
                {t("admin.banners.form.endsAt")}
              </label>
              <input
                id="banner-ends"
                type="datetime-local"
                value={values.ends_at}
                onChange={(event) => set("ends_at", event.target.value)}
                className="field"
              />
            </div>

            {formError && (
              <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-200 sm:col-span-2">
                {formError}
              </p>
            )}
          </div>
        </form>

        <footer className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            {t("admin.cancel")}
          </button>
          <button
            type="submit"
            form="banner-form"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("admin.saving")}
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {t("admin.save")}
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
