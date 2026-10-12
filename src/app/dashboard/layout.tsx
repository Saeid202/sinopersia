"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BrandLogo from "@/components/BrandLogo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "سفارشات", icon: "📦" },
  { href: "/dashboard/messages", label: "پیام‌ها", icon: "💬" },
  { href: "/dashboard/profile", label: "پروفایل", icon: "👤" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState("کاربر");
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [seenRoute, setSeenRoute] = useState(pathname);
  if (seenRoute !== pathname) {
    setSeenRoute(pathname);
    setOpen(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setName((user.user_metadata?.full_name as string) || user.email || "کاربر");
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
    if (!confirm("آیا مطمئن هستید که می‌خواهید از حساب خارج شوید؟")) return;
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
          aria-controls="customer-menu"
          aria-label={open ? "بستن منو" : "باز کردن منو"}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="menu-toggle-icon" aria-hidden="true"><i /><i /><i /></span>
          {open ? "بستن" : "منو"}
        </button>
        <Link href="/dashboard" aria-label="پنل مشتری">
          <BrandLogo className="mobile-bar-logo" />
        </Link>
      </header>
      <button type="button" className="sidebar-backdrop" aria-label="بستن منو" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} />
      <aside className="sidebar" id="customer-menu">
        <button type="button" className="sidebar-close" onClick={() => setOpen(false)} aria-label="بستن منو">×</button>
        <Link href="/dashboard" aria-label="پنل مشتری" onClick={() => setOpen(false)}>
          <BrandLogo className="sidebar-logo" priority />
        </Link>
        <nav className="nav" aria-label="منوی مشتری">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""} onClick={() => setOpen(false)}>
              <span className="nav-icon">{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{(name || "؟").trim().charAt(0)}</div>
            <div>
              <div className="user-name">{name}</div>
              <div className="user-email">{email}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>خروج از حساب</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
