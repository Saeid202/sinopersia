"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { categoryLabel, formatShopPrice, getProductTitle, type ShopCategory, type ShopProduct } from "@/lib/shop";
import RialPrice from "@/components/RialPrice";
import { formatRial, rialAmount } from "@/lib/rial";
import { useRateBoard } from "@/lib/use-rate-board";
import { useShopCart } from "@/components/ShopCart";

export default function ShopCartPage() {
  const router = useRouter();
  const { lines, ready, setQuantity, removeProduct, clearCart } = useShopCart();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [gateways, setGateways] = useState<{ code: string; name: string; sandbox: boolean }[]>([]);
  const [gatewaysReady, setGatewaysReady] = useState(false);
  const [gatewayCode, setGatewayCode] = useState("");

  const loadCartProducts = useCallback(async () => {
    if (!ready) return;
    if (lines.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const [{ data, error: queryError }, categoryResult] = await Promise.all([
      supabase.from("shop_products").select("*").in("id", lines.map((line) => line.productId)).eq("is_active", true),
      supabase.from("shop_categories").select("id, name_en, name_fa, sort_order").order("sort_order"),
    ]);
    if (queryError) {
      setError("بارگذاری سبد خرید انجام نشد. لطفاً صفحه را دوباره بارگذاری کنید.");
      console.error("Failed to load shop cart products:", queryError);
    } else {
      setProducts((data as ShopProduct[]) || []);
      if (!categoryResult.error) setCategories((categoryResult.data as ShopCategory[]) || []);
    }
    setLoading(false);
  }, [lines, ready]);

  useEffect(() => { startTransition(() => { void loadCartProducts(); }); }, [loadCartProducts]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/payments/gateways")
      .then((response) => response.json())
      .then((body: { gateways?: { code: string; name: string; sandbox: boolean }[] }) => {
        if (cancelled) return;
        const enabled = body.gateways || [];
        setGateways(enabled);
        setGatewayCode((current) => enabled.some((gateway) => gateway.code === current) ? current : enabled[0]?.code || "");
        setGatewaysReady(true);
      })
      .catch(() => {
        if (!cancelled) setGatewaysReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  const board = useRateBoard();
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const availableLines = lines.filter((line) => {
    const product = productById.get(line.productId);
    return product && product.stock > 0;
  });
  const estimatedTotals = useMemo(() => {
    const totals = new Map<ShopProduct["currency"], number>();
    for (const line of availableLines) {
      const product = productById.get(line.productId);
      if (product) totals.set(product.currency, (totals.get(product.currency) || 0) + product.price * line.quantity);
    }
    return [...totals.entries()];
  }, [availableLines, productById]);

  const rialTotal = board ? availableLines.reduce((sum, line) => {
    const product = productById.get(line.productId);
    return product ? sum + rialAmount(product.price * line.quantity, product.currency, board) : sum;
  }, 0) : 0;

  function openGateway(payment: { redirectUrl: string; redirectMethod: "GET" | "POST"; redirectFields?: Record<string, string> }) {
    if (payment.redirectMethod === "GET") {
      window.location.assign(payment.redirectUrl);
      return;
    }
    const form = document.createElement("form");
    form.method = "POST";
    form.action = payment.redirectUrl;
    for (const [name, value] of Object.entries(payment.redirectFields || {})) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }

  async function payForCart() {
    setError("");
    if (!gatewayCode) {
      setError("درگاه فعالی برای پرداخت نیست. مدیر باید یک درگاه را فعال کند.");
      return;
    }
    if (availableLines.length !== lines.length) {
      setError("یک یا چند محصول دیگر موجود نیست. آن‌ها را از سبد حذف کنید و دوباره تلاش کنید.");
      return;
    }
    const invalidLine = availableLines.find((line) => {
      const product = productById.get(line.productId);
      return !product || line.quantity > product.stock;
    });
    if (invalidLine) {
      const product = productById.get(invalidLine.productId);
      setError(`تعداد درخواستی ${product ? getProductTitle(product) : "یکی از کالاها"} بیش از موجودی فعلی است. تعداد را اصلاح کنید.`);
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/shop/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gatewayCode,
        lines: availableLines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      }),
    });
    const body = await response.json().catch(() => null) as { error?: string; redirectUrl?: string; redirectMethod?: "GET" | "POST"; redirectFields?: Record<string, string> } | null;
    if (response.status === 401) {
      router.push("/login?next=%2Fshop%2Fcart");
      return;
    }
    if (!response.ok || !body?.redirectUrl || !body.redirectMethod) {
      setError(body?.error || "اتصال به درگاه انجام نشد.");
      setSubmitting(false);
      return;
    }
    clearCart();
    openGateway({ redirectUrl: body.redirectUrl, redirectMethod: body.redirectMethod, redirectFields: body.redirectFields });
  }

  return (
    <section className="shop-container shop-cart-page">
      <nav className="shop-breadcrumb" aria-label="مسیر صفحه"><Link href="/shop">فروشگاه</Link><span>/</span><span>سبد خرید</span></nav>
      <div className="shop-section-heading"><div><span className="shop-eyebrow">بازبینی سفارش</span><h1>سبد خرید شما</h1></div><span className="shop-result-count">{lines.reduce((sum, line) => sum + line.quantity, 0)} کالا</span></div>
      {error && <div className="shop-message shop-error" role="alert">{error}</div>}
      {loading ? <div className="shop-detail-loading" aria-live="polite">در حال بارگذاری سبد خرید…</div> : lines.length === 0 ? (
        <div className="shop-empty-state"><span>◇</span><h2>سبد خرید شما خالی است</h2><p>محصولات فروشگاه را ببینید و کالاهای دلخواهتان را به سبد اضافه کنید.</p><Link className="shop-primary-button" href="/shop">رفتن به فروشگاه</Link></div>
      ) : (
        <div className="shop-cart-layout">
          <div className="shop-cart-items">
            {lines.map((line) => {
              const product = productById.get(line.productId);
              if (!product) return <article className="shop-cart-item shop-cart-unavailable" key={line.productId}>
                <div><strong>این محصول دیگر در دسترس نیست</strong><small>برای ادامه، آن را از سبد حذف کنید.</small></div>
                <button type="button" onClick={() => removeProduct(line.productId)}>حذف</button>
              </article>;
              const overStock = line.quantity > product.stock;
              return <article className="shop-cart-item" key={line.productId}>
                <Link className="shop-cart-image" href={`/shop/${product.id}`}>
                  {product.image_url ? <Image src={product.image_url} alt={getProductTitle(product)} fill sizes="96px" unoptimized /> : <span className="shop-image-placeholder">SP</span>}
                </Link>
                <div className="shop-cart-product"><Link href={`/shop/${product.id}`}>{getProductTitle(product)}</Link><span>{formatShopPrice(product.price, product.currency)} · {categoryLabel(product.category, categories)}</span>{overStock && <small className="shop-stock-warning">فقط {product.stock} عدد موجود است.</small>}</div>
                <div className="shop-cart-item-actions">
                  <div className="shop-quantity-control">
                    <button type="button" aria-label="افزایش تعداد" disabled={line.quantity >= product.stock} onClick={() => setQuantity(product.id, Math.min(product.stock, line.quantity + 1))}>+</button>
                    <span>{line.quantity}</span>
                    <button type="button" aria-label="کاهش تعداد" disabled={line.quantity <= 1} onClick={() => setQuantity(product.id, line.quantity - 1)}>−</button>
                  </div>
                  <div className="shop-price-stack">
                    <strong>{formatShopPrice(product.price * line.quantity, product.currency)}</strong>
                    <RialPrice price={product.price} currency={product.currency} quantity={line.quantity} />
                  </div>
                  <button type="button" className="shop-remove-item" onClick={() => removeProduct(product.id)}>حذف</button>
                </div>
              </article>;
            })}
          </div>
          <aside className="shop-cart-summary">
            <h2>پرداخت</h2>
            <div className="shop-summary-lines">
              {estimatedTotals.map(([currency, total]) => <p key={currency}><span>قیمت کالاها</span><strong>{formatShopPrice(total, currency)}</strong></p>)}
              {board && <p><span>مبلغ قابل پرداخت</span><strong className="shop-rial-total">{formatRial(rialTotal)}</strong></p>}
            </div>
            <div className="shop-gateways" role="radiogroup" aria-label="درگاه پرداخت">
              {!gatewaysReady && <p className="shop-gateway-empty">در حال بررسی درگاه‌ها…</p>}
              {gatewaysReady && gateways.length === 0 && <p className="shop-gateway-empty">درگاه فعالی نیست. مدیر باید زرین‌پال یا بانک ملت را در پنل فعال کند و کلیدها را وارد کند.</p>}
              {gateways.map((gateway) => (
                <label className={gateway.code === gatewayCode ? "shop-gateway is-selected" : "shop-gateway"} key={gateway.code}>
                  <input type="radio" name="gateway" value={gateway.code} checked={gateway.code === gatewayCode} onChange={() => setGatewayCode(gateway.code)} />
                  <span>{gateway.name}</span>
                  {gateway.sandbox && <small>آزمایشی</small>}
                </label>
              ))}
            </div>
            <div className="shop-shipping-disclaimer"><span>i</span><p>مبلغ کالا با نرخ بازار همین لحظه به ریال حساب می‌شود و همان رقم به درگاه می‌رود. هزینهٔ ارسال در این پرداخت نیست.</p></div>
            <button type="button" className="shop-primary-button shop-submit-request" disabled={submitting || loading || !board || !gatewayCode || availableLines.length === 0 || availableLines.length !== lines.length} onClick={() => void payForCart()}>
              {submitting ? "در حال اتصال به درگاه…" : board ? "پرداخت" : "در حال گرفتن نرخ بازار…"}
            </button>
            <Link className="shop-continue-link" href="/shop">ادامهٔ خرید</Link>
          </aside>
        </div>
      )}
    </section>
  );
}
