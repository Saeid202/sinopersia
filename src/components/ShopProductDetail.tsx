"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatShopPrice, getProductCategory, getProductDescription, getProductTitle, type ShopProduct } from "@/lib/shop";
import { useShopCart } from "@/components/ShopCart";

export default function ShopProductDetail({ productId }: { productId: string }) {
  const router = useRouter();
  const { addProduct } = useShopCart();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.from("shop_products").select("*").eq("id", productId).eq("is_active", true).maybeSingle()
      .then(({ data, error: queryError }) => {
        if (queryError) {
          setError("بارگذاری اطلاعات محصول انجام نشد. لطفاً دوباره تلاش کنید.");
          console.error("Failed to load shop product:", queryError);
        } else if (data) {
          setProduct(data as ShopProduct);
        }
        setLoading(false);
      });
  }, [productId]);

  if (loading) return <div className="shop-container shop-detail-loading" aria-live="polite">در حال بارگذاری محصول…</div>;
  if (error) return <div className="shop-container shop-message shop-error" role="alert">{error}</div>;
  if (!product) return <div className="shop-container shop-empty-state"><h1>این محصول در دسترس نیست</h1><Link href="/shop">بازگشت به فروشگاه</Link></div>;

  const description = getProductDescription(product);
  return (
    <div className="shop-container shop-detail-page">
      <nav className="shop-breadcrumb" aria-label="مسیر صفحه"><Link href="/shop">فروشگاه</Link><span>/</span><span>{getProductTitle(product)}</span></nav>
      <div className="shop-detail-grid">
        <div className="shop-detail-media">
          <div className="shop-detail-image">
            {product.image_url ? <Image src={product.image_url} alt={getProductTitle(product)} fill sizes="(max-width: 760px) 100vw, 52vw" priority unoptimized /> : <span className="shop-image-placeholder" aria-hidden="true">SP</span>}
          </div>
          <div className="shop-detail-image-caption"><span>CHINA</span><i>→</i><span>IRAN</span><small>خرید و ارسال با همراهی ساینو پرشیا</small></div>
        </div>
        <section className="shop-detail-info">
          <span className="shop-product-category">{getProductCategory(product.category)}</span>
          <h1>{getProductTitle(product)}</h1>
          {product.sku && <p className="shop-detail-sku">کد کالا: <b dir="ltr">{product.sku}</b></p>}
          <div className="shop-detail-price-row">
            <strong className="shop-detail-price">{formatShopPrice(product.price, product.currency)}</strong>
            <span className={`shop-availability ${product.stock > 0 ? "is-available" : ""}`}><i aria-hidden="true" />{product.stock > 0 ? `موجود · ${product.stock} عدد` : "فعلاً ناموجود"}</span>
          </div>
          {description && <div className="shop-description"><h2>دربارهٔ محصول</h2><p>{description}</p></div>}
          <div className="shop-detail-actions">
            <div className="shop-quantity-control" aria-label="تعداد محصول">
              <button type="button" aria-label="افزایش تعداد" disabled={quantity >= product.stock} onClick={() => setQuantity((count) => Math.min(count + 1, product.stock))}>+</button>
              <span>{quantity}</span>
              <button type="button" aria-label="کاهش تعداد" disabled={quantity <= 1} onClick={() => setQuantity((count) => Math.max(1, count - 1))}>−</button>
            </div>
            <button type="button" className="shop-primary-button shop-detail-add" disabled={product.stock < 1} onClick={() => { addProduct(product, quantity); setAdded(true); }}>
              {added ? "به سبد اضافه شد" : "افزودن به سبد خرید"}
            </button>
          </div>
          {added && <button type="button" className="shop-view-cart" onClick={() => router.push("/shop/cart")}>مشاهدهٔ سبد خرید ←</button>}
          <div className="shop-order-assurance"><span>✓</span><p><strong>پرداخت پس از تأیید</strong><br />قیمت نهایی و هزینهٔ حمل پیش از پرداخت به شما اعلام می‌شود.</p></div>
          <div className="shop-product-meta"><span>دسته‌بندی</span><strong>{getProductCategory(product.category)}</strong><span>فروشنده</span><strong>فروشندهٔ منتخب ساینو پرشیا</strong></div>
        </section>
      </div>
    </div>
  );
}
