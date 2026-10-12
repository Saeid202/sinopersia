"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BrandLogo from "@/components/BrandLogo";

const NAV_ITEMS = [
  { href: "/admin", tab: "overview", label: "نمای کلی", icon: "▦" },
  { href: "/admin?tab=users", tab: "users", label: "کاربران و نقش‌ها", icon: "👤" },
  { href: "/admin?tab=orders", tab: "orders", label: "ثبت سفارش", icon: "📦" },
  { href: "/admin?tab=shop", tab: "shop", label: "خرید فروشگاه", icon: "🛒" },
  { href: "/admin?tab=messages", tab: "messages", label: "پیام‌های تماس", icon: "✉" },
  { href: "/admin?tab=payments", tab: "payments", label: "درگاه پرداخت", icon: "💳" },
  { href: "/admin/products", tab: "", label: "مدیریت محصولات", icon: "▣" },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [name, setName] = useState("مدیر سیستم");
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const currentTab = searchParams.get("tab") || "overview";
  const onProducts = pathname.startsWith("/admin/products");
  const routeKey = `${pathname}:${currentTab}`;
  const [seenRoute, setSeenRoute] = useState(routeKey);
  if (seenRoute !== routeKey) {
    setSeenRoute(routeKey);
    setOpen(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setName((user.user_metadata?.full_name as string) || "مدیر سیستم");
      setEmail(user.email || "");
    });
  }, [supabase]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 801px)");
    const close = () => { if (media.matches) setOpen(false); };
    media.addEventListener("change", close);
    return () => media.removeEventListener("change", close);
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className={`layout panel-layout${open ? " menu-open" : ""}`}>
      <header className="mobile-bar">
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="admin-menu"
          aria-label={open ? "بستن منو" : "باز کردن منو"}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="menu-toggle-icon" aria-hidden="true"><i /><i /><i /></span>
          {open ? "بستن" : "منو"}
        </button>
        <BrandLogo className="mobile-bar-logo" />
      </header>
      <button type="button" className="sidebar-backdrop" aria-label="بستن منو" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} />
      <aside className="sidebar" id="admin-menu">
        <button type="button" className="sidebar-close" onClick={() => setOpen(false)} aria-label="بستن منو">×</button>
        <BrandLogo className="sidebar-logo" priority />
        <nav className="nav" aria-label="منوی مدیریت">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/admin/products" ? onProducts : !onProducts && currentTab === item.tab;
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : ""} onClick={() => setOpen(false)}>
                <span className="nav-icon">{item.icon}</span> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{name.trim().charAt(0)}</div>
            <div><div className="user-name">{name}</div><div className="user-email">{email}</div></div>
          </div>
          <button className="logout-btn" onClick={logout}>خروج از حساب</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="layout panel-layout"><main className="main"><p className="empty-state">در حال بارگذاری...</p></main></div>}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
