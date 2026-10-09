import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setupMessage } from "@/lib/payments/admin";
import { getGateway } from "@/lib/payments/registry";
import { startPayment } from "@/lib/payments/service";
import { loadRates } from "@/lib/rates";
import { formatRial, rialAmount } from "@/lib/rial";

export const dynamic = "force-dynamic";

type CheckoutLine = { productId?: string; quantity?: number };

type ShopRow = {
  id: string;
  title_fa: string | null;
  title_en: string;
  price: number | string;
  currency: "CNY" | "USD";
  stock: number;
  sku: string | null;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function titleOf(product: ShopRow) {
  return product.title_fa?.trim() || product.title_en;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "برای پرداخت ابتدا وارد شوید." }, { status: 401 });

  const body = await request.json().catch(() => null) as { gatewayCode?: string; lines?: CheckoutLine[] } | null;
  const gateway = body?.gatewayCode ? getGateway(body.gatewayCode) : null;
  const requested = Array.isArray(body?.lines) ? body.lines : [];
  if (!gateway || requested.length === 0 || requested.length > 30) {
    return NextResponse.json({ error: "درگاه یا سبد خرید معتبر نیست." }, { status: 400 });
  }

  const quantities = new Map<string, number>();
  for (const line of requested) {
    if (!line.productId || !Number.isInteger(line.quantity) || !line.quantity || line.quantity < 1 || line.quantity > 999) {
      return NextResponse.json({ error: "تعداد یکی از کالاها معتبر نیست." }, { status: 400 });
    }
    quantities.set(line.productId, (quantities.get(line.productId) || 0) + line.quantity);
  }

  const { data: products, error: productError } = await supabase
    .from("shop_products")
    .select("id, title_fa, title_en, price, currency, stock, sku")
    .in("id", [...quantities.keys()])
    .eq("is_active", true);
  if (productError) return NextResponse.json({ error: productError.message }, { status: 500 });

  const byId = new Map(((products || []) as ShopRow[]).map((product) => [product.id, product]));
  for (const [productId, quantity] of quantities) {
    const product = byId.get(productId);
    if (!product) return NextResponse.json({ error: "یک کالا دیگر در فروشگاه نیست. سبد را تازه کنید." }, { status: 400 });
    if (quantity > product.stock) return NextResponse.json({ error: `تعداد ${titleOf(product)} بیش از موجودی است.` }, { status: 400 });
    if (product.currency !== "CNY" && product.currency !== "USD") {
      return NextResponse.json({ error: "ارز یکی از کالاها قابل تبدیل نیست." }, { status: 400 });
    }
  }

  let board;
  try {
    board = await loadRates();
  } catch (error) {
    const message = error instanceof Error ? error.message : "نرخ بازار در دسترس نیست.";
    return NextResponse.json({ error: setupMessage(message) }, { status: 503 });
  }

  const priced = [...quantities.entries()].map(([productId, quantity]) => {
    const product = byId.get(productId)!;
    const unit = Number(product.price);
    const rial = rialAmount(unit * quantity, product.currency, board);
    return { product, quantity, unit, rial };
  });
  const amount = priced.reduce((sum, line) => sum + line.rial, 0);
  if (!Number.isInteger(amount) || amount < 1000) {
    return NextResponse.json({ error: "مبلغ ریالی سبد برای پرداخت کافی نیست." }, { status: 400 });
  }

  const itemCount = priced.reduce((sum, line) => sum + line.quantity, 0);
  const notes = [
    "پرداخت مبلغ کالا از فروشگاه، با نرخ بازار همان لحظه.",
    `مبلغ کالا: ${formatRial(amount)}. هزینهٔ ارسال در این پرداخت نیست.`,
    ...priced.map((line) => `${titleOf(line.product)} × ${line.quantity} — ${formatRial(line.rial)}`),
  ].join("\n");

  const { data: order, error: orderError } = await supabase.from("orders").insert({
    user_id: user.id,
    title: `خرید فروشگاه · ${priced.length} قلم`,
    title_en: `Shop purchase · ${priced.length} items`,
    category: "فروشگاه",
    quantity: itemCount,
    price: formatRial(amount),
    notes,
    sample_request: false,
  }).select("id").single();
  if (orderError || !order) return NextResponse.json({ error: orderError?.message || "سفارش ثبت نشد." }, { status: 400 });

  const { error: itemsError } = await supabase.from("order_products").insert(priced.map((line) => ({
    order_id: order.id,
    link: null,
    description: `${titleOf(line.product)} | شناسه: ${line.product.id} | تعداد: ${line.quantity} | مبلغ ریال: ${formatRial(line.rial)}`,
    part_number: line.product.sku,
    shop_product_id: line.product.id,
    quantity: line.quantity,
    unit_price: line.unit,
    currency: line.product.currency,
  })));
  if (itemsError) {
    await adminClient()?.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: `ردیف‌های سفارش ذخیره نشد: ${itemsError.message}` }, { status: 400 });
  }

  try {
    const origin = new URL(request.url).origin;
    const payment = await startPayment({
      gatewayCode: gateway.code,
      amount,
      description: `خرید فروشگاه ساینو پرشیا · ${priced.length} قلم`,
      callbackUrl: `${origin}/api/payments/callback/${gateway.code}`,
      orderId: order.id,
      userId: user.id,
      email: user.email,
    });
    return NextResponse.json({ amount, orderId: order.id, ...payment });
  } catch (error) {
    const admin = adminClient();
    if (admin) {
      await admin.from("order_products").delete().eq("order_id", order.id);
      await admin.from("orders").delete().eq("id", order.id);
    }
    const message = error instanceof Error ? error.message : "شروع پرداخت انجام نشد.";
    return NextResponse.json({ error: setupMessage(message) }, { status: 400 });
  }
}
