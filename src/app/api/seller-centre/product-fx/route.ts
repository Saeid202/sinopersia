import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setupMessage } from "@/lib/payments/admin";
import { loadRates } from "@/lib/rates";

export const dynamic = "force-dynamic";

function tehranTime(value: string) {
  const date = new Date(`${value.replace(" ", "T")}+03:30`);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "احراز هویت لازم است." }, { status: 401 });
  const { data: seller } = await supabase.from("shop_sellers").select("id").eq("id", user.id).maybeSingle();
  if (!seller) return NextResponse.json({ error: "این بخش فقط برای فروشنده است." }, { status: 403 });

  const body = await request.json().catch(() => ({})) as { productIds?: string[]; missingOnly?: boolean };
  const productIds = Array.isArray(body.productIds) ? body.productIds.filter((id) => typeof id === "string" && id) : null;
  if (!productIds?.length && !body.missingOnly) {
    return NextResponse.json({ error: "محصولی برای ثبت نرخ مشخص نشده است." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY در تنظیمات سرور ثبت نشده است." }, { status: 500 });

  try {
    const board = await loadRates();
    const admin = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.rpc("apply_shop_product_rial", {
      seller_id_input: user.id,
      product_ids: productIds,
      usd_rate: board.usd.price,
      cny_rate: board.cny.price,
      usd_quoted_at: tehranTime(board.usd.updatedAt),
      cny_quoted_at: tehranTime(board.cny.updatedAt),
      missing_only: Boolean(body.missingOnly),
    });
    if (error) return NextResponse.json({ error: fxSetupMessage(error.message) }, { status: 500 });
    return NextResponse.json({ updated: data ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ثبت نرخ ریالی انجام نشد.";
    return NextResponse.json({ error: fxSetupMessage(message) }, { status: 500 });
  }
}

function fxSetupMessage(message: string) {
  if (/apply_shop_product_rial|fx_rate_irr|price_irr|schema cache/i.test(message)) {
    return "ستون نرخ ریالی هنوز ساخته نشده است. فایل supabase/product-rial.sql را یک بار در SQL Editor اجرا کنید.";
  }
  return setupMessage(message);
}
