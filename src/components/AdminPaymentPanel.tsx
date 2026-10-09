"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPager, AdminTableToolbar, usePagedRows } from "@/components/AdminTableControls";
import { downloadExcel } from "@/lib/excel";

type GatewayField = {
  key: string;
  label: string;
  secret: boolean;
  configured: boolean;
  value: string;
  masked: string;
};

type GatewayView = {
  code: string;
  name: string;
  enabled: boolean;
  sandbox: boolean;
  fields: GatewayField[];
};

type TransactionView = {
  id: string;
  gateway_code: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  reference_id: string | null;
  sandbox: boolean;
  card_pan: string | null;
  message: string | null;
  created_at: string;
};

const statusLabel: Record<string, string> = {
  pending: "در انتظار",
  failed: "ناموفق",
  cancelled: "لغو شده",
  verified: "تأیید شده",
  paid: "پرداخت شده",
  error: "خطا",
};

function statusClassName(status: string) {
  if (status === "paid") return "done";
  if (status === "verified") return "review";
  if (status === "failed" || status === "cancelled" || status === "error") return "failed";
  return "";
}

export default function AdminPaymentPanel() {
  const [gateways, setGateways] = useState<GatewayView[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [transactions, setTransactions] = useState<TransactionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [gatewayFilter, setGatewayFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [gatewayResponse, paymentResponse] = await Promise.all([
      fetch("/api/admin/payment-gateways"),
      fetch("/api/admin/payments"),
    ]);
    const gatewayPayload = await gatewayResponse.json() as { gateways?: GatewayView[]; error?: string };
    const paymentPayload = await paymentResponse.json() as { transactions?: TransactionView[]; error?: string };
    if (!gatewayResponse.ok) {
      setError(gatewayPayload.error || "خواندن درگاه‌ها انجام نشد.");
      setGateways([]);
    } else {
      setGateways(gatewayPayload.gateways || []);
      setDrafts({});
    }
    if (!paymentResponse.ok) setError(paymentPayload.error || "خواندن گزارش پرداخت انجام نشد.");
    else setTransactions(paymentPayload.transactions || []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function updateGateway(code: string, patch: Partial<GatewayView>) {
    setGateways((current) => current.map((gateway) => gateway.code === code ? { ...gateway, ...patch } : gateway));
  }

  function updateDraft(code: string, key: string, value: string) {
    setDrafts((current) => ({ ...current, [code]: { ...current[code], [key]: value } }));
  }

  async function save(gateway: GatewayView) {
    setSaving(gateway.code);
    setError(null);
    setNotice(null);
    const response = await fetch("/api/admin/payment-gateways", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: gateway.code,
        enabled: gateway.enabled,
        sandbox: gateway.sandbox,
        credentials: drafts[gateway.code] || {},
      }),
    });
    const payload = await response.json() as { error?: string };
    setSaving(null);
    if (!response.ok) {
      setError(payload.error || "ذخیره درگاه انجام نشد.");
      return;
    }
    setNotice(`تنظیمات ${gateway.name} ذخیره شد.`);
    await load();
  }

  function gatewayName(code: string) {
    if (code === "mellat") return "بانک ملت";
    if (code === "zarinpal") return "زرین‌پال";
    return code;
  }

  const report = usePagedRows(transactions, (transaction, query) => {
    if (statusFilter && transaction.status !== statusFilter) return false;
    if (gatewayFilter && transaction.gateway_code !== gatewayFilter) return false;
    if (modeFilter === "sandbox" && !transaction.sandbox) return false;
    if (modeFilter === "live" && transaction.sandbox) return false;
    const haystack = [gatewayName(transaction.gateway_code), statusLabel[transaction.status], transaction.reference_id, transaction.card_pan, transaction.message, String(transaction.amount)].join(" ").toLocaleLowerCase();
    return !query || haystack.includes(query);
  }, `${statusFilter}|${gatewayFilter}|${modeFilter}`);

  return (
    <>
      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2>درگاه‌های پرداخت</h2>
          <span>{gateways.filter((gateway) => gateway.enabled).length} درگاه فعال</span>
        </div>
        <p className="admin-note">کلیدها فقط روی سرور می‌مانند. فیلد خالیِ رمز، مقدار قبلی را نگه می‌دارد. حالت سندباکس برای زرین‌پال به sandbox.zarinpal.com و برای بانک ملت به سرور آزمایشی به‌پرداخت وصل می‌شود.</p>
        {error && <p className="contact-feedback is-error gateway-feedback">{error}</p>}
        {notice && <p className="contact-feedback is-success gateway-feedback">{notice}</p>}
        {loading ? <div className="empty-state">در حال بارگذاری...</div> : (
          <div className="gateway-list">
            {gateways.map((gateway) => (
              <article className="gateway-card" key={gateway.code}>
                <div className="gateway-card-head">
                  <h3>{gateway.name}</h3>
                  <div className="gateway-switches">
                    <label className="checkbox-field"><input type="checkbox" checked={gateway.enabled} onChange={(event) => updateGateway(gateway.code, { enabled: event.target.checked })} /> فعال</label>
                    <label className="checkbox-field"><input type="checkbox" checked={gateway.sandbox} onChange={(event) => updateGateway(gateway.code, { sandbox: event.target.checked })} /> سندباکس</label>
                  </div>
                </div>
                <div className="gateway-fields">
                  {gateway.fields.map((field) => (
                    <div className="field" key={field.key}>
                      <label htmlFor={`${gateway.code}-${field.key}`}>{field.label}</label>
                      <input
                        id={`${gateway.code}-${field.key}`}
                        type={field.secret ? "password" : "text"}
                        autoComplete="off"
                        value={drafts[gateway.code]?.[field.key] ?? (field.secret ? "" : field.value)}
                        placeholder={field.secret ? (field.masked || "وارد نشده") : ""}
                        onChange={(event) => updateDraft(gateway.code, field.key, event.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div className="gateway-actions">
                  <span>{gateway.fields.some((field) => field.configured) ? "کلید ذخیره شده است" : "کلید ذخیره نشده است"}</span>
                  <button className="primary" type="button" disabled={saving === gateway.code} onClick={() => save(gateway)}>{saving === gateway.code ? "در حال ذخیره..." : "ذخیره"}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="admin-panel payment-report">
        <div className="admin-panel-head">
          <h2>گزارش پرداخت‌ها</h2>
          <button className="admin-link" type="button" onClick={() => void load()}>به‌روزرسانی</button>
        </div>
        {loading ? <div className="empty-state">در حال بارگذاری...</div> : <>
          <AdminTableToolbar
            query={report.query}
            onQuery={report.setQuery}
            filters={[
              { label: "وضعیت", value: statusFilter, onChange: setStatusFilter, options: Object.entries(statusLabel).map(([value, label]) => ({ value, label })) },
              { label: "درگاه", value: gatewayFilter, onChange: setGatewayFilter, options: [{ value: "zarinpal", label: "زرین‌پال" }, { value: "mellat", label: "بانک ملت" }] },
              { label: "حالت", value: modeFilter, onChange: setModeFilter, options: [{ value: "sandbox", label: "سندباکس" }, { value: "live", label: "واقعی" }] },
            ]}
            onExport={() => downloadExcel("گزارش-پرداخت", ["تاریخ", "درگاه", "مبلغ", "وضعیت", "پیگیری", "کارت", "حالت", "توضیح"], report.filtered.map((transaction) => [
              new Date(transaction.created_at).toLocaleString("fa-IR"),
              gatewayName(transaction.gateway_code),
              `${Number(transaction.amount).toLocaleString("fa-IR")} ریال`,
              statusLabel[transaction.status] || transaction.status,
              transaction.reference_id || "",
              transaction.card_pan || "",
              transaction.sandbox ? "سندباکس" : "واقعی",
              transaction.message || "",
            ]))}
            shown={report.filtered.length}
            total={transactions.length}
          />
          {report.pageRows.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>تاریخ</th><th>درگاه</th><th>مبلغ</th><th>وضعیت</th><th>پیگیری</th><th>کارت</th><th>حالت</th><th>توضیح</th></tr></thead>
                <tbody>
                  {report.pageRows.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{new Date(transaction.created_at).toLocaleString("fa-IR")}</td>
                      <td>{gatewayName(transaction.gateway_code)}</td>
                      <td>{Number(transaction.amount).toLocaleString("fa-IR")} ریال</td>
                      <td><span className={`status ${statusClassName(transaction.status)}`}>{statusLabel[transaction.status] || transaction.status}</span></td>
                      <td className="admin-id">{transaction.reference_id || "—"}</td>
                      <td className="admin-id">{transaction.card_pan || "—"}</td>
                      <td>{transaction.sandbox ? "سندباکس" : "واقعی"}</td>
                      <td>{transaction.message || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-state">{transactions.length ? "موردی با این جستجو پیدا نشد" : "پرداختی ثبت نشده است"}</div>}
          <AdminPager page={report.page} pageCount={report.pageCount} onPage={report.setPage} />
        </>}
      </section>
    </>
  );
}
