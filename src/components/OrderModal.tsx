"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";

type ProductEntry = { link: string; description: string };

const emptyProduct: ProductEntry = { link: "", description: "" };

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
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [category, setCategory] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("عدد");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [shipping, setShipping] = useState("");
  const [sampleRequest, setSampleRequest] = useState(false);
  const [products, setProducts] = useState<ProductEntry[]>([emptyProduct]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (order) {
      setTitle(order.title || "");
      setProductImage(null);
      setCategory(order.category || "");
      setQty(order.quantity ? String(order.quantity) : "");
      setUnit(order.unit || "عدد");
      setDeadline(order.deadline || "");
      setBudget(order.budget || "");
      setShipping(order.shipping_type || "");
      setSampleRequest(order.sample_request);
      supabase.from("order_products").select("*").eq("order_id", order.id).then(({ data }) => {
        const savedProducts = data || [];
        const primaryProduct = savedProducts[0];
        setProductImageUrl(primaryProduct?.link || "");
        setProductDescription(primaryProduct?.description || "");
        setProducts(savedProducts.length > 1 ? savedProducts.slice(1).map((p) => ({ link: p.link || "", description: p.description || "" })) : [emptyProduct]);
      });
    } else {
      setTitle(""); setProductImage(null); setProductImageUrl(""); setProductDescription("");
      setCategory(""); setQty(""); setUnit("عدد");
      setDeadline(""); setBudget(""); setShipping(""); setSampleRequest(false);
      setProducts([emptyProduct]);
    }
  }, [open, order, supabase]);

  if (!open) return null;

  function updateProduct(i: number, field: keyof ProductEntry, value: string) {
    setProducts((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  }
  function removeProduct(i: number) {
    setProducts((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function handleSubmit() {
    if (!title.trim()) { alert("لطفاً نام کالا را وارد کنید."); return; }
    if (productImage && (!productImage.type.startsWith("image/") || productImage.size > 5 * 1024 * 1024)) {
      alert("لطفاً یک عکس معتبر با حجم کمتر از ۵ مگابایت انتخاب کنید.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);
    const payload = {
      user_id: user.id,
      title: title.trim(),
      category: category || null,
      quantity: qty || null,
      unit: unit || null,
      deadline: deadline || null,
      budget: budget || null,
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

    if (order?.id) {
      await supabase.from("order_products").delete().eq("order_id", order.id);
    }

    const entries = [
      ...(uploadedImageUrl || productDescription.trim() ? [{ link: uploadedImageUrl || null, description: productDescription.trim() || null }] : []),
      ...products.filter((p) => p.link.trim() || p.description.trim()),
    ];
    if (entries.length) {
      await supabase.from("order_products").insert(entries.map((p) => ({ ...p, order_id: orderId })));
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

        <div className="field"><label>نام کالا</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً دستگاه یا قطعه صنعتی" /></div>

        <div className="field">
          <label>عکس محصول</label>
          <input type="file" accept="image/*" onChange={(e) => setProductImage(e.target.files?.[0] || null)} />
          {productImageUrl && <img className="product-image-preview" src={productImageUrl} alt="عکس محصول" />}
        </div>

        <div className="field">
          <label>توضیحات محصول</label>
          <textarea value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="مثلاً سایز، رنگ، جنس یا ویژگی مورد نظر خود را بنویسید" />
        </div>

        <div className="field">
          <label>دسته‌بندی</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">انتخاب دسته‌بندی</option>
            <option>لوازم الکترونیکی</option>
            <option>قطعات صنعتی</option>
            <option>تجهیزات ساختمانی</option>
            <option>مواد اولیه</option>
            <option>ماشین‌آلات</option>
            <option>لوازم خانگی</option>
            <option>پوشاک و نساجی</option>
            <option>سایر</option>
          </select>
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

        <div className="three-col">
          <div className="field">
            <label>مهلت مورد نیاز</label>
            <select value={deadline} onChange={(e) => setDeadline(e.target.value)}>
              <option value="">انتخاب کنید</option>
              <option>فوری (کمتر از ۲ هفته)</option>
              <option>حدود ۱ ماه</option>
              <option>۲ تا ۳ ماه</option>
              <option>بیش از ۳ ماه</option>
              <option>بدون عجله</option>
            </select>
          </div>
          <div className="field"><label>بودجه / قیمت مورد نظر</label><input type="text" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="مثلاً ۱۵٬۰۰۰ یوان" /></div>
          <div className="field">
            <label>نوع حمل</label>
            <select value={shipping} onChange={(e) => setShipping(e.target.value)}>
              <option value="">انتخاب کنید</option>
              <option>دریایی</option><option>هوایی</option><option>زمینی</option>
              <option>ترکیبی (هوایی + زمینی)</option><option>فرقی نمی‌کند</option>
            </select>
          </div>
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
