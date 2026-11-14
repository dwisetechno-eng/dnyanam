"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import {
  buildSampleCsv,
  prepareImport,
  REQUIRED_COLUMNS,
  type ImportIssue,
} from "@/lib/catalog-import";
import { useI18n } from "@/lib/i18n/provider";
import { useToast } from "@/lib/ui/toast-provider";
import type { Language } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

interface ImportResponse {
  ok?: boolean;
  rows?: number;
  imported?: number;
  created?: number;
  updated?: number;
  issueCount?: number;
  issues?: ImportIssue[];
  error?: string;
}

const ERROR_KEYS: Record<string, string> = {
  UNAUTHENTICATED: "admin.bulk.errorUnauthorized",
  FORBIDDEN: "admin.bulk.errorUnauthorized",
  SUPABASE_NOT_CONFIGURED: "admin.bulk.errorNotConfigured",
  FILE_TOO_LARGE: "admin.bulk.errorTooLarge",
  INVALID_BODY: "admin.bulk.errorGeneric",
  EMPTY_FILE: "admin.bulk.errorGeneric",
  LANGUAGES_UNAVAILABLE: "admin.bulk.errorGeneric",
  NOTHING_TO_IMPORT: "admin.bulk.noRows",
};

export function BulkUploadModal({
  languages,
  onClose,
  onImported,
}: {
  languages: Language[];
  onClose: () => void;
  onImported: () => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);

  const prepared = useMemo(
    () => (csv.trim() ? prepareImport(csv, languages) : null),
    [csv, languages],
  );

  const issues = prepared?.issues ?? [];
  const previewItems = prepared?.items.slice(0, 5) ?? [];
  const readyCount = prepared?.items.length ?? 0;

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

  function loadFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      toast(t("admin.bulk.errorGeneric"), "error");
      return;
    }
    setResult(null);
    setFileName(file.name);
    void file.text().then((text) => setCsv(text));
  }

  function downloadSample() {
    const blob = new Blob([`\uFEFF${buildSampleCsv()}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dnyanam-catalog-sample.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function runImport() {
    if (!csv.trim() || importing) return;
    setImporting(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/catalog/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = (await response.json()) as ImportResponse;

      if (!response.ok) {
        setResult({ ...data, ok: false });
        toast(
          t(ERROR_KEYS[data.error ?? ""] ?? "admin.bulk.errorGeneric"),
          "error",
        );
        return;
      }

      setResult(data);
      if ((data.imported ?? 0) > 0) {
        toast(
          t("admin.bulk.successToast", { count: data.imported ?? 0 }),
          "success",
        );
        onImported();
      }
    } catch (error) {
      console.error("[admin] bulk import failed:", error);
      setResult({ ok: false });
      toast(t("admin.bulk.errorGeneric"), "error");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label={t("admin.bulk.close")}
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-850 shadow-drawer animate-fade-up sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="eyebrow">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {t("admin.bulk.title")}
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-cream">
              {t("admin.bulk.title")}
            </h2>
            <p className="mt-1 text-xs text-white/40">{t("admin.bulk.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-cream"
            aria-label={t("admin.bulk.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <section className="rounded-2xl border border-saffron-400/20 bg-saffron-400/[0.06] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-cream">
                  {t("admin.bulk.downloadSample")}
                </p>
                <p className="mt-0.5 max-w-lg text-[11px] leading-relaxed text-white/45">
                  {t("admin.bulk.sampleHint")}
                </p>
              </div>
              <button
                type="button"
                onClick={downloadSample}
                className="btn-primary shrink-0 px-4 py-2.5 text-xs"
              >
                <Download className="h-4 w-4" />
                {t("admin.bulk.downloadSample")}
              </button>
            </div>
            <p className="mt-3 border-t border-white/10 pt-3 text-[10px] leading-relaxed text-white/35">
              {t("admin.bulk.columnsNote")}
            </p>
          </section>

          <section className="mt-4">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) loadFile(file);
              }}
              className={
                dragging
                  ? "rounded-2xl border-2 border-dashed border-saffron-400/60 bg-saffron-400/10 p-6 text-center"
                  : "rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] p-6 text-center"
              }
            >
              <Upload className="mx-auto h-6 w-6 text-white/30" />
              <p className="mt-2 text-xs text-white/50">
                {t("admin.bulk.dropHere")}{" "}
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="font-bold text-saffron-300 underline underline-offset-2 hover:text-saffron-200"
                >
                  {t("admin.bulk.browse")}
                </button>
              </p>
              <p className="mt-1 text-[10px] text-white/25">
                {t("admin.bulk.fileHint")}
              </p>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) loadFile(file);
                  event.target.value = "";
                }}
              />
            </div>

            <label
              htmlFor="bulk-csv"
              className="field-label mt-4 block text-[10px]"
            >
              {t("admin.bulk.orPaste")}
            </label>
            <textarea
              id="bulk-csv"
              value={csv}
              onChange={(event) => {
                setCsv(event.target.value);
                setResult(null);
              }}
              placeholder={t("admin.bulk.pastePlaceholder")}
              rows={5}
              spellCheck={false}
              className="field mt-1 resize-y font-mono text-[11px] leading-relaxed"
            />
          </section>

          {prepared && (
            <section className="mt-4">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {fileName && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-semibold text-white/50">
                    {fileName}
                  </span>
                )}
                <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-300">
                  {t("admin.bulk.ready", { count: readyCount })}
                </span>
                {issues.length > 0 && (
                  <span className="rounded-full border border-rose-400/25 bg-rose-500/10 px-2.5 py-1 font-bold text-rose-300">
                    {t("admin.bulk.issues", { count: issues.length })}
                  </span>
                )}
              </div>

              {issues.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-rose-400/20 bg-rose-500/[0.06] p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-300">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t("admin.bulk.issues", { count: issues.length })}
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-rose-200/80">
                    {issues.slice(0, 12).map((issue, index) => (
                      <li key={`${issue.row}-${index}`}>
                        <span className="font-semibold text-rose-200">
                          {t("admin.bulk.rowLabel", { row: issue.row })}
                        </span>{" "}
                        — {issue.message}
                      </li>
                    ))}
                    {issues.length > 12 && <li>…</li>}
                  </ul>
                </div>
              )}

              {previewItems.length > 0 && (
                <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full min-w-[520px] border-collapse text-left text-[11px]">
                    <thead className="bg-white/[0.04] text-[9px] uppercase tracking-[0.12em] text-white/35">
                      <tr>
                        <th className="px-3 py-2 font-bold">{t("admin.items.columns.title")}</th>
                        <th className="px-3 py-2 font-bold">{t("admin.items.columns.type")}</th>
                        <th className="px-3 py-2 font-bold">{t("admin.items.columns.language")}</th>
                        <th className="px-3 py-2 font-bold">{t("admin.items.columns.price")}</th>
                        <th className="px-3 py-2 font-bold">{t("admin.items.columns.status")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {previewItems.map((item) => (
                        <tr key={item.slug}>
                          <td className="px-3 py-2">
                            <p className="max-w-[220px] truncate font-semibold text-cream">
                              {item.title}
                            </p>
                            <p className="max-w-[220px] truncate text-[9px] text-white/30">
                              {item.slug}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-white/50">
                            {t(`format.${item.item_type}`)}
                          </td>
                          <td className="px-3 py-2 font-semibold uppercase text-white/45">
                            {item.language_code}
                          </td>
                          <td className="px-3 py-2 text-white/60">
                            {formatPrice(item.price_paise)}
                          </td>
                          <td className="px-3 py-2 text-white/45">
                            {item.is_published
                              ? t("admin.published")
                              : t("admin.unpublished")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {readyCount > previewItems.length && (
                    <p className="border-t border-white/[0.06] px-3 py-2 text-[10px] text-white/30">
                      {t("admin.bulk.moreRows", {
                        count: readyCount - previewItems.length,
                      })}
                    </p>
                  )}
                </div>
              )}

              {readyCount === 0 && issues.length === 0 && (
                <p className="mt-3 text-[11px] text-white/35">{t("admin.bulk.noRows")}</p>
              )}
            </section>
          )}

          {result && (
            <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-bold text-cream">
                {result.ok ? t("admin.bulk.resultTitle") : t("admin.bulk.errorGeneric")}
              </p>
              {result.ok ? (
                <p className="mt-1 text-xs text-white/50">
                  {t("admin.bulk.resultSummary", {
                    imported: result.imported ?? 0,
                    created: result.created ?? 0,
                    updated: result.updated ?? 0,
                  })}
                </p>
              ) : (
                <p className="mt-1 text-xs text-rose-300/80">
                  {t(ERROR_KEYS[result.error ?? ""] ?? "admin.bulk.errorGeneric")}
                </p>
              )}
              {(result.issueCount ?? 0) > 0 && (
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-[11px] text-rose-200/70">
                  {(result.issues ?? []).slice(0, 10).map((issue, index) => (
                    <li key={`${issue.row}-${index}`}>
                      {t("admin.bulk.rowLabel", { row: issue.row })} — {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-5 py-4">
          <p className="hidden text-[10px] text-white/30 sm:block">
            {REQUIRED_COLUMNS.length} {t("admin.bulk.requiredHint")}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              {t("admin.bulk.cancel")}
            </button>
            <button
              type="button"
              onClick={() => void runImport()}
              disabled={importing || readyCount === 0}
              className="btn-primary"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("admin.bulk.importing")}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {t("admin.bulk.import", { count: readyCount })}
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
