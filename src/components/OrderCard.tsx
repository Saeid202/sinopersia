"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { statusClass, type Order, type OrderComment } from "@/lib/types";

export default function OrderCard({
  order,
  onView,
  onEdit,
  onDeleted,
}: {
  order: Order;
  onView: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<OrderComment[]>([]);
  const [text, setText] = useState("");

  async function toggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) await loadComments();
  }

  async function loadComments() {
    const { data } = await supabase
      .from("order_comments")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false });
    setComments(data || []);
  }

  async function sendComment() {
    if (!text.trim()) { alert("لطفاً متن کامنت را بنویسید."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("order_comments").insert({
      order_id: order.id, user_id: user.id, author_type: "customer", message: text.trim(),
    });
    if (error) { alert("خطا در ارسال کامنت: " + error.message); return; }
    setText("");
    loadComments();
  }

  async function handleDownload() {
    alert(`در حال آماده‌سازی فایل سفارش #${order.order_number} برای دانلود...\n\n(در نسخه واقعی فایل PDF یا Excel دانلود می‌شود)`);
  }

  async function handleDelete() {
    if (!confirm("آیا از حذف این سفارش مطمئن هستید؟\nاین عمل قابل بازگشت نیست.")) return;
    const { error } = await supabase.from("orders").delete().eq("id", order.id);
    if (error) { alert("خطا در حذف سفارش: " + error.message); return; }
    onDeleted();
  }

  return (
    <div className={`order-card ${open ? "open" : ""}`}>
      <div className="order-main" onClick={toggle}>
        <div className="order-info">
          <div className="order-id">#{order.order_number}</div>
          <div className="order-title">{order.title}</div>
          <div className="order-date">{new Date(order.created_at).toLocaleDateString("fa-IR")}</div>
          <div><span className={`status ${statusClass(order.status)}`}>{order.status}</span></div>
          <div className="order-price">{order.price || "—"}</div>
        </div>
        <div className="order-actions">
          <button className="btn-view" onClick={(e) => { e.stopPropagation(); onView(); }}>دیدن</button>
          <button className="btn-edit" onClick={(e) => { e.stopPropagation(); onEdit(); }}>ویرایش</button>
          <button className="btn-download" onClick={(e) => { e.stopPropagation(); handleDownload(); }}>دانلود</button>
          <button className="btn-delete" onClick={(e) => { e.stopPropagation(); handleDelete(); }}>حذف</button>
          <div className="order-arrow" style={{ transform: open ? "rotate(180deg)" : undefined }}>▼</div>
        </div>
      </div>
      {open && (
        <div className="comment-section">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="پیام یا کامنت خود را برای کارشناس بنویسید..." />
          <div className="comment-actions">
            <button className="btn-send-comment" onClick={sendComment}>ارسال کامنت</button>
          </div>
          <div className="comment-list">
            {comments.map((c) => (
              <div className="comment-item" key={c.id}>
                <div className="comment-meta">{c.author_type === "customer" ? "شما" : "کارشناس"} — {new Date(c.created_at).toLocaleString("fa-IR")}</div>
                <div className="comment-text">{c.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
