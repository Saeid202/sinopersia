"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSellerLocale } from "@/components/SellerCentreShell";

export default function SellerLoginPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const { t } = useSellerLocale();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleForgotPassword() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) { setError(t("email")); return; }
    setError("");
    setInfo("");
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) { setError(resetError.message); return; }
    setInfo(t("resetSent"));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (loginError) {
      setError(t("invalidCredentials"));
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user
      ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
      : { data: null };
    if (profile?.role !== "seller") {
      setError(t("sellerOnly"));
      setLoading(false);
      return;
    }
    router.replace("/seller-centre");
    router.refresh();
  }

  return (
    <main className="seller-auth-page">
      <section className="seller-auth-panel">
        <p className="seller-eyebrow">SINO PERSIA / {t("sellerCentre").toUpperCase()}</p>
        <h1>{t("signIn")}</h1>
        <p className="seller-auth-copy">{t("sellerCentre")}</p>
        {error && <div className="seller-form-error" role="alert">{error}</div>}
        {info && <div className="seller-form-info" role="status">{info}</div>}
        <form className="seller-form" onSubmit={handleSubmit}>
          <label>{t("email")}<input type="email" name="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>{t("password")}<input type="password" name="password" autoComplete="current-password" required /></label>
          <button className="seller-primary-button" type="submit" disabled={loading}>{loading ? "..." : t("signIn")}</button>
          <button className="seller-text-button" type="button" onClick={handleForgotPassword} disabled={loading}>{t("forgotPassword")}</button>
        </form>
        <p className="seller-auth-switch">{t("noSellerStore")} <Link href="/seller-centre/register">{t("createSellerStore")}</Link></p>
        <Link className="seller-back-link" href="/">{t("backToSite")}</Link>
      </section>
    </main>
  );
}
