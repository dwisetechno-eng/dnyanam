"use client";

import { AuthProvider } from "@/lib/auth/auth-provider";
import { CartProvider } from "@/lib/cart/cart-provider";
import { I18nProvider } from "@/lib/i18n/provider";
import { RadioBar } from "@/components/radio/radio-bar";
import { RadioProvider } from "@/components/radio/radio-provider";
import { ThemeProvider } from "@/lib/theme/provider";
import { ToastProvider } from "@/lib/ui/toast-provider";
import type { Locale } from "@/lib/types";
import type { ThemeMode } from "@/lib/theme/config";

export function Providers({
  initialLocale,
  hasLocaleCookie,
  initialThemeMode,
  children,
}: {
  initialLocale: Locale;
  hasLocaleCookie: boolean;
  initialThemeMode?: ThemeMode;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider initialMode={initialThemeMode}>
      <I18nProvider
        initialLocale={initialLocale}
        hasLocaleCookie={hasLocaleCookie}
      >
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <RadioProvider>
                {children}
                <RadioBar />
              </RadioProvider>
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
