"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import AdminPaymentPanel from "@/components/AdminPaymentPanel";
import { AdminPager, AdminTableToolbar, usePagedRows } from "@/components/AdminTableControls";
import { downloadExcel } from "@/lib/excel";
import { createClient } from "@/lib/supabase/client";
import { statusClass, type ContactMessage, type Order, type Profile } from "@/lib/types";

type AdminProfile = Profile & { email: string | null };
type AdminOrder = Order & { profiles: { full_name: string | null; email: string | null } | null };
type Tab = "overview" | "users" | "orders" | "shop" | "messages" | "payments";

const ROLE_OPTIONS = [
  { value: "customer", label: "مشتری" },
  { value: "agent", label: "ایجنت" },
  { value: "admin", label: "ادمین" },
  { value: "seller", label: "فروشنده" },
];
const ORDER_STATUSES = ["در انتظار بررسی", "در حال بررسی", "منتظر تأیید مشتری", "تکمیل‌شده"];

function isShopPurchase(order: { category: string | null }) {
  return order.category === "فروشگاه";
}

function roleLabel(role: string) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label || role;
}

function customerLabel(order: AdminOrder) {
  return order.profiles?.full_name || order.profiles?.email || "—";
}

function contains(query: string, values: (string | null | undefined)[]) {
  if (!query) return true;
  return values.some((value) => value?.toLocaleLowerCase().includes(query));
}

export default function AdminPage() {
  const [supabase] = useState(() => createClient());
  const [tab, setTab] = useState<Tab>("overview");
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [updatingMessageId, setUpdatingMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userRole, setUserRole] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [shopStatus, setShopStatus] = useState("");
  const [messageStatus, setMessageStatus] = useState("");

  const loadData = useCallback(async () => {
    const [{ data: profileData }, { data: orderData }, contactResult] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
    ]);
    if (contactResult.error) {
      const missingTable = /contact_messages|schema cache|does not exist|Could not find the table/i.test(contactResult.error.message);
      setMessages([]);
      setMessagesError(missingTable
        ? "جدول پیام‌ها هنوز ساخته نشده است. فایل supabase/contact-messages.sql را یک بار در Supabase SQL Editor اجرا کنید."
        : "خواندن پیام‌های تماس انجام نشد.");
    } else {
      setMessages((contactResult.data as ContactMessage[]) || []);
      setMessagesError(null);
    }
    setProfiles((profileData as AdminProfile[]) || []);
    const profileMap = new Map(((profileData as AdminProfile[]) || []).map((profile) => [profile.id, profile]));
    setOrders(((orderData as Order[]) || []).map((order) => ({ ...order, profiles: profileMap.get(order.user_id) || null })));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { startTransition(() => { void loadData(); }); }, [loadData]);

  async function changeRole(profile: AdminProfile, role: Profile["role"]) {
    if (profile.role === role) return;
    const { error } = await supabase.from("profiles").update({ role }).eq("id", profile.id);
    if (error) { alert("تغییر نقش انجام نشد: " + error.message); return; }
    setProfiles((current) => current.map((item) => item.id === profile.id ? { ...item, role } : item));
  }

  async function assignAgent(orderId: string, agentId: string) {
    setAssigningOrderId(orderId);
    const assignedAgentId = agentId || null;
    const { error } = await supabase.rpc("assign_order_agent", {
      order_id_input: orderId,
      agent_id_input: assignedAgentId,
    });
    setAssigningOrderId(null);
    if (error) { alert("تخصیص ایجنت انجام نشد: " + error.message); return; }
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, assigned_agent_id: assignedAgentId } : order));
  }

  async function markMessageRead(messageId: string) {
    setUpdatingMessageId(messageId);
    const { error } = await supabase.from("contact_messages").update({ status: "خوانده‌شده" }).eq("id", messageId);
    setUpdatingMessageId(null);
    if (error) { alert("تغییر وضعیت پیام انجام نشد: " + error.message); return; }
    setMessages((current) => current.map((message) => message.id === messageId ? { ...message, status: "خوانده‌شده" } : message));
  }

  async function createAgent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    const response = await fetch("/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const result = await response.json() as { error?: string };
    setCreating(false);
    if (!response.ok) { alert(result.error || "ایجاد ایجنت انجام نشد."); return; }
    setName(""); setEmail(""); setPassword("");
    await loadData();
    alert("حساب ایجنت با موفقیت ساخته شد.");
  }

  const agentCount = profiles.filter((profile) => profile.role === "agent").length;
  const customerCount = profiles.filter((profile) => profile.role === "customer").length;
  const sourcingOrders = orders.filter((order) => !isShopPurchase(order));
  const shopOrders = orders.filter((order) => isShopPurchase(order));
  const pendingCount = sourcingOrders.filter((order) => order.status === "در انتظار بررسی").length;
  const newMessageCount = messages.filter((message) => message.status === "جدید").length;
  const orderStatusOptions = [...new Set([...ORDER_STATUSES, ...orders.map((order) => order.status)])].map((status) => ({ value: status, label: status }));
  const agentName = (order: AdminOrder) => {
    const agent = profiles.find((profile) => profile.id === order.assigned_agent_id);
    return agent ? (agent.full_name || agent.email || "ایجنت") : "تعیین نشده";
  };
  const usersTable = usePagedRows(profiles, (profile, query) => {
    if (userRole && profile.role !== userRole) return false;
    return contains(query, [profile.full_name, profile.email, profile.id, roleLabel(profile.role)]);
  }, userRole);
  const ordersTable = usePagedRows(sourcingOrders, (order, query) => {
    if (orderStatus && order.status !== orderStatus) return false;
    return contains(query, [order.order_number, order.title, customerLabel(order), agentName(order), order.price, order.status]);
  }, orderStatus);
  const shopTable = usePagedRows(shopOrders, (order, query) => {
    if (shopStatus && order.status !== shopStatus) return false;
    return contains(query, [order.order_number, order.title, customerLabel(order), order.price, order.status]);
  }, shopStatus);
  const messagesTable = usePagedRows(messages, (message, query) => {
    if (messageStatus && message.status !== messageStatus) return false;
    return contains(query, [message.name, message.email, message.phone, message.message, message.status]);
  }, messageStatus);

  return (
    <div>
      <div className="topbar">
        <div className="title"><h1>مدیریت سایت</h1><p>مدیریت کاربران، سفارش‌ها و درگاه‌های پرداخت</p></div>
      </div>

      <div className="admin-tabs">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>نمای کلی</button>
        <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>کاربران و نقش‌ها</button>
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>ثبت سفارش</button>
        <button className={tab === "shop" ? "active" : ""} onClick={() => setTab("shop")}>خرید فروشگاه</button>
        <button className={tab === "messages" ? "active" : ""} onClick={() => setTab("messages")}>پیام‌های تماس</button>
        <button className={tab === "payments" ? "active" : ""} onClick={() => setTab("payments")}>درگاه پرداخت</button>
      </div>

      {tab === "overview" && <>
        <div className="cards">
          <div className="card admin-stat"><small>کل کاربران</small><div className="number">{profiles.length}</div></div>
          <div className="card admin-stat"><small>ایجنت‌ها</small><div className="number">{agentCount}</div></div>
          <div className="card admin-stat"><small>مشتریان</small><div className="number">{customerCount}</div></div>
          <div className="card admin-stat"><small>ثبت سفارش در انتظار</small><div className="number">{pendingCount}</div></div>
          <div className="card admin-stat"><small>خرید فروشگاه</small><div className="number">{shopOrders.length}</div></div>
          <div className="card admin-stat"><small>پیام‌های جدید</small><div className="number">{newMessageCount}</div></div>
        </div>
        <div className="admin-grid">
          <section className="admin-panel"><div className="admin-panel-head"><h2>ایجاد حساب ایجنت</h2><span>حساب با ایمیل تأییدشده ساخته می‌شود</span></div>
            <form className="admin-form" onSubmit={createAgent}>
              <div className="field"><label>نام ایجنت</label><input value={name} onChange={(e) => setName(e.target.value)} required placeholder="مثلاً علی رضایی" /></div>
              <div className="field"><label>ایمیل ورود</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="agent@example.com" /></div>
              <div className="field"><label>رمز عبور موقت</label><input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="حداقل ۶ کاراکتر" /></div>
              <button className="primary" disabled={creating}>{creating ? "در حال ساخت..." : "ساخت حساب ایجنت"}</button>
            </form>
          </section>
          <section className="admin-panel"><div className="admin-panel-head"><h2>آخرین ثبت سفارش‌ها</h2><button className="admin-link" onClick={() => setTab("orders")}>مشاهده همه</button></div>
            {sourcingOrders.slice(0, 5).map((order) => <div className="admin-order-line" key={order.id}><span>#{order.order_number}</span><strong>{order.title}</strong><em className={`status ${statusClass(order.status)}`}>{order.status}</em></div>)}
            {!sourcingOrders.length && <div className="empty-state">ثبت سفارشی وجود ندارد</div>}
          </section>
        </div>
      </>}

      {tab === "users" && <section className="admin-panel">
        <div className="admin-panel-head"><h2>کاربران و نقش‌ها</h2><span>{profiles.length} حساب</span></div>
        {loading ? <div className="empty-state">در حال بارگذاری...</div> : <>
          <AdminTableToolbar
            query={usersTable.query}
            onQuery={usersTable.setQuery}
            filters={[{ label: "نقش", value: userRole, onChange: setUserRole, options: ROLE_OPTIONS }]}
            onExport={() => downloadExcel("کاربران", ["نام", "ایمیل", "نقش", "شناسه"], usersTable.filtered.map((profile) => [profile.full_name || "بدون نام", profile.email || "", roleLabel(profile.role), profile.id]))}
            shown={usersTable.filtered.length}
            total={profiles.length}
          />
          {usersTable.pageRows.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>نام</th><th>ایمیل</th><th>نقش</th><th>شناسه</th></tr></thead><tbody>{usersTable.pageRows.map((profile) => <tr key={profile.id}><td>{profile.full_name || "بدون نام"}</td><td>{profile.email || "—"}</td><td><select value={profile.role} onChange={(event) => changeRole(profile, event.target.value as Profile["role"])}>{ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></td><td className="admin-id">{profile.id.slice(0, 8)}...</td></tr>)}</tbody></table></div> : <div className="empty-state">موردی با این جستجو پیدا نشد</div>}
          <AdminPager page={usersTable.page} pageCount={usersTable.pageCount} onPage={usersTable.setPage} />
        </>}
      </section>}

      {tab === "messages" && <section className="admin-panel">
        <div className="admin-panel-head"><h2>پیام‌های تماس</h2><span>{messagesError ? "جدول آماده نیست" : `${messages.length} پیام`}</span></div>
        {loading ? <div className="empty-state">در حال بارگذاری...</div> : messagesError ? <p className="admin-note">{messagesError}</p> : <>
          <AdminTableToolbar
            query={messagesTable.query}
            onQuery={messagesTable.setQuery}
            filters={[{ label: "وضعیت", value: messageStatus, onChange: setMessageStatus, options: [{ value: "جدید", label: "جدید" }, { value: "خوانده‌شده", label: "خوانده‌شده" }] }]}
            onExport={() => downloadExcel("پیام-های-تماس", ["نام", "ایمیل", "تماس", "پیام", "تاریخ", "وضعیت"], messagesTable.filtered.map((message) => [message.name, message.email, message.phone || "", message.message, new Date(message.created_at).toLocaleDateString("fa-IR"), message.status]))}
            shown={messagesTable.filtered.length}
            total={messages.length}
          />
          {messagesTable.pageRows.length ? <div className="admin-table-wrap"><table className="admin-table admin-contact-table"><thead><tr><th>نام</th><th>ایمیل</th><th>تماس</th><th>پیام</th><th>تاریخ</th><th>وضعیت</th></tr></thead><tbody>{messagesTable.pageRows.map((message) => <tr key={message.id}><td>{message.name}</td><td className="admin-id">{message.email}</td><td className="admin-id">{message.phone || "—"}</td><td className="contact-message">{message.message}</td><td>{new Date(message.created_at).toLocaleDateString("fa-IR")}</td><td>{message.status === "جدید" ? <button type="button" className="admin-link" disabled={updatingMessageId === message.id} onClick={() => markMessageRead(message.id)}>{updatingMessageId === message.id ? "در حال ثبت..." : "علامت به‌عنوان خوانده‌شده"}</button> : <span className="status done">خوانده‌شده</span>}</td></tr>)}</tbody></table></div> : <div className="empty-state">{messages.length ? "موردی با این جستجو پیدا نشد" : "پیامی ثبت نشده است"}</div>}
          <AdminPager page={messagesTable.page} pageCount={messagesTable.pageCount} onPage={messagesTable.setPage} />
        </>}
      </section>}

      {tab === "orders" && <section className="admin-panel">
        <div className="admin-panel-head"><h2>ثبت سفارش</h2><span>{sourcingOrders.length} سفارش</span></div>
        {loading ? <div className="empty-state">در حال بارگذاری...</div> : <>
          <AdminTableToolbar
            query={ordersTable.query}
            onQuery={ordersTable.setQuery}
            filters={[{ label: "وضعیت", value: orderStatus, onChange: setOrderStatus, options: orderStatusOptions }]}
            onExport={() => downloadExcel("ثبت-سفارش", ["شماره", "محصول", "مشتری", "ایجنت مسئول", "تاریخ", "وضعیت", "قیمت"], ordersTable.filtered.map((order) => [order.order_number, order.title, customerLabel(order), agentName(order), new Date(order.created_at).toLocaleDateString("fa-IR"), order.status, order.price || ""]))}
            shown={ordersTable.filtered.length}
            total={sourcingOrders.length}
          />
          {ordersTable.pageRows.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>شماره</th><th>محصول</th><th>مشتری</th><th>ایجنت مسئول</th><th>تاریخ</th><th>وضعیت</th><th>قیمت</th></tr></thead><tbody>{ordersTable.pageRows.map((order) => <tr key={order.id}><td>#{order.order_number}</td><td>{order.title}</td><td>{customerLabel(order)}</td><td><select aria-label={`ایجنت مسئول سفارش ${order.order_number}`} value={order.assigned_agent_id || ""} disabled={assigningOrderId === order.id} onChange={(event) => assignAgent(order.id, event.target.value)}><option value="">تعیین نشده</option>{profiles.filter((profile) => profile.role === "agent").map((agent) => <option key={agent.id} value={agent.id}>{agent.full_name || agent.email || "ایجنت"}</option>)}</select></td><td>{new Date(order.created_at).toLocaleDateString("fa-IR")}</td><td><span className={`status ${statusClass(order.status)}`}>{order.status}</span></td><td>{order.price || "—"}</td></tr>)}</tbody></table></div> : <div className="empty-state">{sourcingOrders.length ? "موردی با این جستجو پیدا نشد" : "ثبت سفارشی وجود ندارد"}</div>}
          <AdminPager page={ordersTable.page} pageCount={ordersTable.pageCount} onPage={ordersTable.setPage} />
        </>}
      </section>}

      {tab === "payments" && <AdminPaymentPanel />}

      {tab === "shop" && <section className="admin-panel">
        <div className="admin-panel-head"><h2>خرید فروشگاه</h2><span>{shopOrders.length} خرید</span></div>
        {loading ? <div className="empty-state">در حال بارگذاری...</div> : <>
          <AdminTableToolbar
            query={shopTable.query}
            onQuery={shopTable.setQuery}
            filters={[{ label: "وضعیت", value: shopStatus, onChange: setShopStatus, options: orderStatusOptions }]}
            onExport={() => downloadExcel("خرید-فروشگاه", ["شماره", "محصول", "مشتری", "تاریخ", "وضعیت", "قیمت"], shopTable.filtered.map((order) => [order.order_number, order.title, customerLabel(order), new Date(order.created_at).toLocaleDateString("fa-IR"), order.status, order.price || ""]))}
            shown={shopTable.filtered.length}
            total={shopOrders.length}
          />
          {shopTable.pageRows.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>شماره</th><th>محصول</th><th>مشتری</th><th>تاریخ</th><th>وضعیت</th><th>قیمت</th></tr></thead><tbody>{shopTable.pageRows.map((order) => <tr key={order.id}><td>#{order.order_number}</td><td>{order.title}</td><td>{customerLabel(order)}</td><td>{new Date(order.created_at).toLocaleDateString("fa-IR")}</td><td><span className={`status ${statusClass(order.status)}`}>{order.status}</span></td><td>{order.price || "—"}</td></tr>)}</tbody></table></div> : <div className="empty-state">{shopOrders.length ? "موردی با این جستجو پیدا نشد" : "خرید فروشگاهی وجود ندارد"}</div>}
          <AdminPager page={shopTable.page} pageCount={shopTable.pageCount} onPage={shopTable.setPage} />
        </>}
      </section>}
    </div>
  );
}
