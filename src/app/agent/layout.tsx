"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState("ایجنت");
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setName((user.user_metadata?.full_name as string) || user.email || "ایجنت");
      setEmail(user.email || "");
    });
  }, [supabase]);

  async function logout() {
    if (!confirm("آیا مطمئن هستید که می‌خواهید از حساب خارج شوید؟")) return;
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">SINO <span>PERSIA</span></div>
        <nav className="nav">
          <Link href="/agent" className={pathname === "/agent" ? "active" : ""}>
            <span className="nav-icon">📋</span> صف سفارشات
          </Link>
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
