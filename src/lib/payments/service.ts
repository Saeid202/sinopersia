import { createClient } from "@supabase/supabase-js";
import { getGateway } from "@/lib/payments/registry";
import type { GatewayMode, PaymentRequestResult } from "@/lib/payments/types";

export type GatewayRecord = {
  code: string;
  name: string;
  enabled: boolean;
  sandbox: boolean;
  credentials: Record<string, string>;
};

export type TransactionRecord = {
  id: string;
  gateway_code: string;
  order_id: string | null;
  user_id: string | null;
  amount: number;
  currency: string;
  status: string;
  authority: string | null;
  reference_id: string | null;
  gateway_order_id: string | null;
  sandbox: boolean;
  card_pan: string | null;
  message: string | null;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("تنظیمات سرور کامل نیست.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function modeOf(record: GatewayRecord): GatewayMode {
  return record.sandbox ? "sandbox" : "live";
}

function asText(value: unknown) {
  return value == null ? "" : String(value);
}

export async function loadGateway(code: string) {
  const { data, error } = await adminClient()
    .from("payment_gateways")
    .select("code, name, enabled, sandbox, credentials")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...data, credentials: (data.credentials || {}) as Record<string, string> } as GatewayRecord;
}

export async function startPayment(input: {
  gatewayCode: string;
  amount: number;
  description: string;
  callbackUrl: string;
  orderId?: string | null;
  userId?: string | null;
  mobile?: string | null;
  email?: string | null;
}) {
  const gateway = getGateway(input.gatewayCode);
  const record = await loadGateway(input.gatewayCode);
  if (!gateway || !record) throw new Error("درگاه پرداخت پیدا نشد.");
  if (!record.enabled) throw new Error("این درگاه غیرفعال است.");

  const supabase = adminClient();
  const { data: sequence, error: sequenceError } = await supabase.rpc("next_payment_order_id");
  if (sequenceError || sequence == null) throw new Error("شمارهٔ سفارش درگاه ساخته نشد. فایل SQL درگاه‌ها را اجرا کنید.");

  const { data: created, error } = await supabase
    .from("payment_transactions")
    .insert({
      gateway_code: record.code,
      order_id: input.orderId || null,
      user_id: input.userId || null,
      amount: input.amount,
      currency: "IRR",
      status: "pending",
      gateway_order_id: String(sequence),
      sandbox: record.sandbox,
    })
    .select("id, gateway_order_id")
    .single();
  if (error || !created) throw new Error(error?.message || "تراکنش ثبت نشد.");

  let result: PaymentRequestResult;
  try {
    result = await gateway.requestPayment(record.credentials, modeOf(record), {
      amount: input.amount,
      description: input.description,
      callbackUrl: input.callbackUrl,
      orderId: input.orderId,
      gatewayOrderId: created.gateway_order_id,
      mobile: input.mobile,
      email: input.email,
    });
  } catch (requestError) {
    await supabase.from("payment_transactions").update({
      status: "failed",
      message: requestError instanceof Error ? requestError.message : "درخواست پرداخت ناموفق بود.",
    }).eq("id", created.id);
    throw requestError;
  }

  await supabase.from("payment_transactions").update({
    authority: result.authority,
    message: "در انتظار بازگشت از درگاه",
  }).eq("id", created.id);

  return { transactionId: created.id as string, ...result };
}

export async function completePayment(gatewayCode: string, callback: Record<string, string>) {
  const gateway = getGateway(gatewayCode);
  if (!gateway) throw new Error("درگاه پرداخت پیدا نشد.");
  const authority = callback.Authority || callback.authority || callback.RefId || callback.refId;
  if (!authority) throw new Error("شناسهٔ تراکنش در پاسخ درگاه نیست.");

  const supabase = adminClient();
  const { data, error } = await supabase
    .from("payment_transactions")
    .select("id, gateway_code, order_id, user_id, amount, currency, status, authority, reference_id, gateway_order_id, sandbox, card_pan, message")
    .eq("gateway_code", gatewayCode)
    .eq("authority", authority)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const transaction = data as TransactionRecord | null;
  if (!transaction) throw new Error("تراکنش پیدا نشد.");
  if (transaction.status === "paid" || transaction.status === "verified") return transaction;

  const record = await loadGateway(gatewayCode);
  if (!record) throw new Error("تنظیمات درگاه پیدا نشد.");
  const mode: GatewayMode = transaction.sandbox ? "sandbox" : "live";
  const result = await gateway.verifyPayment(record.credentials, mode, {
    amount: Number(transaction.amount),
    authority,
    gatewayOrderId: transaction.gateway_order_id || "",
    callback,
  });

  const status = result.ok ? (result.settled ? "paid" : "verified") : result.message.includes("لغو") ? "cancelled" : "failed";
  const { data: updated, error: updateError } = await supabase
    .from("payment_transactions")
    .update({
      status,
      reference_id: result.referenceId || null,
      card_pan: result.cardPan || null,
      message: result.message,
      verified_at: result.ok ? new Date().toISOString() : null,
    })
    .eq("id", transaction.id)
    .select("id, gateway_code, order_id, user_id, amount, currency, status, authority, reference_id, gateway_order_id, sandbox, card_pan, message")
    .single();
  if (updateError || !updated) throw new Error(updateError?.message || "نتیجهٔ تراکنش ذخیره نشد.");
  if ((status === "paid" || status === "verified") && transaction.order_id && result.referenceId) {
    try {
      const { data: order } = await supabase.from("orders").select("notes").eq("id", transaction.order_id).maybeSingle();
      const line = `پرداخت ثبت شد. شماره پیگیری: ${result.referenceId}.`;
      const notes = order?.notes?.includes(result.referenceId) ? order.notes : [order?.notes, line].filter(Boolean).join("\n");
      await supabase.from("orders").update({ notes }).eq("id", transaction.order_id);
    } catch {
      // The charge is already stored. A note failure must not look like a failed payment.
    }
  }
  return updated as TransactionRecord;
}

export function callbackValues(source: URLSearchParams | FormData) {
  const values: Record<string, string> = {};
  source.forEach((value, key) => {
    if (typeof value === "string") values[key] = asText(value);
  });
  return values;
}
