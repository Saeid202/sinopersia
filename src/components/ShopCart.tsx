"use client";

import Link from "next/link";
import ExchangeRates from "@/components/ExchangeRates";
import SiteHeader from "@/components/SiteHeader";
import { createContext, startTransition, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ShopCartLine, ShopProduct } from "@/lib/shop";

const CART_STORAGE_KEY = "sino-persia-shop-cart";

function isShopCartLine(line: unknown): line is ShopCartLine {
  if (typeof line !== "object" || line === null || !("productId" in line) || !("quantity" in line)) return false;
  return typeof line.productId === "string" &&
    typeof line.quantity === "number" &&
    Number.isInteger(line.quantity) &&
    line.quantity >= 1;
}

type ShopCartContextValue = {
  lines: ShopCartLine[];
  ready: boolean;
  addProduct: (product: ShopProduct, quantity?: number) => void;
  setQuantity: (product: ShopProduct, quantity: number) => void;
  removeProduct: (productId: string) => void;
  clearCart: () => void;
  itemCount: number;
};

const ShopCartContext = createContext<ShopCartContextValue | null>(null);

export function ShopCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<ShopCartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    try {
      const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      if (storedCart) {
        const parsed: unknown = JSON.parse(storedCart);
        if (!Array.isArray(parsed) || !parsed.every(isShopCartLine)) {
          throw new Error("سبد خرید ذخیره‌شده معتبر نیست.");
        }
        startTransition(() => setLines(parsed as ShopCartLine[]));
      }
    } catch (error) {
      startTransition(() => setStorageError(error instanceof Error ? error.message : "خواندن سبد خرید ذخیره‌شده انجام نشد."));
    }
    startTransition(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    } catch (error) {
      startTransition(() => setStorageError(error instanceof Error ? error.message : "ذخیرهٔ سبد خرید انجام نشد."));
    }
  }, [lines, ready]);

  const value = useMemo<ShopCartContextValue>(() => ({
    lines,
    ready,
    addProduct: (product, quantity = 1) => {
      if (product.stock < product.moq) return;
      setLines((current) => {
        const existing = current.find((line) => line.productId === product.id);
        if (!existing) return [...current, { productId: product.id, quantity: Math.min(Math.max(quantity, product.moq), product.stock) }];
        return current.map((line) => line.productId === product.id
          ? { ...line, quantity: Math.min(Math.max(line.quantity + quantity, product.moq), product.stock) }
          : line);
      });
    },
    setQuantity: (product, quantity) => {
      if (quantity < 1) {
        setLines((current) => current.filter((line) => line.productId !== product.id));
        return;
      }
      if (product.stock < product.moq) return;
      setLines((current) => current.map((line) => line.productId === product.id
        ? { ...line, quantity: Math.min(Math.max(quantity, product.moq), product.stock) }
        : line));
    },
    removeProduct: (productId) => setLines((current) => current.filter((line) => line.productId !== productId)),
    clearCart: () => setLines([]),
    itemCount: lines.reduce((count, line) => count + line.quantity, 0),
  }), [lines, ready]);

  return <ShopCartContext.Provider value={value}>
    {storageError && <div className="shop-storage-warning" role="alert">{storageError}</div>}
    {children}
  </ShopCartContext.Provider>;
}

export function useShopCart() {
  const context = useContext(ShopCartContext);
  if (!context) throw new Error("سبد خرید باید داخل ShopCartProvider استفاده شود.");
  return context;
}

export function ShopHeader() {
  const { itemCount } = useShopCart();

  return (
    <>
      <ExchangeRates />
      <SiteHeader
        actions={
          <>
            <Link className="site-login" href="/login">ورود</Link>
            <Link className="site-button" href="/shop/cart" aria-label={`سبد خرید، ${itemCount} کالا`}>
              سبد خرید
              <b className="site-cart-count">{itemCount}</b>
            </Link>
          </>
        }
      />
    </>
  );
}
