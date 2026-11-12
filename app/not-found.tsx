import Link from "next/link";
import { ArrowLeft, BookOpen, Compass, Search } from "lucide-react";
import { getServerI18n, getServerLocale } from "@/lib/i18n/server";

export default async function NotFound() {
  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-20">
      <div className="surface relative w-full max-w-3xl overflow-hidden px-6 py-14 text-center sm:px-14">
        <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-80" />
        <div className="relative">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-saffron-400/30 bg-saffron-400/10">
            <BookOpen className="h-7 w-7 text-saffron-400" />
          </span>
          <p className="mt-7 font-display text-7xl font-extrabold tracking-tight text-saffron-400 sm:text-8xl">
            404
          </p>
          <h1 className="mt-3 text-2xl font-extrabold text-cream sm:text-3xl">
            {t("errors.notFound")}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/55">
            {t("errors.notFoundBody")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/" className="btn-primary">
              <ArrowLeft className="h-4 w-4" />
              {t("item.backToHome")}
            </Link>
            <Link href="/browse" className="btn-secondary">
              <Compass className="h-4 w-4" />
              {t("nav.browse")}
            </Link>
            <Link href="/search" className="btn-ghost">
              <Search className="h-4 w-4" />
              {t("search.title")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
