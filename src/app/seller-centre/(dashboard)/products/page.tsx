"use client";

import Image from "next/image";
import { startTransition, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSellerLocale } from "@/components/SellerCentreShell";

type ShopSeller = { id: string; store_name: string };
type ShopProduct = {
  id: string;
  seller_id: string;
  category: string;
  sku: string | null;
  title_en: string;
  title_fa: string | null;
  description_en: string | null;
  description_fa: string | null;
  price: number;
  currency: "CNY" | "USD";
  stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
};

type ProductImport = {
  id: string;
  source_filename: string;
  status: "needs_review" | "completed";
  page_count: number;
  item_count: number;
  created_at: string;
};

type ProductImportItem = {
  id: string;
  import_id: string;
  source_page: number;
  raw_text: string;
  extraction_note: string;
  title_en: string;
  title_fa: string | null;
  category: string;
  sku: string | null;
  description_en: string | null;
  description_fa: string | null;
  price: number | null;
  currency: "CNY" | "USD" | null;
  stock: number | null;
  review_status: "pending" | "approved" | "rejected";
};

type ProductDraft = {
  category: string;
  sku: string;
  title_en: string;
  title_fa: string;
  description_en: string;
  description_fa: string;
  price: string;
  currency: "CNY" | "USD";
  stock: string;
  image_url: string;
  is_active: boolean;
};

const emptyDraft = (): ProductDraft => ({
  category: "",
  sku: "",
  title_en: "",
  title_fa: "",
  description_en: "",
  description_fa: "",
  price: "",
  currency: "CNY",
  stock: "0",
  image_url: "",
  is_active: true,
});

const PRODUCT_CATEGORIES: { value: string; en: string; fa: string }[] = [
  { value: "Electronics", en: "Electronics", fa: "لوازم الکترونیکی" },
  { value: "Industrial Parts", en: "Industrial Parts", fa: "قطعات صنعتی" },
  { value: "Auto Parts", en: "Auto Parts", fa: "قطعات خودرو" },
  { value: "Construction Equipment", en: "Construction Equipment", fa: "تجهیزات ساختمانی" },
  { value: "Raw Materials", en: "Raw Materials", fa: "مواد اولیه" },
  { value: "Machinery", en: "Machinery", fa: "ماشین‌آلات" },
  { value: "Home Appliances", en: "Home Appliances", fa: "لوازم خانگی" },
  { value: "Clothing & Textiles", en: "Clothing & Textiles", fa: "پوشاک و نساجی" },
  { value: "Other", en: "Other", fa: "سایر" },
];

export default function SellerProductsPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const { language, t } = useSellerLocale();
  const [seller, setSeller] = useState<ShopSeller | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [productImports, setProductImports] = useState<ProductImport[]>([]);
  const [activeImport, setActiveImport] = useState<ProductImport | null>(null);
  const [importItems, setImportItems] = useState<ProductImportItem[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importError, setImportError] = useState("");
  const [importNotice, setImportNotice] = useState("");

  const loadSellerCentre = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/seller-centre/login"); return; }
    const [
      { data: sellerData, error: sellerError },
      { data: productData, error: productError },
      { data: importData, error: importErrorResult },
    ] = await Promise.all([
      supabase.from("shop_sellers").select("id,store_name").eq("id", user.id).maybeSingle(),
      supabase.from("shop_products").select("*").eq("seller_id", user.id).order("created_at", { ascending: false }),
      supabase.from("shop_product_imports").select("id,source_filename,status,page_count,item_count,created_at").eq("seller_id", user.id).eq("status", "needs_review").order("created_at", { ascending: false }),
    ]);
    if (sellerError || !sellerData) {
      setError(sellerError?.message || t("sellerOnly"));
      setLoading(false);
      return;
    }
    if (productError) setError(productError.message);
    if (importErrorResult) setImportError(importErrorResult.message);
    setSeller(sellerData as ShopSeller);
    setProducts((productData as ShopProduct[]) || []);
    setProductImports((importData as ProductImport[]) || []);
    setLoading(false);
  }, [router, supabase, t]);

  useEffect(() => { startTransition(() => { void loadSellerCentre(); }); }, [loadSellerCentre]);

  function resetDraft() {
    setDraft(emptyDraft());
    setImageFile(null);
    setEditingProductId(null);
    setError("");
  }

  function openAddForm() {
    resetDraft();
    setNotice("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    resetDraft();
  }

  function editProduct(product: ShopProduct) {
    setDraft({
      category: product.category,
      sku: product.sku || "",
      title_en: product.title_en,
      title_fa: product.title_fa || "",
      description_en: product.description_en || "",
      description_fa: product.description_fa || "",
      price: String(product.price),
      currency: product.currency,
      stock: String(product.stock),
      image_url: product.image_url || "",
      is_active: product.is_active,
    });
    setImageFile(null);
    setEditingProductId(product.id);
    setError("");
    setNotice("");
    setShowForm(true);
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!seller || saving) return;
    setError("");
    setNotice("");
    if (imageFile && (!imageFile.type.startsWith("image/") || imageFile.size > 5 * 1024 * 1024)) {
      setError(t("validImage"));
      return;
    }

    setSaving(true);
    let imageUrl = draft.image_url;
    if (imageFile) {
      const extension = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${seller.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("shop-product-images").upload(path, imageFile, { upsert: false });
      if (uploadError) {
        setError(`${t("uploadError")} ${uploadError.message}`);
        setSaving(false);
        return;
      }
      imageUrl = supabase.storage.from("shop-product-images").getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      seller_id: seller.id,
      category: draft.category.trim() || "Other",
      sku: draft.sku.trim() || null,
      title_en: draft.title_en.trim(),
      title_fa: draft.title_fa.trim() || null,
      description_en: draft.description_en.trim() || null,
      description_fa: draft.description_fa.trim() || null,
      price: Number(draft.price),
      currency: draft.currency,
      stock: Number(draft.stock),
      image_url: imageUrl || null,
      is_active: draft.is_active,
    };
    const result = editingProductId
      ? await supabase.from("shop_products").update(payload).eq("id", editingProductId).eq("seller_id", seller.id)
      : await supabase.from("shop_products").insert(payload);
    if (result.error) {
      setError(`${t("saveError")} ${result.error.message}`);
      setSaving(false);
      return;
    }
    setShowForm(false);
    resetDraft();
    setSaving(false);
    setNotice(t("productSaved"));
    await loadSellerCentre();
  }

  async function toggleProduct(product: ShopProduct) {
    const { error: updateError } = await supabase.from("shop_products").update({ is_active: !product.is_active }).eq("id", product.id).eq("seller_id", product.seller_id);
    if (updateError) { setError(updateError.message); return; }
    setProducts((current) => current.map((item) => item.id === product.id ? { ...item, is_active: !item.is_active } : item));
  }

  async function deleteProduct(product: ShopProduct) {
    if (!window.confirm(t("deleteConfirm"))) return;
    const { error: deleteError } = await supabase.from("shop_products").delete().eq("id", product.id).eq("seller_id", product.seller_id);
    if (deleteError) { setError(deleteError.message); return; }
    setProducts((current) => current.filter((item) => item.id !== product.id));
    if (editingProductId === product.id) closeForm();
  }

  async function openProductImport(productImport: ProductImport) {
    setImportError("");
    setImportNotice("");
    setImportLoading(true);
    const { data, error: queryError } = await supabase
      .from("shop_product_import_items")
      .select("*")
      .eq("import_id", productImport.id)
      .eq("review_status", "pending")
      .order("source_page", { ascending: true });
    setImportLoading(false);
    if (queryError) {
      setImportError(queryError.message);
      return;
    }
    setActiveImport(productImport);
    setImportItems((data as ProductImportItem[]) || []);
  }

  async function uploadProductPdf(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!importFile || importing) return;
    const uploadForm = event.currentTarget;
    setImportError("");
    setImportNotice("");
    setImporting(true);
    try {
      const formData = new FormData();
      formData.set("file", importFile);
      const response = await fetch("/api/seller-centre/product-imports", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "بارگذاری و استخراج PDF انجام نشد.");
      const batch = result.batch as ProductImport;
      setProductImports((current) => [batch, ...current.filter((item) => item.id !== batch.id)]);
      setImportFile(null);
      uploadForm.reset();
      await openProductImport(batch);
      setImportNotice(language === "fa" ? "استخراج انجام شد؛ هیچ محصولی منتشر نشده است. ردیف‌ها را بررسی کنید." : "Extraction finished; nothing was published. Review the draft rows.");
    } catch (uploadError) {
      setImportError(uploadError instanceof Error ? uploadError.message : "بارگذاری و استخراج PDF انجام نشد.");
    } finally {
      setImporting(false);
    }
  }

  async function saveImportDrafts(items = importItems) {
    if (!activeImport) return false;
    const pendingItems = items.filter((item) => item.review_status === "pending");
    const results = await Promise.all(pendingItems.map((item) => supabase
      .from("shop_product_import_items")
      .update({
        title_en: item.title_en.trim(),
        title_fa: item.title_fa?.trim() || null,
        category: item.category.trim() || "Other",
        sku: item.sku?.trim() || null,
        description_en: item.description_en?.trim() || null,
        description_fa: item.description_fa?.trim() || null,
        price: item.price,
        currency: item.currency,
        stock: item.stock,
      })
      .eq("id", item.id)
      .eq("import_id", activeImport.id)
      .eq("review_status", "pending")
      .select("id")
      .single()));
    const failedResult = results.find((result) => result.error);
    if (failedResult?.error) {
      setImportError(`${language === "fa" ? "ذخیرهٔ تغییرات انجام نشد:" : "Could not save changes:"} ${failedResult.error.message}`);
      return false;
    }
    setImportError("");
    return true;
  }

  async function saveImportReview() {
    if (reviewing) return;
    setReviewing(true);
    const saved = await saveImportDrafts();
    if (saved) setImportNotice(language === "fa" ? "تغییرات ذخیره شد." : "Changes saved.");
    setReviewing(false);
  }

  async function approveImportItems() {
    if (!activeImport || reviewing) return;
    const pendingItems = importItems.filter((item) => item.review_status === "pending");
    if (pendingItems.length === 0) return;
    if (pendingItems.some((item) => !item.title_en.trim() || !item.category.trim() || !item.price || item.price <= 0 || !item.currency || item.stock === null || item.stock < 0)) {
      setImportError(language === "fa"
        ? "برای انتشار، نام انگلیسی، دسته‌بندی، قیمت، ارز و موجودی هر محصول را تکمیل کنید."
        : "Before publishing, provide an English name, category, price, currency, and stock for every product.");
      return;
    }
    setReviewing(true);
    if (!await saveImportDrafts()) {
      setReviewing(false);
      return;
    }
    const { error: approvalError } = await supabase.rpc("approve_shop_product_import_items", {
      import_id_input: activeImport.id,
      item_ids_input: pendingItems.map((item) => item.id),
    });
    if (approvalError) {
      setImportError(`${language === "fa" ? "انتشار محصولات انجام نشد:" : "Could not publish products:"} ${approvalError.message}`);
      setReviewing(false);
      return;
    }
    setActiveImport(null);
    setImportItems([]);
    setReviewing(false);
    setImportNotice(language === "fa" ? "محصولات انتخاب‌شده با موفقیت منتشر شدند." : "The selected products were published.");
    await loadSellerCentre();
  }

  async function rejectImportItem(item: ProductImportItem) {
    if (reviewing || !window.confirm(language === "fa" ? "این ردیف از فهرست محصولات پیشنهادی حذف شود؟" : "Reject this product draft?")) return;
    setReviewing(true);
    const { error: rejectError } = await supabase.rpc("reject_shop_product_import_item", { item_id_input: item.id });
    if (rejectError) {
      setImportError(`${language === "fa" ? "ردکردن ردیف انجام نشد:" : "Could not reject draft:"} ${rejectError.message}`);
    } else {
      setImportItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setImportNotice(language === "fa" ? "ردیف انتخاب‌شده رد شد و منتشر نمی‌شود." : "The selected draft was rejected and will not be published.");
      if (importItems.filter((candidate) => candidate.review_status === "pending").length === 1) {
        setActiveImport(null);
        await loadSellerCentre();
      }
    }
    setReviewing(false);
  }

  const activeCount = products.filter((product) => product.is_active).length;
  const currencyLocale = language === "fa" ? "fa-IR" : "en-US";
  const pdfCopy = language === "fa" ? {
    title: "ورود محصولات از PDF",
    description: "فقط متن PDF در همین سرور پردازش می‌شود. فایل اسکن‌شده پشتیبانی نمی‌شود و هیچ محصولی بدون تأیید شما منتشر نخواهد شد.",
    choose: "انتخاب فایل PDF",
    upload: "استخراج محصولات",
    uploading: "در حال استخراج…",
    drafts: "ردیف استخراج‌شده",
    review: "بررسی ردیف‌ها",
    source: "متن استخراج‌شده",
    page: "صفحه",
    nameEn: "نام انگلیسی",
    nameFa: "نام فارسی",
    category: "دسته‌بندی",
    sku: "کد کالا",
    price: "قیمت",
    currency: "ارز",
    stock: "موجودی",
    descriptionEn: "توضیحات انگلیسی",
    descriptionFa: "توضیحات فارسی",
    reject: "رد",
    save: "ذخیرهٔ بررسی",
    publish: "تأیید و انتشار",
    close: "بستن",
    noPending: "برای این پرونده ردیف در انتظار بررسی باقی نمانده است.",
  } : {
    title: "Import products from PDF",
    description: "Text PDFs are processed on this server only. Scanned PDFs are unsupported, and nothing is published without your approval.",
    choose: "Choose PDF",
    upload: "Extract products",
    uploading: "Extracting…",
    drafts: "extracted rows",
    review: "Review drafts",
    source: "Extracted source text",
    page: "Page",
    nameEn: "English name",
    nameFa: "Persian name",
    category: "Category",
    sku: "SKU",
    price: "Price",
    currency: "Currency",
    stock: "Stock",
    descriptionEn: "English description",
    descriptionFa: "Persian description",
    reject: "Reject",
    save: "Save review",
    publish: "Approve & publish",
    close: "Close",
    noPending: "No drafts remain for review in this import.",
  };

  return (
    <div className="seller-dashboard">
      <header className="seller-page-heading">
        <div>
          <p className="seller-eyebrow">SINO PERSIA / {t("productsNav").toUpperCase()}</p>
          <h1>{seller?.store_name || t("sellerCentre")}</h1>
          <p>{t("yourProducts")}</p>
        </div>
        <button type="button" className="seller-primary-button" onClick={openAddForm}>+ {t("addProduct")}</button>
      </header>

      <section className="seller-product-import-panel">
        <div className="seller-product-import-copy">
          <p className="seller-eyebrow">{pdfCopy.title}</p>
          <p>{pdfCopy.description}</p>
        </div>
        <form className="seller-product-import-form" onSubmit={uploadProductPdf}>
          <input
            id="product-pdf-file"
            type="file"
            accept="application/pdf,.pdf"
            required
            onChange={(event) => setImportFile(event.target.files?.[0] || null)}
            aria-label={pdfCopy.choose}
          />
          <button type="submit" className="seller-primary-button" disabled={!importFile || importing}>
            {importing ? pdfCopy.uploading : pdfCopy.upload}
          </button>
        </form>
        {(importError || importNotice) && <div className={importError ? "seller-form-error" : "seller-form-info"} role={importError ? "alert" : "status"}>{importError || importNotice}</div>}
        {productImports.length > 0 && (
          <div className="seller-product-import-list">
            {productImports.map((productImport) => (
              <article className="seller-product-import-row" key={productImport.id}>
                <div>
                  <strong>{productImport.source_filename}</strong>
                  <span>{productImport.page_count} {pdfCopy.page} · {productImport.item_count} {pdfCopy.drafts}</span>
                </div>
                <button type="button" className="seller-secondary-button" onClick={() => void openProductImport(productImport)} disabled={importLoading}>{pdfCopy.review}</button>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="seller-stat-row">
        <article className="seller-stat"><span>{t("productCount")}</span><strong>{products.length}</strong></article>
        <article className="seller-stat"><span>{t("activeCount")}</span><strong>{activeCount}</strong></article>
      </div>

      {(error || notice) && <div className={error ? "seller-form-error" : "seller-form-info"} role={error ? "alert" : "status"}>{error || notice}</div>}

      <section className="seller-product-list-section">
        <div className="seller-section-heading"><div><p className="seller-eyebrow">{t("catalogue").toUpperCase()}</p><h2>{t("yourProducts")}</h2></div><span>{products.length}</span></div>
        {loading ? <div className="seller-empty-state" role="status">{t("loadingProducts")}</div> : products.length === 0 ? <div className="seller-empty-state">{t("emptyProducts")}</div> : (
          <div className="seller-product-table-wrapper">
            <table className="seller-product-table">
              <thead>
                <tr>
                  <th>{t("product")}</th>
                  <th>{t("category")}</th>
                  <th>{t("sku")}</th>
                  <th>{t("price")}</th>
                  <th>{t("stock")}</th>
                  <th>{t("status")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="seller-product-table-name">
                        {product.image_url ? <Image className="seller-product-photo" src={product.image_url} alt={product.title_en} width={48} height={48} unoptimized /> : <div className="seller-product-photo seller-product-placeholder" aria-hidden="true">SP</div>}
                        <div>
                          <h3>{language === "fa" ? product.title_fa || product.title_en : product.title_en}</h3>
                          {product.title_fa && <p dir="rtl" className="seller-product-persian-name">{product.title_fa}</p>}
                        </div>
                      </div>
                    </td>
                    <td>{product.category}</td>
                    <td>{product.sku || "—"}</td>
                    <td>{new Intl.NumberFormat(currencyLocale, { style: "currency", currency: product.currency }).format(product.price)}</td>
                    <td>{product.stock}</td>
                    <td><span className={`seller-product-status ${product.is_active ? "published" : "paused"}`}>{product.is_active ? t("active") : t("paused")}</span></td>
                    <td>
                      <div className="seller-product-actions">
                        <button type="button" className="seller-icon-action" title={t("editProduct")} aria-label={t("editProduct")} onClick={() => editProduct(product)}>✎</button>
                        <button type="button" className="seller-icon-action" title={product.is_active ? t("pause") : t("publish")} aria-label={product.is_active ? t("pause") : t("publish")} onClick={() => toggleProduct(product)}>{product.is_active ? "Ⅱ" : "▶"}</button>
                        <button type="button" className="seller-icon-action danger" title={t("delete")} aria-label={t("delete")} onClick={() => deleteProduct(product)}>×</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {activeImport && (
        <div className="seller-modal-backdrop" role="presentation" onClick={() => setActiveImport(null)}>
          <section className="seller-modal seller-import-review-modal" role="dialog" aria-modal="true" aria-labelledby="product-import-review-title" onClick={(event) => event.stopPropagation()}>
            <div className="seller-section-heading">
              <div>
                <p className="seller-eyebrow">{activeImport.source_filename}</p>
                <h2 id="product-import-review-title">{pdfCopy.review}</h2>
              </div>
              <button type="button" className="seller-icon-action seller-modal-close" title={pdfCopy.close} aria-label={pdfCopy.close} onClick={() => setActiveImport(null)}>×</button>
            </div>
            {importLoading ? <div className="seller-empty-state" role="status">{t("loadingProducts")}</div> : importItems.length === 0 ? <div className="seller-empty-state">{pdfCopy.noPending}</div> : (
              <div className="seller-import-draft-list">
                {importItems.map((item) => (
                  <article className="seller-import-draft" key={item.id}>
                    <p className="seller-import-source">{pdfCopy.source} · {pdfCopy.page} {item.source_page}: <span>{item.raw_text}</span></p>
                    <p className="seller-form-info">{item.extraction_note}</p>
                    <div className="seller-import-fields">
                      <label>{pdfCopy.nameEn}<input value={item.title_en} maxLength={160} onChange={(event) => setImportItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, title_en: event.target.value } : entry))} /></label>
                      <label>{pdfCopy.nameFa}<input dir="rtl" value={item.title_fa || ""} maxLength={160} onChange={(event) => setImportItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, title_fa: event.target.value } : entry))} /></label>
                      <label>{pdfCopy.category}
                        <select value={item.category} onChange={(event) => setImportItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, category: event.target.value } : entry))}>
                          {PRODUCT_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{language === "fa" ? category.fa : category.en}</option>)}
                        </select>
                      </label>
                      <label>{pdfCopy.sku}<input value={item.sku || ""} maxLength={80} onChange={(event) => setImportItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, sku: event.target.value } : entry))} /></label>
                      <label>{pdfCopy.price}<input type="number" min="0.01" step="0.01" value={item.price ?? ""} onChange={(event) => setImportItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, price: event.target.value ? Number(event.target.value) : null } : entry))} /></label>
                      <label>{pdfCopy.currency}
                        <select value={item.currency || ""} onChange={(event) => setImportItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, currency: event.target.value ? event.target.value as "CNY" | "USD" : null } : entry))}>
                          <option value="">—</option><option value="CNY">CNY</option><option value="USD">USD</option>
                        </select>
                      </label>
                      <label>{pdfCopy.stock}<input type="number" min="0" step="1" value={item.stock ?? ""} onChange={(event) => setImportItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, stock: event.target.value ? Number(event.target.value) : null } : entry))} /></label>
                      <label>{pdfCopy.descriptionEn}<textarea rows={2} value={item.description_en || ""} onChange={(event) => setImportItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, description_en: event.target.value } : entry))} /></label>
                      <label>{pdfCopy.descriptionFa}<textarea dir="rtl" rows={2} value={item.description_fa || ""} onChange={(event) => setImportItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, description_fa: event.target.value } : entry))} /></label>
                    </div>
                    <button type="button" className="seller-secondary-button seller-import-reject" onClick={() => void rejectImportItem(item)} disabled={reviewing}>{pdfCopy.reject}</button>
                  </article>
                ))}
              </div>
            )}
            {importError && <div className="seller-form-error" role="alert">{importError}</div>}
            {importNotice && <div className="seller-form-info" role="status">{importNotice}</div>}
            <div className="seller-import-review-actions">
              <button type="button" className="seller-secondary-button" onClick={() => void saveImportReview()} disabled={reviewing || importItems.length === 0}>{reviewing ? "…" : pdfCopy.save}</button>
              <button type="button" className="seller-primary-button" onClick={() => void approveImportItems()} disabled={reviewing || importItems.length === 0}>{pdfCopy.publish}</button>
            </div>
          </section>
        </div>
      )}

      {showForm && (
        <div className="seller-modal-backdrop" role="presentation" onClick={closeForm}>
          <section className="seller-modal seller-product-form-panel" id="seller-product-form" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="seller-section-heading">
              <div>
                <p className="seller-eyebrow">{t("productListing").toUpperCase()}</p>
                <h2>{editingProductId ? t("editProduct") : t("addProduct")}</h2>
                <p className="seller-modal-subtitle">{editingProductId ? t("editProductSubtitle") : t("addProductSubtitle")}</p>
              </div>
              <button type="button" className="seller-icon-action seller-modal-close" title={t("close")} aria-label={t("close")} onClick={closeForm}>×</button>
            </div>
            <form className="seller-product-form" onSubmit={saveProduct}>
              <label>{t("category")}
                <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} required>
                  <option value="" disabled>{t("selectCategory")}</option>
                  {draft.category && !PRODUCT_CATEGORIES.some((item) => item.value === draft.category) && (
                    <option value={draft.category}>{draft.category}</option>
                  )}
                  {PRODUCT_CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>{language === "fa" ? item.fa : item.en}</option>
                  ))}
                </select>
              </label>
              <label>{t("nameEn")}<input value={draft.title_en} onChange={(event) => setDraft({ ...draft, title_en: event.target.value })} required maxLength={160} /></label>
              <label>{t("nameFa")}<input dir="rtl" value={draft.title_fa} onChange={(event) => setDraft({ ...draft, title_fa: event.target.value })} maxLength={160} /></label>
              <label>{t("descriptionEn")}<textarea value={draft.description_en} onChange={(event) => setDraft({ ...draft, description_en: event.target.value })} rows={3} /></label>
              <label>{t("descriptionFa")}<textarea dir="rtl" value={draft.description_fa} onChange={(event) => setDraft({ ...draft, description_fa: event.target.value })} rows={3} /></label>
              <div className="seller-form-grid">
                <label>{t("sku")}<input value={draft.sku} onChange={(event) => setDraft({ ...draft, sku: event.target.value })} maxLength={80} /></label>
                <label>{t("stock")}<input type="number" min={0} step={1} value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} required /></label>
              </div>
              <div className="seller-form-grid">
                <label>{t("price")}<input type="number" min="0.01" step="0.01" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} required /></label>
                <label>{t("currency")}<select value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value as ProductDraft["currency"] })}><option value="CNY">CNY</option><option value="USD">USD</option></select></label>
              </div>
              <label>{t("image")}<input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] || null)} /></label>
              {draft.image_url && !imageFile && <Image className="seller-form-image-preview" src={draft.image_url} alt={draft.title_en} width={120} height={120} unoptimized />}
              {imageFile && <p className="seller-file-name">{imageFile.name}</p>}
              <div className="seller-form-actions">
                <button type="submit" className="seller-primary-button" disabled={saving}>{saving ? t("saving") : t("save")}</button>
                <button type="button" className="seller-secondary-button" onClick={closeForm}>{t("cancel")}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}