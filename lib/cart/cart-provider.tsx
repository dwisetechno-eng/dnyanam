"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CartLine, CatalogItem } from "@/lib/types";
import {
  FREE_SHIPPING_THRESHOLD_PAISE,
  MAX_LINE_QUANTITY,
  SHIPPING_FEE_PAISE,
  isPhysical,
} from "@/lib/utils";

const CART_KEY = "dnyanam.cart.v1";

interface CartContextValue {
  lines: CartLine[];
  hydrated: boolean;
  isOpen: boolean;
  count: number;
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  hasPhysical: boolean;
  lastAddedId: string | null;
  addItem: (item: CatalogItem, quantity?: number) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  freeShippingRemainingPaise: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (line): line is CartLine =>
        typeof line?.id === "string" &&
        typeof line?.pricePaise === "number" &&
        typeof line?.quantity === "number",
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLines(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      // ignore quota/private mode errors
    }
  }, [lines, hydrated]);

  useEffect(() => {
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, []);

  const addItem = useCallback((item: CatalogItem, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((line) => line.id === item.id);
      if (existing) {
        return current.map((line) =>
          line.id === item.id
            ? {
                ...line,
                quantity: Math.min(
                  MAX_LINE_QUANTITY,
                  line.quantity + Math.max(1, quantity),
                ),
              }
            : line,
        );
      }
      const line: CartLine = {
        id: item.id,
        slug: item.slug,
        title: item.title,
        author: item.author_or_publisher,
        cover: item.cover_image_url,
        pricePaise: item.price_paise,
        mrpPaise: item.mrp_paise,
        itemType: item.item_type,
        languageCode: item.language_code,
        quantity: Math.min(MAX_LINE_QUANTITY, Math.max(1, quantity)),
      };
      return [...current, line];
    });

    setLastAddedId(item.id);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setLastAddedId(null), 2200);
  }, []);

  const removeItem = useCallback((id: string) => {
    setLines((current) => current.filter((line) => line.id !== id));
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    setLines((current) =>
      current.map((line) =>
        line.id === id
          ? {
              ...line,
              quantity: Math.min(MAX_LINE_QUANTITY, Math.max(1, quantity)),
            }
          : line,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setLines([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((open) => !open), []);

  const derived = useMemo(() => {
    const subtotalPaise = lines.reduce(
      (sum, line) => sum + line.pricePaise * line.quantity,
      0,
    );
    const hasPhysical = lines.some((line) => isPhysical({ item_type: line.itemType }));
    const shippingPaise = hasPhysical
      ? subtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE
        ? 0
        : SHIPPING_FEE_PAISE
      : 0;
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    return {
      subtotalPaise,
      shippingPaise,
      totalPaise: subtotalPaise + shippingPaise,
      hasPhysical,
      count,
      freeShippingRemainingPaise: Math.max(
        0,
        FREE_SHIPPING_THRESHOLD_PAISE - subtotalPaise,
      ),
    };
  }, [lines]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      hydrated,
      isOpen,
      lastAddedId,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
      ...derived,
    }),
    [
      lines,
      hydrated,
      isOpen,
      lastAddedId,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
      derived,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
