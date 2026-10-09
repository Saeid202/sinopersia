import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAdmin, setupMessage } from "@/lib/payments/admin";
import { getGateway, listGateways } from "@/lib/payments/registry";

export const dynamic = "force-dynamic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function mask(value: string) {
  if (!value) return "";
  return value.length <= 4 ? "••••" : `••••${value.slice(-4)}`;
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const supabase = serviceClient();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY در تنظیمات سرور ثبت نشده است." }, { status: 500 });

  const { data, error } = await supabase.from("payment_gateways").select("code, name, enabled, sandbox, credentials");
  if (error) return NextResponse.json({ error: setupMessage(error.message) }, { status: 500 });

  const rows = new Map((data || []).map((row) => [row.code as string, row]));
  const gateways = listGateways().map((gateway) => {
    const row = rows.get(gateway.code);
    const credentials = (row?.credentials || {}) as Record<string, string>;
    return {
      code: gateway.code,
      name: row?.name || gateway.name,
      enabled: Boolean(row?.enabled),
      sandbox: row?.sandbox !== false,
      fields: gateway.fields.map((field) => ({
        key: field.key,
        label: field.label,
        secret: field.secret,
        configured: Boolean(credentials[field.key]),
        value: field.secret ? "" : credentials[field.key] || "",
        masked: field.secret ? mask(credentials[field.key] || "") : "",
      })),
    };
  });
  return NextResponse.json({ gateways });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const supabase = serviceClient();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY در تنظیمات سرور ثبت نشده است." }, { status: 500 });

  const body = await request.json() as { code?: string; enabled?: boolean; sandbox?: boolean; credentials?: Record<string, string> };
  const gateway = body.code ? getGateway(body.code) : null;
  if (!gateway || typeof body.enabled !== "boolean" || typeof body.sandbox !== "boolean") {
    return NextResponse.json({ error: "اطلاعات درگاه کامل نیست." }, { status: 400 });
  }

  const { data: existing, error: readError } = await supabase.from("payment_gateways").select("credentials").eq("code", gateway.code).maybeSingle();
  if (readError) return NextResponse.json({ error: setupMessage(readError.message) }, { status: 500 });
  const credentials = { ...((existing?.credentials || {}) as Record<string, string>) };
  for (const field of gateway.fields) {
    const incoming = body.credentials?.[field.key];
    if (typeof incoming !== "string" || !incoming.trim()) continue;
    credentials[field.key] = incoming.trim();
  }

  const { error } = await supabase.from("payment_gateways").upsert({
    code: gateway.code,
    name: gateway.name,
    enabled: body.enabled,
    sandbox: body.sandbox,
    credentials,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: setupMessage(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true });
}
