"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatShopPrice, getProductCategory, getProductTitle, type ShopProduct } from "@/lib/shop";
import { useShopCart } from "@/components/ShopCart";

export default function ShopCartPage() {
  const router = useRouter();
  const { lines, ready, setQuantity, removeProduct, clearCart } = useShopCart();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const loadCartProducts = useCallback(async () => {
    if (!ready) return;
    if (lines.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error: queryError } = await supabase.from("shop_products").select("*").in("id", lines.map((line) => line.productId)).eq("is_active", true);
    if (queryError) {
      setError("بارگذاری سبد خرید انجام نشد. لطفاً صفحه را دوباره بارگذاری کنید.");
      console.error("Failed to load shop cart products:", queryError);
    } else {
      setProducts((data as ShopProduct[]) || []);
    }
    setLoading(false);
  }, [lines, ready]);

  useEffect(() => { startTransition(() => { void loadCartProducts(); }); }, [loadCartProducts]);

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

  async function submitPurchaseRequest() {
    setError("");
    setNotice("");
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      setError("بررسی ورود شما انجام نشد. لطفاً دوباره تلاش کنید.");
      return;
    }
    if (!user) {
      router.push("/login?next=%2Fshop%2Fcart");
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
    const title = `درخواست خرید فروشگاه · ${availableLines.length} قلم`;
    const estimatedDetails = availableLines.map((line) => {
      const product = productById.get(line.productId)!;
      return `${getProductTitle(product)} × ${line.quantity} — برآورد کالا: ${formatShopPrice(product.price * line.quantity, product.currency)}`;
    });
    const notes = [
      "ثبت درخواست خرید از فروشگاه ساینو پرشیا.",
      ...estimatedDetails,
      "قیمت کالاها برآوردی است؛ هزینهٔ حمل و مبلغ نهایی باید پیش از پرداخت با مشتری تأیید شود.",
    ].join("\n");
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      user_id: user.id,
      title,
      title_en: `Shop purchase request · ${availableLines.length} items`,
      category: "فروشگاه",
      quantity: availableLines.reduce((sum, line) => sum + line.quantity, 0),
      notes,
      sample_request: false,
    }).select("id").single();
    if (orderError) {
      setError(`ثبت درخواست انجام نشد: ${orderError.message}`);
      setSubmitting(false);
      return;
    }

    const orderProducts = availableLines.map((line) => {
      const product = productById.get(line.productId)!;
      return {
        order_id: order.id,
        link: null,
        description: `${getProductTitle(product)} | شناسه: ${product.id} | تعداد: ${line.quantity} | قیمت واحد: ${formatShopPrice(product.price, product.currency)}`,
        part_number: product.sku,
      };
    });
    const { error: itemsError } = await supabase.from("order_products").insert(orderProducts);
    if (itemsError) {
      console.error("Shop request was saved but its order product rows were not:", itemsError);
      clearCart();
      setSubmitted(true);
      setNotice(`درخواست خرید شما ثبت شد و جزئیات کامل اقلام در توضیحات سفارش ذخیره شده است؛ اما ذخیرهٔ ردیف‌های جداگانه با خطا روبه‌رو شد (${itemsError.message}). کارشناس ما هزینهٔ نهایی و ارسال را پیش از پرداخت با شما هماهنگ می‌کند.`);
      setSubmitting(false);
      return;
    }

    clearCart();
    setSubmitted(true);
    setNotice("درخواست خرید شما ثبت شد. کارشناس ما هزینهٔ نهایی و ارسال را پیش از پرداخت با شما هماهنگ می‌کند.");
    setSubmitting(false);
  }

  if (submitted) {
    return <section className="shop-container shop-request-success" role="status">
      <span>✓</span><h1>درخواست شما ثبت شد</h1><p>{notice}</p>
      <div><Link className="shop-primary-button" href="/dashboard">پیگیری در پنل کاربری</Link><Link className="shop-secondary-button" href="/shop">ادامهٔ خرید</Link></div>
    </section>;
  }

  return (
    <section className="shop-container shop-cart-page">
      <nav className="shop-breadcrumb" aria-label="مسیر صفحه"><Link href="/shop">فروشگاه</Link><span>/</span><span>سبد خرید</span></nav>
      <div className="shop-section-heading"><div><span className="shop-eyebrow">بازبینی سفارش</span><h1>سبد خرید شما</h1></div><span className="shop-result-count">{lines.reduce((sum, line) => sum + line.quantity, 0)} کالا</span></div>
      {error && <div className="shop-message shop-error" role="alert">{error}</div>}
      {notice && <div className="shop-message shop-success" role="status">{notice}</div>}
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
                <div className="shop-cart-product"><Link href={`/shop/${product.id}`}>{getProductTitle(product)}</Link><span>{formatShopPrice(product.price, product.currency)} · {getProductCategory(product.category)}</span>{overStock && <small className="shop-stock-warning">فقط {product.stock} عدد موجود است.</small>}</div>
                <div className="shop-cart-item-actions">
                  <div className="shop-quantity-control">
                    <button type="button" aria-label="افزایش تعداد" disabled={line.quantity >= product.stock} onClick={() => setQuantity(product.id, Math.min(product.stock, line.quantity + 1))}>+</button>
                    <span>{line.quantity}</span>
                    <button type="button" aria-label="کاهش تعداد" disabled={line.quantity <= 1} onClick={() => setQuantity(product.id, line.quantity - 1)}>−</button>
                  </div>
                  <strong>{formatShopPrice(product.price * line.quantity, product.currency)}</strong>
                  <button type="button" className="shop-remove-item" onClick={() => removeProduct(product.id)}>حذف</button>
                </div>
              </article>;
            })}
          </div>
          <aside className="shop-cart-summary">
            <h2>خلاصهٔ درخواست</h2>
            <div className="shop-summary-lines">{estimatedTotals.map(([currency, total]) => <p key={currency}><span>برآورد قیمت کالاها</span><strong>{formatShopPrice(total, currency)}</strong></p>)}</div>
            <div className="shop-shipping-disclaimer"><span>i</span><p>هزینهٔ ارسال در این مبلغ نیست. قیمت نهایی پس از بررسی و پیش از پرداخت به شما اعلام می‌شود.</p></div>
            <button type="button" className="shop-primary-button shop-submit-request" disabled={submitting || loading || availableLines.length === 0 || availableLines.length !== lines.length} onClick={() => void submitPurchaseRequest()}>
              {submitting ? "در حال ثبت درخواست…" : "ثبت درخواست خرید"}
            </button>
            <Link className="shop-continue-link" href="/shop">ادامهٔ خرید</Link>
          </aside>
        </div>
      )}
    </section>
  );
}
