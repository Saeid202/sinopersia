"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { statusClass, type Order } from "@/lib/types";
import AgentQuoteModal from "@/components/AgentQuoteModal";
import OrderDetailsModal from "@/components/OrderDetailsModal";
import ChatPanel from "@/components/ChatPanel";

type OrderWithCustomer = Order & { profiles: { full_name: string | null; email: string | null } | null };

export default function AgentQueuePage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteOrder, setQuoteOrder] = useState<OrderWithCustomer | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [chatOrder, setChatOrder] = useState<OrderWithCustomer | null>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  async function loadOrders() {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setLoadError(error.message);
      setOrders([]);
      setLoading(false);
      return;
    }
    const orderRows = (data as Order[]) || [];
    const userIds = [...new Set(orderRows.map((order) => order.user_id))];
    const { data: profileData } = userIds.length ? await supabase.from("profiles").select("id,full_name,email").in("id", userIds) : { data: [] };
    const profileMap = new Map((profileData || []).map((profile) => [profile.id, profile]));
    setOrders(orderRows.map((order) => ({ ...order, profiles: profileMap.get(order.user_id) || null })));
    setLoading(false);
  }

  useEffect(() => { loadOrders(); }, []);

  const filteredOrders = orders.filter((order) => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return true;
    return [order.order_number, order.title, order.profiles?.full_name, order.profiles?.email]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
  });

  function toggleOrder(orderId: string) {
    setExpandedId((current) => current === orderId ? null : orderId);
  }

  useEffect(() => {
    if (chatOrder) chatPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [chatOrder]);

  return (
    <div>
      <div className="topbar">
        <div className="title"><h1>داشبورد ایجنت</h1><p>مدیریت سفارش‌های مشتریان، قیمت‌گذاری و اطلاع‌رسانی</p></div>
      </div>

      <div className="cards">
        <div className="card agent-stat"><small>کل سفارشات</small><div className="number">{orders.length}</div><span>تمام سفارش‌های دریافتی</span></div>
        <div className="card agent-stat"><small>سفارش‌های جدید</small><div className="number">{orders.filter((o) => o.status === "در انتظار بررسی").length}</div><span>نیازمند بررسی</span></div>
        <div className="card agent-stat"><small>در حال بررسی</small><div className="number">{orders.filter((o) => o.status === "در حال بررسی").length}</div><span>در حال پیگیری</span></div>
        <div className="card agent-stat"><small>تکمیل‌شده</small><div className="number">{orders.filter((o) => o.status === "تکمیل‌شده").length}</div><span>سفارش‌های پایان‌یافته</span></div>
      </div>

      <div className="agent-section-head">
        <div><h2>سفارشات ورودی</h2><p>برای دیدن جزئیات، ردیف سفارش را باز کنید.</p></div>
        <input className="agent-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی سفارش یا نام مشتری..." />
      </div>

      <div className="agent-orders-panel">
        {loading && <div className="empty-state">در حال بارگذاری سفارش‌ها...</div>}
        {!loading && loadError && <div className="empty-state agent-load-error">بارگذاری سفارش‌ها انجام نشد: {loadError}<br /><small>لطفاً policyهای فایل supabase/agent-role.sql را در Supabase اجرا کنید.</small></div>}
        {!loading && !loadError && filteredOrders.length === 0 && <div className="empty-state">هیچ سفارشی پیدا نشد</div>}
        {!loading && filteredOrders.length > 0 && <div className="agent-table-wrap"><table className="agent-table"><thead><tr><th>شماره سفارش</th><th>مشتری</th><th>تاریخ</th><th>وضعیت</th><th>قیمت</th><th>عملیات</th></tr></thead><tbody>
          {filteredOrders.map((o) => (
            <tr key={o.id} className={expandedId === o.id ? "is-expanded" : ""}>
              <td><button className="order-row-toggle" onClick={() => toggleOrder(o.id)}>⌄ <strong>#{o.order_number}</strong></button></td>
              <td>{o.profiles?.full_name || o.profiles?.email || "مشتری"}</td>
              <td>{new Date(o.created_at).toLocaleDateString("fa-IR")}</td>
              <td><span className={`status ${statusClass(o.status)}`}>{o.status}</span></td>
              <td className="order-price">{o.price || "—"}</td>
              <td><div className="order-actions">
                <button className="btn-view" onClick={() => setViewingOrder(o)}>مشاهده</button>
                <button type="button" className="btn-chat" onClick={() => setChatOrder(o)}>چت با مشتری</button>
                <button className="btn-quote" onClick={() => setQuoteOrder(o)}>قیمت‌گذاری</button>
              </div></td>
            </tr>
          ))}
        </tbody></table></div>}
        {expandedId && filteredOrders.find((order) => order.id === expandedId) && (() => {
          const expandedOrder = filteredOrders.find((order) => order.id === expandedId)!;
          return <div className="agent-expanded-detail">
            <div><span>مشتری</span><strong>{expandedOrder.profiles?.full_name || "بدون نام"}</strong><small>{expandedOrder.profiles?.email || ""}</small></div>
            <div><span>دسته‌بندی</span><strong>{expandedOrder.category || "—"}</strong><small>{expandedOrder.quantity || "—"} {expandedOrder.unit || ""}</small></div>
            <div><span>مهلت و حمل</span><strong>{expandedOrder.deadline || "—"}</strong><small>{expandedOrder.shipping_type || "نوع حمل مشخص نشده"}</small></div>
            <div><span>توضیحات</span><strong>{expandedOrder.notes || "توضیحی ثبت نشده"}</strong><small>برای دیدن عکس و مشخصات محصول، گزینه مشاهده را بزنید.</small></div>
          </div>;
        })()}
      </div>

      {chatOrder && <div className="agent-chat-panel" ref={chatPanelRef}><div className="agent-chat-head"><h2>گفت‌وگو درباره سفارش #{chatOrder.order_number}</h2><button type="button" onClick={() => setChatOrder(null)}>بستن</button></div><ChatPanel orderId={chatOrder.id} mode="agent" customerName={chatOrder.profiles?.full_name || chatOrder.profiles?.email || "مشتری"} /></div>}

      <AgentQuoteModal order={quoteOrder} onClose={() => setQuoteOrder(null)} onSaved={loadOrders} />
      <OrderDetailsModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
    </div>
  );
}
