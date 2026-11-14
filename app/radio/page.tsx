import type { Metadata } from "next";
import { RadioPage } from "@/components/radio/radio-page";
import { getServerI18n, getServerLocale } from "@/lib/i18n/server";
import {
  getRadioStations,
  radioGeneratedAt,
  radioSource,
} from "@/lib/radio/data";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);
  return {
    title: t("radio.title"),
    description: t("radio.subtitle"),
  };
}

export default function RadioRoute() {
  const stations = getRadioStations();
  return (
    <RadioPage
      stations={stations}
      source={radioSource}
      generatedAt={radioGeneratedAt}
    />
  );
}
