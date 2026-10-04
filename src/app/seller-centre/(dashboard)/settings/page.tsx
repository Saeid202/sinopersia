"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSellerLocale } from "@/components/SellerCentreShell";

export default function SellerSettingsPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const { t } = useSellerLocale();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/seller-centre/login");
    router.refresh();
  }

  return (
    <div className="seller-dashboard">
      <header className="seller-page-heading">
        <div>
          <p className="seller-eyebrow">SINO PERSIA / {t("settingsNav").toUpperCase()}</p>
          <h1>{t("accountSettings")}</h1>
          <p>{t("accountSettingsSubtitle")}</p>
        </div>
      </header>

      <section className="seller-product-list-section seller-settings-actions">
        <Link className="seller-secondary-button" href="/reset-password">{t("changePassword")}</Link>
        <button type="button" className="seller-danger-button" onClick={signOut}>{t("signOut")}</button>
      </section>
    </div>
  );
}
