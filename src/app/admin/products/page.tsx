"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { categoryLabel, type ShopCategory } from "@/lib/shop";

type AdminProduct = {
  id: string;
  seller_id: string;
  category: string;
  sku: string | null;
  title_en: string;
  title_fa: string | null;
  price: number | string;
  currency: "CNY" | "USD";
  stock: number;
  is_active: boolean;
  shop_sellers: { store_name: string } | { store_name: string }[] | null;
};

type ProductDraft = {
  title_en: string;
  title_fa: string;
  category: string;
  sku: string;
  price: string;
  currency: "CNY" | "USD";
  stock: string;
};

const emptyCategory = { name_en: "", name_fa: "" };

function setupHint(message: string) {
  if (/shop_categories|schema cache|does not exist|Could not find the table|row-level security|permission denied/i.test(message)) {
    return "جدول دسته‌بندی یا دسترسی ادمین هنوز آماده نیست. فایل supabase/shop-categories.sql را یک بار در SQL Editor اجرا کنید.";
  }
  return message;
}

function storeName(product: AdminProduct) {
  const seller = Array.isArray(product.shop_sellers) ? product.shop_sellers[0] : product.shop_sellers;
  return seller?.store_name || "—";
}

function productTitle(product: AdminProduct) {
  return product.title_fa?.trim() || product.title_en;
}

export default function AdminProductsPage() {
  const [supabase] = useState(() => createClient());
  const [tab, setTab] = useState<"categories" | "products">("categories");
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    const [categoryResult, productResult] = await Promise.all([
      supabase.from("shop_categories").select("id, name_en, name_fa, sort_order").order("sort_order"),
      supabase.from("shop_products").select("id, seller_id, category, sku, title_en, title_fa, price, currency, stock, is_active, shop_sellers(store_name)").order("created_at", { ascending: false }),
    ]);
    if (categoryResult.error) {
      setCategories([]);
      setError(setupHint(categoryResult.error.message));
    } else {
      setCategories((categoryResult.data as ShopCategory[]) || []);
      setError("");
    }
    if (productResult.error) {
      setProducts([]);
      setError((current) => current || setupHint(productResult.error.message));
    } else {
      setProducts((productResult.data as AdminProduct[]) || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  async function saveCategory(event: React.FormEvent) {
    event.preventDefault();
    const nameEn = categoryForm.name_en.trim();
    const nameFa = categoryForm.name_fa.trim();
    if (!nameEn || !nameFa) return;
    setSavingCategory(true);
    setNotice("");
    setError("");
    const payload = editingCategoryId
      ? supabase.from("shop_categories").update({ name_en: nameEn, name_fa: nameFa }).eq("id", editingCategoryId)
      : supabase.from("shop_categories").insert({ name_en: nameEn, name_fa: nameFa, sort_order: categories.length + 1 });
    const { error: saveError } = await payload;
    setSavingCategory(false);
    if (saveError) {
      setError(saveError.code === "23505" ? "این نام فارسی یا انگلیسی قبلاً ثبت شده است." : setupHint(saveError.message));
      return;
    }
    setCategoryForm(emptyCategory);
    setEditingCategoryId(null);
    setNotice(editingCategoryId ? "دسته‌بندی ذخیره شد." : "دسته‌بندی اضافه شد.");
    await loadCatalog();
  }

  async function removeCategory(category: ShopCategory) {
    if (!confirm(`دسته‌بندی «${category.name_fa}» حذف شود؟`)) return;
    setError("");
    setNotice("");
    const { error: deleteError } = await supabase.from("shop_categories").delete().eq("id", category.id);
    if (deleteError) {
      setError(setupHint(deleteError.message));
      return;
    }
    if (editingCategoryId === category.id) {
      setEditingCategoryId(null);
      setCategoryForm(emptyCategory);
    }
    setNotice("دسته‌بندی حذف شد.");
    await loadCatalog();
  }

  function startProductEdit(product: AdminProduct) {
    setEditingProduct(product);
    setProductDraft({
      title_en: product.title_en,
      title_fa: product.title_fa || "",
      category: product.category,
      sku: product.sku || "",
      price: String(product.price),
      currency: product.currency,
      stock: String(product.stock),
    });
    setError("");
    setNotice("");
  }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault();
    if (!editingProduct || !productDraft) return;
    const price = Number(productDraft.price);
    const stock = Number(productDraft.stock);
    if (!productDraft.title_en.trim() || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
      setError("نام انگلیسی، قیمت و موجودی را درست وارد کنید.");
      return;
    }
    setSavingProductId(editingProduct.id);
    setError("");
    const { error: saveError } = await supabase.from("shop_products").update({
      title_en: productDraft.title_en.trim(),
      title_fa: productDraft.title_fa.trim() || null,
      category: productDraft.category,
      sku: productDraft.sku.trim() || null,
      price,
      currency: productDraft.currency,
      stock,
    }).eq("id", editingProduct.id);
    setSavingProductId(null);
    if (saveError) {
      setError(setupHint(saveError.message));
      return;
    }
    setEditingProduct(null);
    setProductDraft(null);
    setNotice("محصول ذخیره شد.");
    await loadCatalog();
  }

  async function toggleProduct(product: AdminProduct) {
    setSavingProductId(product.id);
    setError("");
    const { error: updateError } = await supabase.from("shop_products").update({ is_active: !product.is_active }).eq("id", product.id);
    setSavingProductId(null);
    if (updateError) {
      setError(setupHint(updateError.message));
      return;
    }
    setNotice(product.is_active ? "محصول از فروشگاه برداشته شد." : "محصول دوباره منتشر شد.");
    await loadCatalog();
  }

  async function removeProduct(product: AdminProduct) {
    if (!confirm(`محصول «${productTitle(product)}» حذف شود؟`)) return;
    setSavingProductId(product.id);
    setError("");
    const { error: deleteError } = await supabase.from("shop_products").delete().eq("id", product.id);
    setSavingProductId(null);
    if (deleteError) {
      setError(setupHint(deleteError.message));
      return;
    }
    if (editingProduct?.id === product.id) {
      setEditingProduct(null);
      setProductDraft(null);
    }
    setNotice("محصول حذف شد.");
    await loadCatalog();
  }

  const categoryOptions = productDraft && !categories.some((item) => item.name_en === productDraft.category)
    ? [{ id: productDraft.category, name_en: productDraft.category, name_fa: categoryLabel(productDraft.category, categories), sort_order: 0 }, ...categories]
    : categories;

  return (
    <div>
      <div className="topbar">
        <div className="title"><h1>مدیریت محصولات</h1><p>دسته‌بندی‌های فروشگاه و همهٔ محصول‌های منتشرشده</p></div>
      </div>
      <div className="admin-tabs">
        <button className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}>مدیریت دسته‌بندی‌ها ({categories.length})</button>
        <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>محصولات ({products.length})</button>
      </div>
      {error && <p className="admin-note" role="alert">{error}</p>}
      {notice && <p className="admin-note" role="status">{notice}</p>}

      {tab === "categories" && <section className="admin-panel">
        <div className="admin-panel-head"><h2>{editingCategoryId ? "ویرایش دسته‌بندی" : "دسته‌بندی تازه"}</h2><span>{categories.length} دسته</span></div>
        <form className="admin-catalog-form" onSubmit={(event) => void saveCategory(event)}>
          <div className="field"><label htmlFor="category-fa">نام فارسی</label><input id="category-fa" value={categoryForm.name_fa} onChange={(event) => setCategoryForm({ ...categoryForm, name_fa: event.target.value })} required maxLength={80} /></div>
          <div className="field"><label htmlFor="category-en">نام انگلیسی</label><input id="category-en" dir="ltr" value={categoryForm.name_en} onChange={(event) => setCategoryForm({ ...categoryForm, name_en: event.target.value })} required maxLength={80} /></div>
          <button className="primary" disabled={savingCategory}>{savingCategory ? "در حال ذخیره..." : editingCategoryId ? "ذخیره" : "افزودن"}</button>
          {editingCategoryId && <button type="button" className="admin-link" onClick={() => { setEditingCategoryId(null); setCategoryForm(emptyCategory); }}>انصراف</button>}
        </form>
        {loading ? <div className="empty-state">در حال بارگذاری...</div> : categories.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>نام فارسی</th><th>نام انگلیسی</th><th>عملیات</th></tr></thead><tbody>{categories.map((category) => <tr key={category.id}><td>{category.name_fa}</td><td className="admin-id">{category.name_en}</td><td className="admin-row-actions"><button type="button" className="admin-link" onClick={() => { setEditingCategoryId(category.id); setCategoryForm({ name_en: category.name_en, name_fa: category.name_fa }); setTab("categories"); }}>ویرایش</button><button type="button" className="admin-link admin-danger" onClick={() => void removeCategory(category)}>حذف</button></td></tr>)}</tbody></table></div> : <div className="empty-state">دسته‌بندی‌ای ثبت نشده است</div>}
      </section>}

      {tab === "products" && <section className="admin-panel">
        <div className="admin-panel-head"><h2>همهٔ محصولات</h2><span>{products.length} محصول</span></div>
        {editingProduct && productDraft && <form className="admin-product-form" onSubmit={(event) => void saveProduct(event)}>
          <div className="field"><label>نام فارسی</label><input value={productDraft.title_fa} onChange={(event) => setProductDraft({ ...productDraft, title_fa: event.target.value })} maxLength={160} /></div>
          <div className="field"><label>نام انگلیسی</label><input dir="ltr" value={productDraft.title_en} onChange={(event) => setProductDraft({ ...productDraft, title_en: event.target.value })} required maxLength={160} /></div>
          <div className="field"><label>دسته‌بندی</label><select value={productDraft.category} onChange={(event) => setProductDraft({ ...productDraft, category: event.target.value })}>{categoryOptions.map((item) => <option key={item.id} value={item.name_en}>{item.name_fa}</option>)}</select></div>
          <div className="field"><label>کد کالا</label><input dir="ltr" value={productDraft.sku} onChange={(event) => setProductDraft({ ...productDraft, sku: event.target.value })} maxLength={80} /></div>
          <div className="field"><label>قیمت</label><input dir="ltr" type="number" min="0.01" step="0.01" value={productDraft.price} onChange={(event) => setProductDraft({ ...productDraft, price: event.target.value })} required /></div>
          <div className="field"><label>ارز</label><select value={productDraft.currency} onChange={(event) => setProductDraft({ ...productDraft, currency: event.target.value as ProductDraft["currency"] })}><option value="CNY">CNY</option><option value="USD">USD</option></select></div>
          <div className="field"><label>موجودی</label><input dir="ltr" type="number" min={0} step={1} value={productDraft.stock} onChange={(event) => setProductDraft({ ...productDraft, stock: event.target.value })} required /></div>
          <div className="admin-product-form-actions"><button className="primary" disabled={savingProductId === editingProduct.id}>{savingProductId === editingProduct.id ? "در حال ذخیره..." : "ذخیرهٔ محصول"}</button><button type="button" className="admin-link" onClick={() => { setEditingProduct(null); setProductDraft(null); }}>انصراف</button></div>
        </form>}
        {loading ? <div className="empty-state">در حال بارگذاری...</div> : products.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>محصول</th><th>فروشنده</th><th>دسته</th><th>قیمت</th><th>موجودی</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td>{productTitle(product)}</td><td>{storeName(product)}</td><td>{categoryLabel(product.category, categories)}</td><td className="admin-id">{product.price} {product.currency}</td><td>{product.stock}</td><td><span className={`status ${product.is_active ? "done" : ""}`}>{product.is_active ? "منتشر" : "متوقف"}</span></td><td className="admin-row-actions"><button type="button" className="admin-link" disabled={savingProductId === product.id} onClick={() => startProductEdit(product)}>ویرایش</button><button type="button" className="admin-link" disabled={savingProductId === product.id} onClick={() => void toggleProduct(product)}>{product.is_active ? "توقف" : "انتشار"}</button><button type="button" className="admin-link admin-danger" disabled={savingProductId === product.id} onClick={() => void removeProduct(product)}>حذف</button></td></tr>)}</tbody></table></div> : <div className="empty-state">محصولی در فروشگاه نیست</div>}
      </section>}
    </div>
  );
}
