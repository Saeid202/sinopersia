import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { listGateways } from "@/lib/payments/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ gateways: [] });
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.from("payment_gateways").select("code, name, enabled, sandbox").eq("enabled", true);
  if (error) return NextResponse.json({ gateways: [] });
  const known = new Set(listGateways().map((gateway) => gateway.code));
  return NextResponse.json({
    gateways: (data || [])
      .filter((row) => known.has(row.code))
      .map((row) => ({ code: row.code, name: row.name, sandbox: row.sandbox })),
  });
}
