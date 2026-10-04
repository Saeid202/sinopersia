"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSellerLocale } from "@/components/SellerCentreShell";

type ShopSeller = { id: string; store_name: string; created_at: string };

export default function SellerProfilePage() {
  const [supabase] = useState(() => createClient());
  const { language, t } = useSellerLocale();
  const [seller, setSeller] = useState<ShopSeller | null>(null);
  const [storeNameDraft, setStoreNameDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data, error: fetchError } = await supabase
        .from("shop_sellers")
        .select("id,store_name,created_at")
        .eq("id", user.id)
        .maybeSingle();
      if (fetchError || !data) {
        setError(fetchError?.message || "");
        setLoading(false);
        return;
      }
      setSeller(data as ShopSeller);
      setStoreNameDraft(data.store_name);
      setLoading(false);
    })();
  }, [supabase]);

  async function saveStoreName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!seller || !storeNameDraft.trim()) return;
    setError("");
    setNotice("");
    const { error: updateError } = await supabase.from("shop_sellers").update({ store_name: storeNameDraft.trim() }).eq("id", seller.id);
    if (updateError) { setError(t("storeNameError")); return; }
    setSeller({ ...seller, store_name: storeNameDraft.trim() });
    setNotice(t("storeNameSaved"));
  }

  const memberSince = seller
    ? new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", { year: "numeric", month: "long", day: "numeric" }).format(new Date(seller.created_at))
    : "";

  return (
    <div className="seller-dashboard">
      <header className="seller-page-heading">
        <div>
          <p className="seller-eyebrow">SINO PERSIA / {t("profileNav").toUpperCase()}</p>
          <h1>{seller?.store_name || t("sellerCentre")}</h1>
          <p>{t("storeProfileSubtitle")}</p>
        </div>
      </header>

      {(error || notice) && <div className={error ? "seller-form-error" : "seller-form-info"} role={error ? "alert" : "status"}>{error || notice}</div>}

      {loading ? (
        <div className="seller-empty-state" role="status">{t("loadingProducts")}</div>
      ) : (
        <section className="seller-product-list-section">
          <div className="seller-section-heading">
            <div><p className="seller-eyebrow">{t("profileNav").toUpperCase()}</p><h2>{t("storeProfileTitle")}</h2></div>
          </div>
          <form className="seller-store-name-form" onSubmit={saveStoreName}>
            <label htmlFor="seller-store-name">{t("storeName")}</label>
            <input id="seller-store-name" value={storeNameDraft} onChange={(event) => setStoreNameDraft(event.target.value)} maxLength={100} required />
            <button className="seller-secondary-button" type="submit">{t("saveStoreName")}</button>
          </form>
          {seller && <p className="seller-member-since">{t("memberSince")}: <strong>{memberSince}</strong></p>}
        </section>
      )}
    </div>
  );
}
