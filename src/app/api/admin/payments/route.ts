import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAdmin, setupMessage } from "@/lib/payments/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY در تنظیمات سرور ثبت نشده است." }, { status: 500 });

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase
    .from("payment_transactions")
    .select("id, gateway_code, order_id, amount, currency, status, reference_id, sandbox, card_pan, message, created_at, verified_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) return NextResponse.json({ error: setupMessage(error.message) }, { status: 500 });
  return NextResponse.json({ transactions: data || [] });
}
