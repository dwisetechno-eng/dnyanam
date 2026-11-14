import type { Metadata } from "next";
import { ProfilePage } from "@/components/profile/profile-page";
import { getServerI18n, getServerLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);
  return {
    title: t("profile.title"),
    description: t("profile.subtitle"),
  };
}

export default function ProfileRoute() {
  return <ProfilePage />;
}
