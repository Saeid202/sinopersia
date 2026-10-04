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

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email || "");
      const { data } = await supabase.from("shop_sellers").select("store_name").eq("id", user.id).maybeSingle();
      if (data) setStoreName(data.store_name);
    });
  }, [supabase]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/seller-centre/login");
    router.refresh();
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <Link href="/seller-centre" aria-label="Sino Persia Seller Centre">
          <BrandLogo className="sidebar-logo" priority />
        </Link>
        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
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
