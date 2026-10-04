"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSellerLocale } from "@/components/SellerCentreShell";

export default function SellerRegisterPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const { t } = useSellerLocale();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      startTransition(() => setSessionEmail(user?.email || null));
    });
    return () => { mounted = false; };
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    const form = new FormData(event.currentTarget);
    const storeName = String(form.get("storeName")).trim();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      setLoading(true);
      const { error: sellerProfileError } = await supabase.rpc("create_shop_seller_profile", { store_name_input: storeName });
      setLoading(false);
      if (sellerProfileError) { setError(sellerProfileError.message); return; }
      router.replace("/seller-centre");
      router.refresh();
      return;
    }
    const email = String(form.get("email")).trim().toLowerCase();
    const password = String(form.get("password"));
    const confirmation = String(form.get("confirmation"));
    if (password !== confirmation) { setError(t("passwordMismatch")); return; }
    if (password.length < 8) { setError(t("passwordTooShort")); return; }

    setLoading(true);
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { account_type: "seller", store_name: storeName } },
    });
    setLoading(false);
    if (signupError) { setError(signupError.message); return; }
    if (data.session) {
      router.replace("/seller-centre");
      router.refresh();
      return;
    }
    setInfo(t("checkEmail"));
  }

  return (
    <main className="seller-auth-page">
      <section className="seller-auth-panel">
        <p className="seller-eyebrow">SINO PERSIA / {t("sellerCentre").toUpperCase()}</p>
        <h1>{t("register")}</h1>
        <p className="seller-auth-copy">{t("createStoreDescription")}</p>
        {error && <div className="seller-form-error" role="alert">{error}</div>}
        {info && <div className="seller-form-info" role="status">{info}</div>}
        <form className="seller-form" onSubmit={handleSubmit}>
          <label>{t("storeName")}<input type="text" name="storeName" autoComplete="organization" required maxLength={100} /></label>
          {sessionEmail ? <p className="seller-current-account">{t("currentAccount")} <strong dir="ltr">{sessionEmail}</strong></p> : <>
            <label>{t("email")}<input type="email" name="email" autoComplete="email" required /></label>
            <label>{t("password")}<input type="password" name="password" autoComplete="new-password" required minLength={8} /></label>
            <label>{t("confirmPassword")}<input type="password" name="confirmation" autoComplete="new-password" required minLength={8} /></label>
          </>}
          <button className="seller-primary-button" type="submit" disabled={loading}>{loading ? "..." : sessionEmail ? t("createSellerStore") : t("register")}</button>
        </form>
        <p className="seller-auth-switch">{t("haveAccount")} <Link href="/seller-centre/login">{t("signIn")}</Link></p>
        <Link className="seller-back-link" href="/">{t("backToSite")}</Link>
      </section>
    </main>
  );
}
