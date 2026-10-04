"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BrandLogo from "@/components/BrandLogo";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    const passwordConfirmation = String(form.get("password-confirmation"));

    if (password.length < 6) {
      setError("رمز عبور باید حداقل ۶ کاراکتر باشد.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("رمز عبور و تکرار آن یکسان نیستند.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) await supabase.auth.signOut();
    setLoading(false);

    if (error) {
      setError("لینک بازیابی معتبر نیست یا منقضی شده است. لطفاً دوباره درخواست بازیابی بدهید.");
      return;
    }
    setInfo("رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد حساب خود شوید.");
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <BrandLogo className="auth-logo-image" priority />
        <div className="auth-subtitle">تنظیم رمز عبور جدید</div>

        {error && <div className="auth-error" role="alert">{error}</div>}
        {info && <div className="auth-info" role="status">{info}</div>}

        {!info && <form onSubmit={handleResetPassword}>
          <div className="form-row"><label htmlFor="password">رمز عبور جدید</label><input id="password" type="password" name="password" placeholder="حداقل ۶ کاراکتر" autoComplete="new-password" minLength={6} required /></div>
          <div className="form-row"><label htmlFor="password-confirmation">تکرار رمز عبور</label><input id="password-confirmation" type="password" name="password-confirmation" placeholder="رمز عبور جدید را تکرار کنید" autoComplete="new-password" minLength={6} required /></div>
          <button type="submit" className="primary auth-submit" disabled={loading}>{loading ? "در حال ذخیره..." : "ثبت رمز عبور جدید"}</button>
        </form>}

        <div className="auth-footer-link"><Link href="/login">بازگشت به ورود</Link></div>
      </div>
    </div>
  );
}
