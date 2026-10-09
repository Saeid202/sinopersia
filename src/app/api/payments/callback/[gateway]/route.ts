import { NextResponse } from "next/server";
import { getGateway } from "@/lib/payments/registry";
import { callbackValues, completePayment } from "@/lib/payments/service";

function resultRedirect(request: Request, status: string, message: string, reference?: string | null) {
  const url = new URL("/payment/result", request.url);
  url.searchParams.set("status", status);
  if (reference) url.searchParams.set("ref", reference);
  if (message) url.searchParams.set("message", message.slice(0, 180));
  return NextResponse.redirect(url, 303);
}

async function finish(request: Request, gatewayCode: string, values: Record<string, string>) {
  if (!getGateway(gatewayCode)) return NextResponse.json({ error: "درگاه پیدا نشد." }, { status: 404 });
  try {
    const transaction = await completePayment(gatewayCode, values);
    return resultRedirect(request, transaction.status, transaction.message || "", transaction.reference_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "تأیید پرداخت انجام نشد.";
    return resultRedirect(request, "error", message);
  }
}

export async function GET(request: Request, context: { params: Promise<{ gateway: string }> }) {
  const { gateway } = await context.params;
  return finish(request, gateway, callbackValues(new URL(request.url).searchParams));
}

export async function POST(request: Request, context: { params: Promise<{ gateway: string }> }) {
  const { gateway } = await context.params;
  const form = await request.formData();
  return finish(request, gateway, callbackValues(form));
}
