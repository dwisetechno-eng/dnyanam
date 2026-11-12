"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error("[dnyanam] render error:", error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-20">
      <div className="surface w-full max-w-2xl px-6 py-14 text-center sm:px-12">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-rose-400/30 bg-rose-500/10">
          <AlertTriangle className="h-6 w-6 text-rose-400" />
        </span>
        <h1 className="mt-6 text-2xl font-extrabold text-cream sm:text-3xl">
          {t("common.error")}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/55">
          {t("errors.generic")}
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[11px] text-white/25">
            {error.digest}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary">
            <RotateCcw className="h-4 w-4" />
            {t("common.retry")}
          </button>
          <Link href="/" className="btn-secondary">
            <Home className="h-4 w-4" />
            {t("item.backToHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
