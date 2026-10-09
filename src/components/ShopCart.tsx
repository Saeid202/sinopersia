"use client";

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import ExchangeRates from "@/components/ExchangeRates";
import { createContext, startTransition, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
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
  setQuantity: (productId: string, quantity: number) => void;
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
      if (product.stock < 1) return;
      setLines((current) => {
        const existing = current.find((line) => line.productId === product.id);
        if (!existing) return [...current, { productId: product.id, quantity: Math.min(quantity, product.stock) }];
        return current.map((line) => line.productId === product.id
          ? { ...line, quantity: Math.min(line.quantity + quantity, product.stock) }
          : line);
      });
    },
    setQuantity: (productId, quantity) => {
      if (quantity < 1) {
        setLines((current) => current.filter((line) => line.productId !== productId));
        return;
      }
      setLines((current) => current.map((line) => line.productId === productId
        ? { ...line, quantity }
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
  const pathname = usePathname();

  return (
    <>
      <ExchangeRates />
      <header className="shop-header">
      <div className="shop-header-inner">
        <Link className="shop-brand-link" href="/" aria-label="بازگشت به ساینو پرشیا">
          <BrandLogo className="shop-brand-logo" priority />
        </Link>
        <nav className="shop-nav" aria-label="ناوبری فروشگاه">
          <Link href="/shop" aria-current={pathname === "/shop" ? "page" : undefined}>فروشگاه</Link>
          <Link href="/#process">فرآیند</Link>
          <Link href="/#consolidation">تجمیع</Link>
          <Link href="/#benefits">چرا ما</Link>
          <Link href="/#suitable">مناسب شما</Link>
          <Link href="/contact">تماس با ما</Link>
        </nav>
        <Link className="shop-cart-link" href="/shop/cart" aria-label={`سبد خرید، ${itemCount} کالا`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 1.9-1.4L21 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg>
          <span>سبد خرید</span><b>{itemCount}</b>
        </Link>
      </div>
    </header>
    </>
  );
}
