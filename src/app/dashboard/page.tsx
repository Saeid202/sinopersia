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
  const [tab, setTab] = useState<"orders" | "shop">("orders");

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

  const sourcingOrders = orders.filter((order) => order.category !== "فروشگاه");
  const shopOrders = orders.filter((order) => order.category === "فروشگاه");
  const visible = tab === "shop" ? shopOrders : sourcingOrders;
  const active = visible.filter((order) => order.status !== "تکمیل‌شده").length;
  const pending = visible.filter((order) => order.status === "در انتظار بررسی").length;
  const done = visible.filter((order) => order.status === "تکمیل‌شده").length;

  return (
    <div>
      <div className="topbar">
        <div className="title">
          <h1>{tab === "shop" ? "خریدهای فروشگاه" : "سفارشات من"}</h1>
          <p>{tab === "shop" ? "خریدهایی که از فروشگاه پرداخت شده‌اند" : "درخواست‌های تأمین و پیگیری آن‌ها"}</p>
        </div>
        {tab === "orders" && <button className="primary" onClick={() => { setEditingOrder(null); setModalOpen(true); }}>+ ثبت سفارش جدید</button>}
      </div>

      <div className="admin-tabs">
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>ثبت سفارش ({sourcingOrders.length})</button>
        <button className={tab === "shop" ? "active" : ""} onClick={() => setTab("shop")}>خرید فروشگاه ({shopOrders.length})</button>
      </div>

      <div className="cards">
        <div className="card"><small>{tab === "shop" ? "خریدهای فعال" : "سفارش‌های فعال"}</small><div className="number">{active}</div></div>
        <div className="card"><small>در انتظار بررسی</small><div className="number">{pending}</div></div>
        <div className="card"><small>{tab === "shop" ? "خریدهای تکمیل‌شده" : "سفارش‌های تکمیل‌شده"}</small><div className="number">{done}</div></div>
      </div>

      <div className="orders-list">
        {loading && <div className="empty-state">در حال بارگذاری...</div>}
        {!loading && visible.length === 0 && <div className="empty-state">{tab === "shop" ? "خرید فروشگاهی وجود ندارد" : "هیچ سفارشی وجود ندارد"}</div>}
        {visible.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onView={() => setViewingOrder(order)}
            onEdit={tab === "orders" ? () => { setEditingOrder(order); setModalOpen(true); } : undefined}
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
