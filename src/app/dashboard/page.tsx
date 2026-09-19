"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";
import OrderCard from "@/components/OrderCard";
import OrderModal from "@/components/OrderModal";
import OrderDetailsModal from "@/components/OrderDetailsModal";

export default function OrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const active = orders.filter((o) => o.status !== "تکمیل‌شده").length;
  const pending = orders.filter((o) => o.status === "در انتظار بررسی").length;
  const done = orders.filter((o) => o.status === "تکمیل‌شده").length;

  return (
    <div>
      <div className="topbar">
        <div className="title"><h1>سفارشات من</h1><p>مدیریت و پیگیری سفارش‌های شما</p></div>
        <button className="primary" onClick={() => { setEditingOrder(null); setModalOpen(true); }}>+ ثبت سفارش جدید</button>
      </div>

      <div className="cards">
        <div className="card"><small>سفارش‌های فعال</small><div className="number">{active}</div></div>
        <div className="card"><small>در انتظار بررسی</small><div className="number">{pending}</div></div>
        <div className="card"><small>سفارش‌های تکمیل‌شده</small><div className="number">{done}</div></div>
      </div>

      <div className="orders-list">
        {loading && <div className="empty-state">در حال بارگذاری سفارش‌ها...</div>}
        {!loading && orders.length === 0 && <div className="empty-state">هیچ سفارشی وجود ندارد</div>}
        {orders.map((o) => (
          <OrderCard
            key={o.id}
            order={o}
            onView={() => setViewingOrder(o)}
            onEdit={() => { setEditingOrder(o); setModalOpen(true); }}
            onDeleted={loadOrders}
          />
        ))}
      </div>

      <OrderModal
        open={modalOpen}
        order={editingOrder}
        onClose={() => setModalOpen(false)}
        onSaved={loadOrders}
      />
      <OrderDetailsModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
    </div>
  );
}
