"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { statusClass, type Order, type Profile } from "@/lib/types";

type AdminProfile = Profile & { email: string | null };
type AdminOrder = Order & { profiles: { full_name: string | null; email: string | null } | null };
type Tab = "overview" | "users" | "orders";

export default function AdminPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function loadData() {
    setLoading(true);
    const [{ data: profileData }, { data: orderData }] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
    ]);
    setProfiles((profileData as AdminProfile[]) || []);
    const profileMap = new Map(((profileData as AdminProfile[]) || []).map((profile) => [profile.id, profile]));
    setOrders(((orderData as Order[]) || []).map((order) => ({ ...order, profiles: profileMap.get(order.user_id) || null })));
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function changeRole(profile: AdminProfile, role: Profile["role"]) {
    if (profile.role === role) return;
    const { error } = await supabase.from("profiles").update({ role }).eq("id", profile.id);
    if (error) { alert("تغییر نقش انجام نشد: " + error.message); return; }
    setProfiles((current) => current.map((item) => item.id === profile.id ? { ...item, role } : item));
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
  const pendingCount = orders.filter((order) => order.status === "در انتظار بررسی").length;

  return (
    <div>
      <div className="topbar">
        <div className="title"><h1>مدیریت سایت</h1><p>مدیریت کاربران، ایجنت‌ها و سفارش‌های سیستم</p></div>
      </div>

      <div className="admin-tabs">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>نمای کلی</button>
        <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>کاربران و نقش‌ها</button>
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>همه سفارش‌ها</button>
      </div>

      {tab === "overview" && <>
        <div className="cards">
          <div className="card admin-stat"><small>کل کاربران</small><div className="number">{profiles.length}</div></div>
          <div className="card admin-stat"><small>ایجنت‌ها</small><div className="number">{agentCount}</div></div>
          <div className="card admin-stat"><small>مشتریان</small><div className="number">{customerCount}</div></div>
          <div className="card admin-stat"><small>سفارش‌های در انتظار</small><div className="number">{pendingCount}</div></div>
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
          <section className="admin-panel"><div className="admin-panel-head"><h2>آخرین سفارش‌ها</h2><button className="admin-link" onClick={() => setTab("orders")}>مشاهده همه</button></div>
            {orders.slice(0, 5).map((order) => <div className="admin-order-line" key={order.id}><span>#{order.order_number}</span><strong>{order.title}</strong><em className={`status ${statusClass(order.status)}`}>{order.status}</em></div>)}
            {!orders.length && <div className="empty-state">سفارشی وجود ندارد</div>}
          </section>
        </div>
      </>}

      {tab === "users" && <section className="admin-panel"><div className="admin-panel-head"><h2>کاربران و نقش‌ها</h2><span>{profiles.length} حساب</span></div>
        {loading ? <div className="empty-state">در حال بارگذاری...</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>نام</th><th>ایمیل</th><th>نقش</th><th>شناسه</th></tr></thead><tbody>{profiles.map((profile) => <tr key={profile.id}><td>{profile.full_name || "بدون نام"}</td><td>{profile.email || "—"}</td><td><select value={profile.role} onChange={(e) => changeRole(profile, e.target.value as Profile["role"])}><option value="customer">مشتری</option><option value="agent">ایجنت</option><option value="admin">ادمین</option></select></td><td className="admin-id">{profile.id.slice(0, 8)}...</td></tr>)}</tbody></table></div>}
      </section>}

      {tab === "orders" && <section className="admin-panel"><div className="admin-panel-head"><h2>همه سفارش‌ها</h2><span>{orders.length} سفارش</span></div>
        {loading ? <div className="empty-state">در حال بارگذاری...</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>شماره</th><th>محصول</th><th>مشتری</th><th>تاریخ</th><th>وضعیت</th><th>قیمت</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td>#{order.order_number}</td><td>{order.title}</td><td>{order.profiles?.full_name || order.profiles?.email || "—"}</td><td>{new Date(order.created_at).toLocaleDateString("fa-IR")}</td><td><span className={`status ${statusClass(order.status)}`}>{order.status}</span></td><td>{order.price || "—"}</td></tr>)}</tbody></table></div>}
      </section>}
    </div>
  );
}
