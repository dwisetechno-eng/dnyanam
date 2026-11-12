import type { Metadata } from "next";
import { LibraryClient } from "@/components/library-client";
import { getServerI18n, getServerLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);
  return {
    title: t("library.title"),
    description: t("library.subtitle"),
  };
}

export default function LibraryPage() {
  return <LibraryClient />;
}
