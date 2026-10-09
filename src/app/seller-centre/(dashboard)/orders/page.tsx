"use client";

import Image from "next/image";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSellerLocale } from "@/components/SellerCentreShell";

type SellerOrderLine = {
  order_id: string;
  order_number: string;
  status: string;
  created_at: string;
  line_id: string;
  product_id: string;
  title_en: string;
  title_fa: string | null;
  sku: string | null;
  quantity: number | null;
  unit_price: number | null;
  currency: "CNY" | "USD" | null;
  image_url: string | null;
};

type SellerOrder = {
  order_id: string;
  order_number: string;
  status: string;
  created_at: string;
  lines: SellerOrderLine[];
};

export default function SellerOrdersPage() {
  const { language, t } = useSellerLocale();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);

  const loadOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/seller-centre/login");
      return;
    }
    const { data, error: queryError } = await supabase.rpc("seller_shop_order_lines");
    if (queryError) {
      const missing = /seller_shop_order_lines|schema cache|does not exist|Could not find the function/i.test(queryError.message);
      setOrders([]);
      setNeedsSetup(missing);
      setError(missing ? "" : queryError.message);
      setLoading(false);
      return;
    }
    const grouped = new Map<string, SellerOrder>();
    for (const line of (data as SellerOrderLine[]) || []) {
      const current = grouped.get(line.order_id) || {
        order_id: line.order_id,
        order_number: line.order_number,
        status: line.status,
        created_at: line.created_at,
        lines: [],
      };
      current.lines.push(line);
      grouped.set(line.order_id, current);
    }
    setOrders([...grouped.values()]);
    setNeedsSetup(false);
    setError("");
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => { startTransition(() => { void loadOrders(); }); }, [loadOrders]);

  const locale = language === "fa" ? "fa-IR" : "en-US";
  const lineCount = useMemo(() => orders.reduce((sum, order) => sum + order.lines.length, 0), [orders]);

  function money(amount: number | null, currency: SellerOrderLine["currency"]) {
    if (amount == null || (currency !== "CNY" && currency !== "USD")) return "—";
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  }

  return (
    <div className="seller-dashboard">
      <header className="seller-page-heading">
        <div>
          <p className="seller-eyebrow">SINO PERSIA / {t("ordersNav").toUpperCase()}</p>
          <h1>{t("ordersNav")}</h1>
          <p>{t("ordersIntro")}</p>
        </div>
      </header>

      <div className="seller-stat-row">
        <article className="seller-stat"><span>{t("ordersNav")}</span><strong>{orders.length}</strong></article>
        <article className="seller-stat"><span>{t("orderQuantity")}</span><strong>{lineCount}</strong></article>
      </div>

      {needsSetup && <div className="seller-form-error" role="alert">{t("ordersSetup")}</div>}
      {error && <div className="seller-form-error" role="alert">{t("ordersLoadError")}</div>}

      {loading ? <div className="seller-empty-state" role="status">{t("ordersLoading")}</div> : orders.length === 0 && !needsSetup && !error ? (
        <div className="seller-empty-state">
          <strong>{t("ordersEmptyTitle")}</strong>
          <p>{t("ordersEmptyBody")}</p>
        </div>
      ) : (
        <div className="seller-order-list">
          {orders.map((order) => (
            <section className="seller-order-card" key={order.order_id}>
              <div className="seller-section-heading">
                <div>
                  <p className="seller-eyebrow">{t("orderNumber")} #{order.order_number}</p>
                  <h2>{new Date(order.created_at).toLocaleDateString(locale)}</h2>
                </div>
                <span className="seller-product-status published">{order.status}</span>
              </div>
              <div className="seller-product-table-wrapper">
                <table className="seller-product-table">
                  <thead>
                    <tr>
                      <th>{t("product")}</th>
                      <th>{t("sku")}</th>
                      <th>{t("orderQuantity")}</th>
                      <th>{t("price")}</th>
                      <th>{t("lineTotal")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.lines.map((line) => (
                      <tr key={line.line_id}>
                        <td>
                          <div className="seller-product-table-name">
                            {line.image_url ? <Image className="seller-product-photo" src={line.image_url} alt={line.title_en} width={48} height={48} unoptimized /> : <div className="seller-product-photo seller-product-placeholder" aria-hidden="true">SP</div>}
                            <div>
                              <h3>{language === "fa" ? line.title_fa || line.title_en : line.title_en}</h3>
                              {line.title_fa && <p dir="rtl" className="seller-product-persian-name">{line.title_fa}</p>}
                            </div>
                          </div>
                        </td>
                        <td>{line.sku || "—"}</td>
                        <td>{line.quantity ?? "—"}</td>
                        <td>{money(line.unit_price, line.currency)}</td>
                        <td>{line.quantity != null && line.unit_price != null ? money(line.unit_price * line.quantity, line.currency) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
