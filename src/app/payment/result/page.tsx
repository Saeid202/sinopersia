import Link from "next/link";

const labels: Record<string, string> = {
  paid: "پرداخت انجام شد",
  verified: "پرداخت تأیید شد و تسویه در حال پیگیری است",
  failed: "پرداخت ناموفق بود",
  cancelled: "پرداخت لغو شد",
  pending: "پرداخت هنوز نهایی نشده است",
  error: "نتیجهٔ پرداخت مشخص نشد",
};

export default async function PaymentResultPage({ searchParams }: { searchParams: Promise<{ status?: string; ref?: string; message?: string }> }) {
  const params = await searchParams;
  const status = params.status || "error";
  return (
    <main className="payment-result">
      <section className="payment-result-card">
        <h1>{labels[status] || labels.error}</h1>
        {params.ref && <p>شماره پیگیری: <strong className="admin-id">{params.ref}</strong></p>}
        {params.message && <p>{params.message}</p>}
        <div className="payment-result-links">
          <Link href="/dashboard">پیگیری سفارش</Link>
          <Link href="/shop">بازگشت به فروشگاه</Link>
          <Link href="/">صفحه اصلی</Link>
        </div>
      </section>
    </main>
  );
}
