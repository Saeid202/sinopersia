"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BrandLogo from "@/components/BrandLogo";
import { useSellerLocale, SellerLanguageSwitch } from "@/components/SellerCentreShell";

const NAV_ITEMS = [
  { href: "/seller-centre", key: "profileNav", icon: "👤" },
  { href: "/seller-centre/products", key: "productsNav", icon: "📦" },
  { href: "/seller-centre/orders", key: "ordersNav", icon: "🧾" },
  { href: "/seller-centre/settings", key: "settingsNav", icon: "⚙️" },
] as const;

export default function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useSellerLocale();
  const [supabase] = useState(() => createClient());
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [seenRoute, setSeenRoute] = useState(pathname);
  if (seenRoute !== pathname) {
    setSeenRoute(pathname);
    setOpen(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email || "");
      const { data } = await supabase.from("shop_sellers").select("store_name").eq("id", user.id).maybeSingle();
      if (data) setStoreName(data.store_name);
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
    router.replace("/seller-centre/login");
    router.refresh();
  }

  return (
    <div className={`layout panel-layout${open ? " menu-open" : ""}`}>
      <header className="mobile-bar">
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="seller-menu"
          aria-label={open ? t("closeMenu") : t("openMenu")}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="menu-toggle-icon" aria-hidden="true"><i /><i /><i /></span>
          {open ? t("close") : t("menu")}
        </button>
        <Link href="/seller-centre" aria-label="Sino Persia Seller Centre">
          <BrandLogo className="mobile-bar-logo" />
        </Link>
      </header>
      <button type="button" className="sidebar-backdrop" aria-label={t("closeMenu")} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} />
      <aside className="sidebar" id="seller-menu">
        <button type="button" className="sidebar-close" onClick={() => setOpen(false)} aria-label={t("closeMenu")}>×</button>
        <Link href="/seller-centre" aria-label="Sino Persia Seller Centre" onClick={() => setOpen(false)}>
          <BrandLogo className="sidebar-logo" priority />
        </Link>
        <nav className="nav" aria-label={t("menu")}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""} onClick={() => setOpen(false)}>
              <span className="nav-icon">{item.icon}</span> {t(item.key)}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <SellerLanguageSwitch />
          <div className="user-info">
            <div className="user-avatar">{(storeName || "S").trim().charAt(0).toUpperCase()}</div>
            <div>
              <div className="user-name">{storeName || t("sellerCentre")}</div>
              <div className="user-email">{email}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>{t("signOut")}</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
