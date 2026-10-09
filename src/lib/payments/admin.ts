import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "احراز هویت لازم است." }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return { error: NextResponse.json({ error: "دسترسی غیرمجاز است." }, { status: 403 }) };
  return { user };
}

export function setupMessage(message: string) {
  if (/payment_gateways|payment_transactions|next_payment_order_id|schema cache|does not exist/i.test(message)) {
    return "جدول درگاه‌ها هنوز ساخته نشده است. فایل supabase/payment-gateways.sql را یک بار در SQL Editor اجرا کنید.";
  }
  return message;
}
