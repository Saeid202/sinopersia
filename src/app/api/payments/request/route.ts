import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setupMessage } from "@/lib/payments/admin";
import { getGateway } from "@/lib/payments/registry";
import { startPayment } from "@/lib/payments/service";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "احراز هویت لازم است." }, { status: 401 });

  const body = await request.json() as { gatewayCode?: string; amount?: number; description?: string; orderId?: string };
  const gateway = body.gatewayCode ? getGateway(body.gatewayCode) : null;
  const amount = body.amount;
  const description = body.description?.trim() || "";
  if (!gateway || typeof amount !== "number" || !Number.isInteger(amount) || amount < 1000 || amount > 500_000_000_000 || description.length < 3 || description.length > 500) {
    return NextResponse.json({ error: "درگاه، مبلغ ریالی یا شرح پرداخت معتبر نیست." }, { status: 400 });
  }

  if (body.orderId) {
    const { data: order } = await supabase.from("orders").select("id, user_id").eq("id", body.orderId).maybeSingle();
    if (!order || order.user_id !== user.id) return NextResponse.json({ error: "این سفارش برای حساب شما نیست." }, { status: 403 });
  }

  try {
    const origin = new URL(request.url).origin;
    const result = await startPayment({
      gatewayCode: gateway.code,
      amount,
      description,
      callbackUrl: `${origin}/api/payments/callback/${gateway.code}`,
      orderId: body.orderId || null,
      userId: user.id,
      email: user.email,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "شروع پرداخت انجام نشد.";
    return NextResponse.json({ error: setupMessage(message) }, { status: 400 });
  }
}
