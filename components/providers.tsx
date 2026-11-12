"use client";

import { AuthProvider } from "@/lib/auth/auth-provider";
import { CartProvider } from "@/lib/cart/cart-provider";
import { I18nProvider } from "@/lib/i18n/provider";
import { ToastProvider } from "@/lib/ui/toast-provider";
import type { Locale } from "@/lib/types";

export function Providers({
  initialLocale,
  hasLocaleCookie,
  children,
}: {
  initialLocale: Locale;
  hasLocaleCookie: boolean;
  children: React.ReactNode;
}) {
  return (
    <I18nProvider
      initialLocale={initialLocale}
      hasLocaleCookie={hasLocaleCookie}
    >
      <AuthProvider>
        <CartProvider>
          <ToastProvider>{children}</ToastProvider>
        </CartProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
