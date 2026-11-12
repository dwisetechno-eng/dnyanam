"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export function SearchBox({
  initialQuery = "",
  language,
}: {
  initialQuery?: string;
  language?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [value, setValue] = useState(initialQuery);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    const term = value.trim();
    if (term) params.set("q", term);
    if (language) params.set("lang", language);
    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : "/search");
  }

  function clear() {
    setValue("");
    const params = new URLSearchParams();
    if (language) params.set("lang", language);
    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : "/search");
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className="relative mt-6 max-w-2xl"
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t("search.placeholder")}
        aria-label={t("search.title")}
        autoFocus
        className="w-full rounded-2xl border border-white/10 bg-ink-900/70 py-4 pl-12 pr-24 text-sm text-cream outline-none transition placeholder:text-white/30 focus:border-saffron-400/50 focus:ring-2 focus:ring-saffron-400/15"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {value && (
          <button
            type="button"
            onClick={clear}
            aria-label={t("search.clear")}
            className="rounded-full p-2 text-white/35 transition hover:bg-white/10 hover:text-cream"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button type="submit" className="btn-primary px-4 py-2.5">
          {t("nav.search")}
        </button>
      </div>
    </form>
  );
}
