"use client";

import { useSellerLocale } from "@/components/SellerCentreShell";

export default function SellerOrdersPage() {
  const { t } = useSellerLocale();
  return (
    <div className="seller-dashboard">
      <header className="seller-page-heading">
        <div>
          <p className="seller-eyebrow">SINO PERSIA / {t("ordersNav").toUpperCase()}</p>
          <h1>{t("ordersNav")}</h1>
          <p>{t("ordersEmptyBody")}</p>
        </div>
      </header>
      <div className="seller-empty-state">
        <strong>{t("ordersEmptyTitle")}</strong>
        <p>{t("ordersEmptyBody")}</p>
      </div>
    </div>
  );
}
