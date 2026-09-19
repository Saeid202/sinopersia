"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";

const STATUS_OPTIONS = ["در انتظار بررسی", "در حال بررسی", "منتظر تأیید مشتری", "تکمیل‌شده"];

export default function AgentQuoteModal({
  order,
  onClose,
  onSaved,
}: {
  order: Order | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [status, setStatus] = useState("در انتظار بررسی");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!order) return;
    setStatus(order.status);
    setPrice(order.price || "");
    setMessage("");
  }, [order]);

  if (!order) return null;

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !order) return;
    setSaving(true);

    const { error } = await supabase.from("orders").update({ status, price: price || null }).eq("id", order.id);
    if (error) { alert("خطا در به‌روزرسانی سفارش: " + error.message); setSaving(false); return; }

    if (message.trim()) {
      const agentName = (user.user_metadata?.full_name as string) || user.email || "کارشناس";
      await supabase.from("agent_messages").insert({
        order_id: order.id, user_id: order.user_id, agent_name: agentName, message: message.trim(),
      });
    }

    setSaving(false);
    onSaved();
    onClose();
    alert("سفارش به‌روزرسانی شد.");
  }

  return (
    <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="بستن">×</button>
        <h2>قیمت‌گذاری سفارش #{order.order_number}</h2>

        <div className="two-col">
          <div className="field">
            <label>وضعیت سفارش</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field"><label>قیمت نهایی</label><input type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="مثلاً ¥ 12,800" /></div>
        </div>

        <div className="field">
          <label>پیام به مشتری (اختیاری)</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="مثلاً: قیمت نهایی آماده شده، لطفاً بررسی و تأیید بفرمایید." />
        </div>

        <div className="modal-actions">
          <button className="primary" onClick={handleSave} disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره و اطلاع‌رسانی"}</button>
          <button className="secondary" onClick={onClose}>انصراف</button>
        </div>
      </div>
    </div>
  );
}
