import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { getServerI18n, getServerLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);
  return {
    title: t("auth.signInTitle"),
    description: t("auth.signInSubtitle"),
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next =
    typeof params.next === "string" &&
    params.next.startsWith("/") &&
    !params.next.startsWith("//")
      ? params.next
      : "/";

  return <AuthForm next={next} />;
}
