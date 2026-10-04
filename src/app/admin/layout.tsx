"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BrandLogo from "@/components/BrandLogo";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState("مدیر سیستم");
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setName((user.user_metadata?.full_name as string) || "مدیر سیستم");
      setEmail(user.email || "");
    });
  }, [supabase]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <BrandLogo className="sidebar-logo" priority />
        <nav className="nav">
          <a className="active" href="/admin"><span className="nav-icon">⚙</span> مدیریت سایت</a>
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
