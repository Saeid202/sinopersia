"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ChatPanel from "@/components/ChatPanel";
import type { Order, Ticket } from "@/lib/types";

export default function MessagesPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<"tickets" | "chat">("tickets");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [ticketText, setTicketText] = useState("");
  const [loadingTickets, setLoadingTickets] = useState(true);

  async function loadTickets() {
    setLoadingTickets(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingTickets(false); return; }
    const { data } = await supabase
      .from("tickets")
      .select("*, ticket_replies(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoadingTickets(false);
  }

  async function loadOrders() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const customerOrders = (data as Order[]) || [];
    setOrders(customerOrders);
    setSelectedOrderId((current) => current || customerOrders[0]?.id || null);
  }

  useEffect(() => { loadTickets(); loadOrders(); }, []);

  async function sendTicket() {
    if (!ticketText.trim()) { alert("لطفاً متن تیکت را بنویسید."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("tickets").insert({ user_id: user.id, message: ticketText.trim() });
    if (error) { alert("خطا در ارسال تیکت: " + error.message); return; }
    setTicketText("");
    alert("تیکت شما با موفقیت ارسال شد.");
    loadTickets();
  }

  return (
    <div>
      <div className="topbar">
        <div className="title"><h1>پیام‌ها</h1><p>تیکت‌های پشتیبانی و پیام‌های ایجنت</p></div>
      </div>
      <div className="msg-tabs">
        <button className={`msg-tab ${tab === "tickets" ? "active" : ""}`} onClick={() => setTab("tickets")}>تیکت‌های پشتیبانی</button>
        <button className={`msg-tab ${tab === "chat" ? "active" : ""}`} onClick={() => setTab("chat")}>چت با ایجنت</button>
      </div>

      {tab === "tickets" && (
        <div>
          <div className="ticket-form">
            <h3>ارسال تیکت جدید به پشتیبانی</h3>
            <textarea value={ticketText} onChange={(e) => setTicketText(e.target.value)} placeholder="موضوع و متن تیکت خود را بنویسید..." />
            <button className="primary" onClick={sendTicket}>ارسال تیکت</button>
          </div>
          <div className="message-list">
            {loadingTickets && <div className="empty-state">در حال بارگذاری...</div>}
            {!loadingTickets && tickets.length === 0 && <div className="empty-state">هنوز تیکتی ثبت نکرده‌اید</div>}
            {tickets.map((t) => (
              <div key={t.id}>
                <div className="message-item">
                  <div className="message-header">
                    <div className="message-from">شما <span className="message-badge">تیکت</span></div>
                    <div className="message-date">{new Date(t.created_at).toLocaleString("fa-IR")}</div>
                  </div>
                  <div className="message-body">{t.message}</div>
                </div>
                {(t.ticket_replies || [])
                  .slice()
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .map((r) => (
                    <div className="message-item" style={{ borderRight: "3px solid var(--primary)" }} key={r.id}>
                      <div className="message-header">
                        <div className="message-from">پشتیبانی</div>
                        <div className="message-date">{new Date(r.created_at).toLocaleString("fa-IR")}</div>
                      </div>
                      <div className="message-body">{r.message}</div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "chat" && <div className="chat-layout">
        <div className="chat-orders-list">
          <h3>سفارش‌های من</h3>
          {!orders.length && <div className="empty-state">هنوز سفارشی ثبت نکرده‌اید.</div>}
          {orders.map((order) => <button className={selectedOrderId === order.id ? "selected" : ""} key={order.id} onClick={() => setSelectedOrderId(order.id)}><strong>#{order.order_number}</strong><span>{order.title}</span><small>{order.status}</small></button>)}
        </div>
        {selectedOrderId ? <ChatPanel orderId={selectedOrderId} mode="customer" /> : <div className="chat-placeholder">یک سفارش را برای شروع گفتگو انتخاب کنید.</div>}
      </div>}
    </div>
  );
}
