"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";

type ProductEntry = { link: string; description: string };
type AutomotivePartEntry = { image: File | null; imageUrl: string; partNumber: string };

const emptyProduct: ProductEntry = { link: "", description: "" };
const createAutomotivePart = (): AutomotivePartEntry => ({ image: null, imageUrl: "", partNumber: "" });

export default function OrderModal({
  open,
  order,
  onClose,
  onSaved,
}: {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [category, setCategory] = useState("");
  const [automotiveParts, setAutomotiveParts] = useState<AutomotivePartEntry[]>([createAutomotivePart()]);
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("عدد");
  const [shipping, setShipping] = useState("");
  const [sampleRequest, setSampleRequest] = useState(false);
  const [products, setProducts] = useState<ProductEntry[]>([emptyProduct]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (order) {
      setTitle(order.title || "");
      setTitleEn(order.title_en || "");
      setProductImage(null);
      setCategory(order.category || "");
      setQty(order.quantity ? String(order.quantity) : "");
      setUnit(order.unit || "عدد");
      setShipping(order.shipping_type || "");
      setSampleRequest(order.sample_request);
      supabase.from("order_products").select("*").eq("order_id", order.id).then(({ data }) => {
        const savedProducts = data || [];
        const primaryProduct = savedProducts[0];
        setProductImageUrl(primaryProduct?.link || "");
        setProductDescription(primaryProduct?.description || "");
        if (order.category === "قطعات خودرو") {
          const savedParts = savedProducts.filter((product) => product.part_number);
          if (savedParts.length) {
            setAutomotiveParts(savedParts.map((product) => ({ image: null, imageUrl: product.link || "", partNumber: product.part_number || "" })));
            const otherProducts = savedProducts.filter((product) => !product.part_number).map((product) => ({ link: product.link || "", description: product.description || "" }));
            setProducts(otherProducts.length ? otherProducts : [emptyProduct]);
          } else {
            const hasLegacyPart = Boolean(primaryProduct?.link || order.part_number);
            setAutomotiveParts(hasLegacyPart
              ? [{ image: null, imageUrl: primaryProduct?.link || "", partNumber: order.part_number || "" }]
              : [createAutomotivePart()]);
            const otherProducts = savedProducts.slice(hasLegacyPart ? 1 : 0).map((product) => ({ link: product.link || "", description: product.description || "" }));
            setProducts(otherProducts.length ? otherProducts : [emptyProduct]);
          }
        } else {
          setAutomotiveParts([createAutomotivePart()]);
          setProducts(savedProducts.length > 1 ? savedProducts.slice(1).map((product) => ({ link: product.link || "", description: product.description || "" })) : [emptyProduct]);
        }
      });
    } else {
      setTitle(""); setTitleEn(""); setProductImage(null); setProductImageUrl(""); setProductDescription("");
      setCategory(""); setAutomotiveParts([createAutomotivePart()]); setQty(""); setUnit("عدد");
      setShipping(""); setSampleRequest(false);
      setProducts([emptyProduct]);
    }
  }, [open, order, supabase]);

  if (!open) return null;

  function updateProduct(i: number, field: keyof ProductEntry, value: string) {
    setProducts((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  }
  function updateAutomotivePart(i: number, changes: Partial<AutomotivePartEntry>) {
    setAutomotiveParts((prev) => prev.map((part, idx) => (idx === i ? { ...part, ...changes } : part)));
  }
  function removeProduct(i: number) {
    setProducts((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }
  function removeAutomotivePart(i: number) {
    setAutomotiveParts((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function handleSubmit() {
    if (!title.trim()) { alert("لطفاً نام کالا را وارد کنید."); return; }
    if (category === "قطعات خودرو" && automotiveParts.some((part) => Boolean(part.image || part.imageUrl) !== Boolean(part.partNumber.trim()))) {
      alert("برای هر عکس قطعه، شماره فنی همان قطعه را هم وارد کنید.");
      return;
    }
    const selectedImages = category === "قطعات خودرو"
      ? automotiveParts.map((part) => part.image).filter((image): image is File => image !== null)
      : productImage ? [productImage] : [];
    if (selectedImages.some((image) => !image.type.startsWith("image/") || image.size > 5 * 1024 * 1024)) {
      alert("لطفاً یک عکس معتبر با حجم کمتر از ۵ مگابایت انتخاب کنید.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);
    const payload = {
      user_id: user.id,
      title: title.trim(),
      title_en: titleEn.trim() || null,
      category: category || null,
      part_number: category === "قطعات خودرو" ? automotiveParts.find((part) => part.partNumber.trim())?.partNumber.trim() || null : null,
      quantity: qty || null,
      unit: unit || null,
      shipping_type: shipping || null,
      sample_request: sampleRequest,
    };

    let orderId = order?.id;
    if (orderId) {
      const { error } = await supabase.from("orders").update(payload).eq("id", orderId);
      if (error) { alert("خطا در ویرایش سفارش: " + error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("orders").insert(payload).select().single();
      if (error) { alert("خطا در ثبت سفارش: " + error.message); setSaving(false); return; }
      orderId = data.id;
    }

    const entries: { link: string | null; description: string | null; part_number: string | null }[] = [];
    if (category === "قطعات خودرو") {
      for (const [index, part] of automotiveParts.entries()) {
        if (!part.image && !part.imageUrl && !part.partNumber.trim()) continue;
        let imageUrl = part.imageUrl;
        if (part.image) {
          const fileExtension = part.image.name.split(".").pop() || "jpg";
          const filePath = `${user.id}/${orderId}-part-${index + 1}-${Date.now()}.${fileExtension}`;
          const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, part.image, { upsert: true });
          if (uploadError) {
            alert("آپلود عکس انجام نشد. لطفاً مطمئن شوید bucket با نام product-images در Supabase ساخته شده است.");
            setSaving(false);
            return;
          }
          imageUrl = supabase.storage.from("product-images").getPublicUrl(filePath).data.publicUrl;
        }
        entries.push({
          link: imageUrl || null,
          description: index === 0 ? productDescription.trim() || null : null,
          part_number: part.partNumber.trim() || null,
        });
      }
    } else {
      let uploadedImageUrl = productImageUrl;
      if (productImage) {
        const fileExtension = productImage.name.split(".").pop() || "jpg";
        const filePath = `${user.id}/${orderId}-${Date.now()}.${fileExtension}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, productImage, { upsert: true });
        if (uploadError) {
          alert("آپلود عکس انجام نشد. لطفاً مطمئن شوید bucket با نام product-images در Supabase ساخته شده است.");
          setSaving(false);
          return;
        }
        uploadedImageUrl = supabase.storage.from("product-images").getPublicUrl(filePath).data.publicUrl;
      }
      if (uploadedImageUrl || productDescription.trim()) {
        entries.push({ link: uploadedImageUrl || null, description: productDescription.trim() || null, part_number: null });
      }
    }
    entries.push(...products.filter((product) => product.link.trim() || product.description.trim()).map((product) => ({
      link: product.link.trim() || null,
      description: product.description.trim() || null,
      part_number: null,
    })));

    if (order?.id) {
      const { error: deleteError } = await supabase.from("order_products").delete().eq("order_id", order.id);
      if (deleteError) { alert("خطا در ویرایش محصولات سفارش: " + deleteError.message); setSaving(false); return; }
    }

    if (entries.length) {
      const { error: productsError } = await supabase.from("order_products").insert(entries.map((product) => ({ ...product, order_id: orderId })));
      if (productsError) { alert("خطا در ثبت محصولات سفارش: " + productsError.message); setSaving(false); return; }
    }

    setSaving(false);
    onSaved();
    onClose();
    alert("سفارش با موفقیت ثبت / ویرایش شد.");
  }

  return (
    <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="بستن">×</button>
        <h2>{order ? `ویرایش سفارش #${order.order_number}` : "ثبت سفارش جدید"}</h2>

        <div className="product-names" role="group" aria-label="نام کالا">
          <div className="field"><label>نام کالا به فارسی</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً قطعه خودرو" /></div>
          <div className="field"><label>نام کالا به انگلیسی</label><input type="text" dir="ltr" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Enter product name in English" /></div>
        </div>

        <div className="field">
          <label>دسته‌بندی</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">انتخاب دسته‌بندی</option>
            <option>لوازم الکترونیکی</option>
            <option>قطعات صنعتی</option>
            <option>قطعات خودرو</option>
            <option>تجهیزات ساختمانی</option>
            <option>مواد اولیه</option>
            <option>ماشین‌آلات</option>
            <option>لوازم خانگی</option>
            <option>پوشاک و نساجی</option>
            <option>سایر</option>
          </select>
        </div>

        {category === "قطعات خودرو" ? (
          <div className="field">
            <label>عکس و شماره فنی قطعات</label>
            <div className="automotive-part-list">
              {automotiveParts.map((part, index) => (
                <div className="automotive-part-row" key={index}>
                  <div className="field">
                    <label>عکس قطعه {index + 1}</label>
                    <input type="file" accept="image/*" onChange={(e) => updateAutomotivePart(index, { image: e.target.files?.[0] || null })} />
                    {part.imageUrl && <img className="product-image-preview" src={part.imageUrl} alt={`عکس قطعه ${index + 1}`} />}
                  </div>
                  <div className="field">
                    <label>شماره فنی</label>
                    <input type="text" dir="ltr" value={part.partNumber} onChange={(e) => updateAutomotivePart(index, { partNumber: e.target.value })} placeholder="شماره فنی" />
                  </div>
                  {automotiveParts.length > 1 && <button type="button" className="remove-btn" onClick={() => removeAutomotivePart(index)} aria-label={`حذف قطعه ${index + 1}`} title="حذف قطعه">×</button>}
                </div>
              ))}
            </div>
            <button type="button" className="add-link" onClick={() => setAutomotiveParts((prev) => [...prev, createAutomotivePart()])}>+ افزودن عکس و شماره فنی</button>
          </div>
        ) : (
          <div className="field">
            <label>عکس محصول</label>
            <input type="file" accept="image/*" onChange={(e) => setProductImage(e.target.files?.[0] || null)} />
            {productImageUrl && <img className="product-image-preview" src={productImageUrl} alt="عکس محصول" />}
          </div>
        )}

        <div className="field">
          <label>توضیحات محصول</label>
          <textarea value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="مثلاً سایز، رنگ، جنس یا ویژگی مورد نظر خود را بنویسید" />
        </div>

        <div className="field">
          <label>تعداد و واحد</label>
          <div className="quantity-row">
            <input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="مثلاً 100" />
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option>عدد</option><option>کیلوگرم</option><option>تن</option><option>متر</option>
              <option>مترمربع</option><option>متر مکعب</option><option>دستگاه</option>
              <option>کارتن</option><option>بسته</option><option>جفت</option><option>سایر</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>لینک و توضیحات کالا</label>
          {products.map((p, i) => (
            <div className="product-entry" key={i}>
              <div className="product-link-row">
                <input type="url" value={p.link} onChange={(e) => updateProduct(i, "link", e.target.value)} placeholder="لینک محصول یا فروشنده" />
                <button type="button" className="remove-btn" onClick={() => removeProduct(i)}>×</button>
              </div>
              <div className="product-desc">
                <textarea value={p.description} onChange={(e) => updateProduct(i, "description", e.target.value)} placeholder="توضیحات تکمیلی (اختیاری)" />
              </div>
            </div>
          ))}
          <button type="button" className="add-link" onClick={() => setProducts((prev) => [...prev, emptyProduct])}>+ افزودن لینک / توضیحات دیگر</button>
        </div>

        <div className="field">
            <label>نوع حمل</label>
            <select value={shipping} onChange={(e) => setShipping(e.target.value)}>
              <option value="">انتخاب کنید</option>
              <option>دریایی</option><option>هوایی</option><option>زمینی</option>
              <option>ترکیبی (هوایی + زمینی)</option><option>فرقی نمی‌کند</option>
            </select>
        </div>

        <div className="field">
          <label className="checkbox-field">
            <input type="checkbox" checked={sampleRequest} onChange={(e) => setSampleRequest(e.target.checked)} />
            <div>
              <div className="checkbox-title">درخواست نمونه</div>
              <div className="checkbox-desc">در صورت نیاز به نمونه قبل از سفارش اصلی، این گزینه را فعال کنید.</div>
            </div>
          </label>
        </div>

        <div className="modal-actions">
          <button className="primary" onClick={handleSubmit} disabled={saving}>{saving ? "در حال ثبت..." : "ثبت سفارش"}</button>
          <button className="secondary" onClick={onClose}>انصراف</button>
        </div>
      </div>
    </div>
  );
}
