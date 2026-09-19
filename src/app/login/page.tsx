"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).trim().toLowerCase();
    const password = String(form.get("password"));

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("ایمیل یا رمز عبور اشتباه است.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
    router.push(profile?.role === "admin" ? "/admin" : profile?.role === "agent" ? "/agent" : "/dashboard");
    router.refresh();
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name")).trim();
    const email = String(form.get("email")).trim().toLowerCase();
    const password = String(form.get("password"));
    const password2 = String(form.get("password2"));

    if (password !== password2) {
      setError("رمز عبور و تکرار آن یکسان نیستند.");
      return;
    }
    if (password.length < 6) {
      setError("رمز عبور باید حداقل ۶ کاراکتر باشد.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (!data.session) {
      setInfo("ثبت‌نام انجام شد. لطفاً ایمیل خود را برای تأیید حساب بررسی کنید، سپس وارد شوید.");
      setTab("login");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user?.id).maybeSingle();
    router.push(profile?.role === "agent" ? "/agent" : "/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">SINO <span>PERSIA</span></div>
        <div className="auth-subtitle">ورود به داشبورد خریدار</div>

        <div className="auth-tabs">
          <button type="button" className={`auth-tab ${tab === "login" ? "active" : ""}`} onClick={() => { setTab("login"); setError(null); }}>ورود</button>
          <button type="button" className={`auth-tab ${tab === "register" ? "active" : ""}`} onClick={() => { setTab("register"); setError(null); }}>ثبت‌نام</button>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-info">{info}</div>}

        {tab === "login" ? (
          <form onSubmit={handleLogin}>
            <div className="form-row"><label>ایمیل</label><input type="email" name="email" placeholder="ایمیل خود را وارد کنید" required /></div>
            <div className="form-row"><label>رمز عبور</label><input type="password" name="password" placeholder="رمز عبور" required /></div>
            <button type="submit" className="primary auth-submit" disabled={loading}>{loading ? "در حال ورود..." : "ورود به داشبورد"}</button>
            <div className="auth-footer-link">حساب کاربری ندارید؟ <a href="#" onClick={(e) => { e.preventDefault(); setTab("register"); }}>ثبت‌نام کنید</a></div>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-row"><label>نام و نام خانوادگی</label><input type="text" name="name" placeholder="نام کامل" required /></div>
            <div className="form-row"><label>ایمیل</label><input type="email" name="email" placeholder="ایمیل خود را وارد کنید" required /></div>
            <div className="form-row"><label>رمز عبور</label><input type="password" name="password" placeholder="رمز عبور" required /></div>
            <div className="form-row"><label>تکرار رمز عبور</label><input type="password" name="password2" placeholder="تکرار رمز عبور" required /></div>
            <button type="submit" className="primary auth-submit" disabled={loading}>{loading ? "در حال ثبت‌نام..." : "ایجاد حساب کاربری"}</button>
            <div className="auth-footer-link">قبلاً ثبت‌نام کرده‌اید؟ <a href="#" onClick={(e) => { e.preventDefault(); setTab("login"); }}>وارد شوید</a></div>
          </form>
        )}
        <div className="auth-footer-link"><Link href="/">بازگشت به صفحه اصلی</Link></div>
      </div>
    </div>
  );
}
