"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  BookOpen,
  Check,
  FileText,
  ImagePlus,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/ui/toast-provider";
import type {
  CatalogItem,
  ItemType,
  Language,
  Locale,
} from "@/lib/types";
import { cn, safeFileName, slugify } from "@/lib/utils";

const itemTypes: ItemType[] = [
  "physical_book",
  "ebook",
  "magazine_digital",
  "magazine_print",
];

const categories = [
  "fiction",
  "history",
  "spirituality",
  "business",
  "competitive-exams",
  "special-editions",
  "cooking",
  "poetry",
  "self-help",
  "current-affairs",
  "children",
] as const;

interface FormState {
  title: string;
  title_en: string;
  slug: string;
  subtitle_or_edition: string;
  author_or_publisher: string;
  description: string;
  item_type: ItemType;
  language_code: string;
  category: string;
  isbn_or_issn: string;
  price_rupees: string;
  mrp_rupees: string;
  stock_quantity: string;
  cover_image_url: string;
  sample_pdf_url: string;
  digital_file_path: string;
  is_trending: boolean;
  is_latest_arrival: boolean;
  is_hero_featured: boolean;
  is_published: boolean;
}

function initialValues(item: CatalogItem | null, defaultLanguage: string): FormState {
  return {
    title: item?.title ?? "",
    title_en: item?.title_en ?? "",
    slug: item?.slug ?? "",
    subtitle_or_edition: item?.subtitle_or_edition ?? "",
    author_or_publisher: item?.author_or_publisher ?? "",
    description: item?.description ?? "",
    item_type: item?.item_type ?? "physical_book",
    language_code: item?.language_code ?? defaultLanguage,
    category: item?.category ?? "fiction",
    isbn_or_issn: item?.isbn_or_issn ?? "",
    price_rupees: item ? String(Math.round(item.price_paise / 100)) : "",
    mrp_rupees: item ? String(Math.round(item.mrp_paise / 100)) : "",
    stock_quantity: item ? String(item.stock_quantity) : "0",
    cover_image_url: item?.cover_image_url ?? "",
    sample_pdf_url: item?.sample_pdf_url ?? "",
    digital_file_path: item?.digital_file_path ?? "",
    is_trending: item?.is_trending ?? false,
    is_latest_arrival: item?.is_latest_arrival ?? false,
    is_hero_featured: item?.is_hero_featured ?? false,
    is_published: item?.is_published ?? true,
  };
}

function languageLabel(language: Language, locale: Locale) {
  if (locale === "mr") return language.name_mr;
  if (locale === "hi") return language.name_hi;
  return language.name_en;
}

export function ItemFormModal({
  item,
  languages,
  locale,
  defaultLanguage,
  onClose,
  onSaved,
}: {
  item: CatalogItem | null;
  languages: Language[];
  locale: Locale;
  defaultLanguage: string;
  onClose: () => void;
  onSaved: (item: CatalogItem, created: boolean) => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [values, setValues] = useState<FormState>(() =>
    initialValues(item, defaultLanguage),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const sampleInput = useRef<HTMLInputElement>(null);
  const digitalInput = useRef<HTMLInputElement>(null);

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

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function uploadFile(
    kind: "cover" | "sample" | "digital",
    file: File,
  ) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast(t("admin.notConfigured"), "error");
      return;
    }
    const bucket =
      kind === "digital" ? "digital_assets" : kind === "cover" ? "covers" : "samples";
    const folder =
      kind === "cover" ? "admin/covers" : kind === "sample" ? "admin/samples" : "admin/digital";
    const folderSlug = slugify(values.slug || values.title_en || values.title) || "title";
    const path = `${folder}/${folderSlug}/${Date.now()}-${safeFileName(file.name)}`;

    setUploading(kind);
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;

      if (kind === "digital") {
        set("digital_file_path", path);
      } else {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        set(kind === "cover" ? "cover_image_url" : "sample_pdf_url", data.publicUrl);
      }
      toast(t("admin.uploaded"), "success");
    } catch (error) {
      console.error("[admin] upload failed:", error);
      toast(t("admin.uploadFailed"), "error");
    } finally {
      setUploading(null);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (
      values.title.trim().length < 1 ||
      values.author_or_publisher.trim().length < 1 ||
      values.cover_image_url.trim().length < 1 ||
      values.language_code.length < 2 ||
      values.category.length < 1
    ) {
      setFormError(t("validation.required"));
      return;
    }

    const price = Number(values.price_rupees);
    const mrp = Number(values.mrp_rupees || values.price_rupees);
    if (!Number.isFinite(price) || price <= 0) {
      setFormError(t("validation.positive"));
      return;
    }
    if (price > mrp) {
      setFormError(t("validation.price"));
      return;
    }

    const physical = values.item_type === "physical_book" || values.item_type === "magazine_print";
    const slug = slugify(values.slug || values.title_en || values.title);
    if (!slug) {
      setFormError(t("validation.slug"));
      return;
    }

    const payload = {
      title: values.title.trim(),
      title_en: values.title_en.trim() || null,
      slug,
      subtitle_or_edition: values.subtitle_or_edition.trim() || null,
      author_or_publisher: values.author_or_publisher.trim(),
      description: values.description.trim() || null,
      item_type: values.item_type,
      language_code: values.language_code,
      category: values.category,
      isbn_or_issn: values.isbn_or_issn.trim() || null,
      price_paise: Math.round(price * 100),
      mrp_paise: Math.round(mrp * 100),
      cover_image_url: values.cover_image_url.trim(),
      sample_pdf_url: values.sample_pdf_url.trim() || null,
      digital_file_path: physical
        ? null
        : values.digital_file_path.trim() || null,
      stock_quantity: physical ? Math.max(0, Number(values.stock_quantity) || 0) : 0,
      is_trending: values.is_trending,
      is_latest_arrival: values.is_latest_arrival,
      is_hero_featured: values.is_hero_featured,
      is_published: values.is_published,
    };

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast(t("admin.notConfigured"), "error");
      return;
    }

    setSaving(true);
    try {
      if (item) {
        const { data, error } = await supabase
          .from("catalog_items")
          .update(payload)
          .eq("id", item.id)
          .select("*")
          .single();
        if (error) throw error;
        toast(t("admin.toastUpdated"), "success");
        onSaved(data as CatalogItem, false);
      } else {
        const { data, error } = await supabase
          .from("catalog_items")
          .insert(payload)
          .select("*")
          .single();
        if (error) throw error;
        toast(t("admin.toastCreated"), "success");
        onSaved(data as CatalogItem, true);
      }
    } catch (error) {
      console.error("[admin] save item failed:", error);
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
        className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-850 shadow-drawer animate-fade-up sm:rounded-3xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="eyebrow">
              <BookOpen className="h-3.5 w-3.5" />
              {t("admin.items.title")}
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-cream">
              {item ? t("admin.items.edit") : t("admin.items.add")}
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
          id="item-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="item-title">
                {t("admin.items.form.title")} *
              </label>
              <input
                id="item-title"
                value={values.title}
                onChange={(event) => set("title", event.target.value)}
                placeholder={t("admin.items.form.titlePlaceholder")}
                className="field"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="item-title-en">
                {t("admin.items.form.titleEn")}
              </label>
              <input
                id="item-title-en"
                value={values.title_en}
                onChange={(event) => set("title_en", event.target.value)}
                placeholder={t("admin.items.form.titleEnPlaceholder")}
                className="field"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="item-slug">
                {t("admin.items.form.slug")}
              </label>
              <input
                id="item-slug"
                value={values.slug}
                onChange={(event) => set("slug", event.target.value)}
                placeholder={t("admin.items.form.slugPlaceholder")}
                className="field"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="item-subtitle">
                {t("admin.items.form.subtitle")}
              </label>
              <input
                id="item-subtitle"
                value={values.subtitle_or_edition}
                onChange={(event) => set("subtitle_or_edition", event.target.value)}
                placeholder={t("admin.items.form.subtitlePlaceholder")}
                className="field"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="item-author">
                {t("admin.items.form.author")} *
              </label>
              <input
                id="item-author"
                value={values.author_or_publisher}
                onChange={(event) => set("author_or_publisher", event.target.value)}
                placeholder={t("admin.items.form.authorPlaceholder")}
                className="field"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="item-description">
                {t("admin.items.form.description")}
              </label>
              <textarea
                id="item-description"
                value={values.description}
                onChange={(event) => set("description", event.target.value)}
                placeholder={t("admin.items.form.descriptionPlaceholder")}
                rows={4}
                className="field resize-y"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="item-type">
                {t("admin.items.form.itemType")}
              </label>
              <select
                id="item-type"
                value={values.item_type}
                onChange={(event) => set("item_type", event.target.value as ItemType)}
                className="field cursor-pointer"
              >
                {itemTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(`format.${type}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="item-language">
                {t("admin.items.form.language")}
              </label>
              <select
                id="item-language"
                value={values.language_code}
                onChange={(event) => set("language_code", event.target.value)}
                className="field cursor-pointer"
              >
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {languageLabel(language, locale)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="item-category">
                {t("admin.items.form.category")}
              </label>
              <select
                id="item-category"
                value={values.category}
                onChange={(event) => set("category", event.target.value)}
                className="field cursor-pointer"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {t(`category.${category}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="item-isbn">
                {t("admin.items.form.isbn")}
              </label>
              <input
                id="item-isbn"
                value={values.isbn_or_issn}
                onChange={(event) => set("isbn_or_issn", event.target.value)}
                placeholder={t("admin.items.form.isbnPlaceholder")}
                className="field"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="item-price">
                {t("admin.items.form.price")} *
              </label>
              <input
                id="item-price"
                type="number"
                min={0}
                step={1}
                value={values.price_rupees}
                onChange={(event) => set("price_rupees", event.target.value)}
                className="field"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="item-mrp">
                {t("admin.items.form.mrp")}
              </label>
              <input
                id="item-mrp"
                type="number"
                min={0}
                step={1}
                value={values.mrp_rupees}
                onChange={(event) => set("mrp_rupees", event.target.value)}
                className="field"
              />
              <p className="mt-1 text-[10px] text-white/30">
                {t("admin.items.form.priceHint")}
              </p>
            </div>

            <div>
              <label className="field-label" htmlFor="item-stock">
                {t("admin.items.form.stock")}
              </label>
              <input
                id="item-stock"
                type="number"
                min={0}
                step={1}
                value={values.stock_quantity}
                onChange={(event) => set("stock_quantity", event.target.value)}
                className="field"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="item-cover">
                {t("admin.items.form.cover")} *
              </label>
              <div className="flex gap-3">
                <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-ink-800">
                  {values.cover_image_url ? (
                    <Image
                      src={values.cover_image_url}
                      alt=""
                      fill
                      sizes="64px"
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
                    id="item-cover"
                    value={values.cover_image_url}
                    onChange={(event) => set("cover_image_url", event.target.value)}
                    placeholder="/covers/title.svg"
                    className="field"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      ref={coverInput}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadFile("cover", file);
                        event.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => coverInput.current?.click()}
                      disabled={uploading === "cover"}
                      className="btn-secondary px-3 py-2 text-[11px]"
                    >
                      {uploading === "cover" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {uploading === "cover" ? t("admin.uploading") : t("admin.items.form.cover")}
                    </button>
                    <span className="text-[10px] text-white/30">
                      {t("admin.items.form.coverHint")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="item-sample">
                {t("admin.items.form.sample")}
              </label>
              <div className="flex gap-2">
                <input
                  id="item-sample"
                  value={values.sample_pdf_url}
                  onChange={(event) => set("sample_pdf_url", event.target.value)}
                  placeholder="https://…"
                  className="field"
                />
                <input
                  ref={sampleInput}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadFile("sample", file);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => sampleInput.current?.click()}
                  disabled={uploading === "sample"}
                  className="btn-secondary shrink-0 px-3"
                >
                  {uploading === "sample" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-white/30">
                {t("admin.items.form.sampleHint")}
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="item-digital">
                {t("admin.items.form.digitalFile")}
              </label>
              <div className="flex gap-2">
                <input
                  id="item-digital"
                  value={values.digital_file_path}
                  onChange={(event) => set("digital_file_path", event.target.value)}
                  placeholder="ebooks/title.pdf"
                  className="field"
                />
                <input
                  ref={digitalInput}
                  type="file"
                  accept="application/pdf,application/epub+zip"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadFile("digital", file);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => digitalInput.current?.click()}
                  disabled={uploading === "digital"}
                  className="btn-secondary shrink-0 px-3"
                >
                  {uploading === "digital" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-white/30">
                {t("admin.items.form.digitalHint")}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="field-label">{t("admin.items.form.flags")}</p>
              <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:grid-cols-2">
                <Flag
                  checked={values.is_trending}
                  onChange={(value) => set("is_trending", value)}
                  label={t("admin.items.form.trending")}
                />
                <Flag
                  checked={values.is_latest_arrival}
                  onChange={(value) => set("is_latest_arrival", value)}
                  label={t("admin.items.form.latest")}
                />
                <Flag
                  checked={values.is_hero_featured}
                  onChange={(value) => set("is_hero_featured", value)}
                  label={t("admin.items.form.hero")}
                />
                <Flag
                  checked={values.is_published}
                  onChange={(value) => set("is_published", value)}
                  label={t("admin.items.form.published")}
                />
              </div>
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
            form="item-form"
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

function Flag({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-white/60">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={cn(
          "h-4 w-4 rounded border-white/20 bg-ink-900 text-saffron-500 accent-saffron-500",
        )}
      />
      {label}
    </label>
  );
}
