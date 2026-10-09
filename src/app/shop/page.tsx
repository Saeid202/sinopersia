"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { categoryLabel, formatShopPrice, getProductTitle, type ShopCategory, type ShopProduct } from "@/lib/shop";
import RialPrice from "@/components/RialPrice";
import { useShopCart } from "@/components/ShopCart";

export default function ShopPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [categoryRows, setCategoryRows] = useState<ShopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("همهٔ دسته‌ها");
  const [sort, setSort] = useState("newest");
  const { addProduct } = useShopCart();

  useEffect(() => {
    const supabase = createClient();
    void Promise.all([
      supabase.from("shop_products").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("shop_categories").select("id, name_en, name_fa, sort_order").order("sort_order"),
    ]).then(([productsResult, categoriesResult]) => {
        if (productsResult.error) {
          setError("بارگذاری محصولات انجام نشد. لطفاً کمی بعد دوباره تلاش کنید.");
          console.error("Failed to load shop products:", productsResult.error);
        } else {
          setProducts((productsResult.data as ShopProduct[]) || []);
        }
        if (!categoriesResult.error) setCategoryRows((categoriesResult.data as ShopCategory[]) || []);
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => ["همهٔ دسته‌ها", ...new Set(products.map((product) => product.category).filter(Boolean))], [products]);
  const visibleProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const query = search.trim().toLocaleLowerCase();
      const matchesSearch = !query || [product.title_fa, product.title_en, product.category, product.sku]
        .some((value) => value?.toLocaleLowerCase().includes(query));
      return matchesSearch && (category === "همهٔ دسته‌ها" || product.category === category);
    });
    if (sort === "price-low") return filtered.sort((a, b) => a.price - b.price);
    if (sort === "price-high") return filtered.sort((a, b) => b.price - a.price);
    return filtered;
  }, [category, products, search, sort]);

  return (
    <div className="shop-page">
      <section className="shop-hero">
        <div className="shop-container shop-hero-inner">
          <div className="shop-hero-copy">
            <span className="shop-eyebrow">SINO PERSIA MARKETPLACE</span>
            <h1>محصولات منتخب،<br /><em>مستقیم از چین</em></h1>
            <p>محصول را به سبد اضافه کنید. مبلغ کالا به ریال، با نرخ بازار همان لحظه، از درگاه پرداخت می‌شود. هزینهٔ ارسال جداست.</p>
            <a className="shop-primary-button" href="#shop-products">مشاهدهٔ محصولات</a>
          </div>
          <div className="shop-hero-art" aria-hidden="true">
            <span className="shop-art-orbit shop-art-orbit-one" />
            <span className="shop-art-orbit shop-art-orbit-two" />
            <div className="shop-art-box"><span>SP</span><small>CHINA → IRAN</small></div>
            <span className="shop-art-caption">از انتخاب تا ارسال، همراه شماییم</span>
          </div>
        </div>
      </section>

      <section className="shop-container shop-products-section" id="shop-products">
        <div className="shop-section-heading">
          <div><span className="shop-eyebrow">کاتالوگ ساینو پرشیا</span><h2>محصولات فروشگاه</h2></div>
          <span className="shop-result-count">{loading ? "در حال بارگذاری…" : `${visibleProducts.length} محصول`}</span>
        </div>
        <div className="shop-toolbar">
          <label className="shop-search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجوی محصول یا کد کالا" aria-label="جست‌وجوی محصولات" />
          </label>
          <label className="shop-select-label"><span>دسته‌بندی</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="فیلتر دسته‌بندی">
              {categories.map((item) => <option key={item} value={item}>{item === "همهٔ دسته‌ها" ? item : categoryLabel(item, categoryRows)}</option>)}
            </select>
          </label>
          <label className="shop-select-label"><span>مرتب‌سازی</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="مرتب‌سازی محصولات">
              <option value="newest">جدیدترین</option><option value="price-low">ارزان‌ترین</option><option value="price-high">گران‌ترین</option>
            </select>
          </label>
        </div>

        {error ? <div className="shop-message shop-error" role="alert">{error}</div> : loading ? (
          <div className="shop-product-grid" aria-label="در حال بارگذاری محصولات">{Array.from({ length: 8 }, (_, index) => <div className="shop-product-skeleton" key={index} />)}</div>
        ) : visibleProducts.length ? (
          <div className="shop-product-grid">
            {visibleProducts.map((product) => (
              <article className="shop-product-card" key={product.id}>
                <Link className="shop-product-image" href={`/shop/${product.id}`} aria-label={`مشاهدهٔ ${getProductTitle(product)}`}>
                  {product.image_url ? <Image src={product.image_url} alt={getProductTitle(product)} fill sizes="(max-width: 620px) 90vw, (max-width: 980px) 42vw, 25vw" unoptimized /> : <span className="shop-image-placeholder" aria-hidden="true">SP</span>}
                  <span className={`shop-stock-badge ${product.stock > 0 ? "" : "is-out-of-stock"}`}>{product.stock > 0 ? "موجود" : "ناموجود"}</span>
                </Link>
                <div className="shop-product-info">
                  <span className="shop-product-category">{categoryLabel(product.category, categoryRows)}</span>
                  <Link href={`/shop/${product.id}`} className="shop-product-title">{getProductTitle(product)}</Link>
                  {product.sku && <span className="shop-product-sku">کد کالا: <b dir="ltr">{product.sku}</b></span>}
                  <div className="shop-product-card-bottom">
                    <div className="shop-price-stack">
                      <strong className="shop-product-price">{formatShopPrice(product.price, product.currency)}</strong>
                      <RialPrice price={product.price} currency={product.currency} />
                    </div>
                    <button type="button" className="shop-add-icon" disabled={product.stock < 1} aria-label={`افزودن ${getProductTitle(product)} به سبد`} onClick={() => addProduct(product)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="shop-empty-state"><span>◇</span><h3>محصولی پیدا نشد</h3><p>عبارت جست‌وجو یا فیلتر دسته‌بندی را تغییر دهید.</p></div>
        )}
      </section>
      <aside className="shop-shipping-note"><span>✳</span><p><strong>خرید با اطمینان</strong> مبلغ کالا با نرخ بازار به ریال در سبد گرفته می‌شود. هزینهٔ ارسال در این پرداخت نیست.</p></aside>
    </div>
  );
}
