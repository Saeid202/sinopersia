"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderProduct } from "@/lib/types";

export default function DetailsModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const supabase = createClient();
  const [products, setProducts] = useState<OrderProduct[]>([]);

  useEffect(() => {
    if (!order) return;
    supabase.from("order_products").select("*").eq("order_id", order.id).then(({ data }) => setProducts(data || []));
  }, [order, supabase]);

  if (!order) return null;

  return (
    <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="بستن">×</button>
        <h2>جزئیات سفارش #{order.order_number}</h2>
        <div className="details-grid">
          <div className="details-item"><label>شماره سفارش</label><div className="value">#{order.order_number}</div></div>
          <div className="details-item"><label>وضعیت</label><div className="value">{order.status}</div></div>
          <div className="details-item"><label>عنوان</label><div className="value">{order.title}</div></div>
          <div className="details-item"><label>دسته‌بندی</label><div className="value">{order.category || "—"}</div></div>
          <div className="details-item"><label>تاریخ ثبت</label><div className="value">{new Date(order.created_at).toLocaleDateString("fa-IR")}</div></div>
          <div className="details-item"><label>تعداد</label><div className="value">{order.quantity || "—"} {order.unit || ""}</div></div>
          <div className="details-item"><label>قیمت</label><div className="value">{order.price || "—"}</div></div>
          <div className="details-item"><label>نوع حمل</label><div className="value">{order.shipping_type || "—"}</div></div>
          <div className="details-item"><label>مهلت</label><div className="value">{order.deadline || "—"}</div></div>
          <div className="details-item"><label>بودجه</label><div className="value">{order.budget || "—"}</div></div>
          <div className="details-item details-full"><label>توضیحات</label><div className="value">{order.notes || "—"}</div></div>
          {products.map((p) => (
            <div className="details-item details-full" key={p.id}>
              <label>محصول</label>
              <div className="value">
                {p.link && <img className="product-image-details" src={p.link} alt="عکس محصول" />}
                {p.description || (!p.link ? "—" : "")}
              </div>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="secondary" onClick={onClose}>بستن</button>
        </div>
      </div>
    </div>
  );
}
