import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { LanguageRibbon } from "@/components/language-ribbon";
import { SiteFooter } from "@/components/site-footer";
import { CartDrawer } from "@/components/cart-drawer";
import { getLanguages } from "@/lib/catalog";
import { getServerI18n, getServerLocale } from "@/lib/i18n/server";
import { themeBootScript } from "@/lib/theme/config";
import { getServerThemeMode } from "@/lib/theme/server";
import { absoluteUrl, cn } from "@/lib/utils";

// Fonts are self-hosted (SIL OFL 1.1) so the production build never depends on
// fetching fonts.googleapis.com — that fetch is flaky on CI/CD runners and is
// what breaks `next build` on Vercel.
const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin.woff2",
  variable: "--font-jakarta",
  display: "swap",
  weight: "400 800",
  fallback: ["system-ui", "arial"],
});

const devanagari = localFont({
  src: "./fonts/noto-sans-devanagari-devanagari.woff2",
  variable: "--font-noto-devanagari",
  display: "swap",
  weight: "400 800",
  fallback: ["system-ui", "arial"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F3EC" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F19" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);

  return {
    metadataBase: new URL(absoluteUrl()),
    title: {
      default: t("meta.title"),
      template: `%s · ${t("brand.name")}`,
    },
    description: t("meta.description"),
    applicationName: t("brand.name"),
    openGraph: {
      title: t("meta.title"),
      description: t("meta.description"),
      siteName: t("brand.name"),
      locale: locale === "mr" ? "mr_IN" : locale === "hi" ? "hi_IN" : "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("meta.title"),
      description: t("meta.description"),
    },
    icons: {
      icon: "/icon.svg",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [{ locale, hasCookie }, languages, themeMode] = await Promise.all([
    getServerLocale(),
    getLanguages(),
    getServerThemeMode(),
  ]);

  return (
    <html
      lang={locale}
      className={cn(
        jakarta.variable,
        devanagari.variable,
        themeMode === "light" ? "theme-light" : "dark",
      )}
      data-theme={themeMode === "light" ? "light" : "dark"}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <Providers
          initialLocale={locale}
          hasLocaleCookie={hasCookie}
          initialThemeMode={themeMode}
        >
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <Suspense fallback={<div className="h-[49px] border-b border-white/[0.06]" />}>
              <LanguageRibbon languages={languages} />
            </Suspense>
            <main className="flex-1">{children}</main>
            <SiteFooter languages={languages} />
          </div>
          <CartDrawer />
        </Providers>
      </body>
    </html>
  );
}
