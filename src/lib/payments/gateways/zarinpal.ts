import { postJson } from "@/lib/payments/http";
import type { GatewayMode, PaymentGateway, PaymentRequestInput, PaymentVerifyInput } from "@/lib/payments/types";

const hosts: Record<GatewayMode, string> = {
  live: "https://payment.zarinpal.com",
  sandbox: "https://sandbox.zarinpal.com",
};

const messages: Record<number, string> = {
  [-9]: "خطای اعتبارسنجی زرین‌پال.",
  [-10]: "آی‌پی یا مرچنت کد معتبر نیست.",
  [-11]: "مرچنت کد فعال نیست.",
  [-12]: "تلاش بیش از حد.",
  [-14]: "دامنهٔ کال‌بک با دامنهٔ ثبت‌شده فرق دارد.",
  [-15]: "ترمینال تعلیق شده است.",
  [-50]: "مبلغ با مبلغ پرداخت‌شده یکی نیست.",
  [-51]: "پرداخت ناموفق بوده است.",
  [-54]: "این درخواست بایگانی شده است.",
  100: "تراکنش تأیید شد.",
  101: "تراکنش قبلاً تأیید شده است.",
};

type ZarinpalResponse = {
  data?: { code?: number; message?: string; authority?: string; ref_id?: number; card_pan?: string };
  errors?: { code?: number; message?: string; validations?: unknown };
};

export const zarinpalGateway: PaymentGateway = {
  code: "zarinpal",
  name: "زرین‌پال",
  fields: [{ key: "merchant_id", label: "مرچنت کد", secret: true }],

  async requestPayment(credentials, mode, input: PaymentRequestInput) {
    const merchantId = credentials.merchant_id?.trim();
    if (!merchantId) throw new Error("مرچنت کد زرین‌پال وارد نشده است.");
    if (input.amount < 10000) throw new Error("حداقل مبلغ زرین‌پال ۱۰٬۰۰۰ ریال است.");

    const payload = await postJson<ZarinpalResponse>(`${hosts[mode]}/pg/v4/payment/request.json`, {
      merchant_id: merchantId,
      amount: input.amount,
      currency: "IRR",
      callback_url: input.callbackUrl,
      description: input.description.slice(0, 500),
      metadata: {
        mobile: input.mobile || undefined,
        email: input.email || undefined,
        order_id: input.orderId || input.gatewayOrderId,
      },
    });
    if (payload.data?.code !== 100 || !payload.data.authority) {
      const code = payload.errors?.code ?? payload.data?.code;
      throw new Error(messages[code || 0] || payload.errors?.message || payload.data?.message || "درخواست زرین‌پال ناموفق بود.");
    }
    return {
      authority: payload.data.authority,
      redirectUrl: `${hosts[mode]}/pg/StartPay/${payload.data.authority}`,
      redirectMethod: "GET",
    };
  },

  async verifyPayment(credentials, mode, input: PaymentVerifyInput) {
    const status = input.callback.Status || input.callback.status;
    if (status === "NOK") return { ok: false, settled: false, message: "پرداخت توسط کاربر لغو شد." };
    if (status !== "OK") return { ok: false, settled: false, message: "وضعیت بازگشت از زرین‌پال نامعتبر است." };
    const merchantId = credentials.merchant_id?.trim();
    if (!merchantId) throw new Error("مرچنت کد زرین‌پال وارد نشده است.");

    const payload = await postJson<ZarinpalResponse>(`${hosts[mode]}/pg/v4/payment/verify.json`, {
      merchant_id: merchantId,
      amount: input.amount,
      authority: input.authority,
    });
    const code = payload.data?.code;
    if (code !== 100 && code !== 101) {
      return { ok: false, settled: false, message: messages[code || 0] || payload.errors?.message || "تأیید زرین‌پال ناموفق بود." };
    }
    return {
      ok: true,
      settled: true,
      referenceId: payload.data?.ref_id ? String(payload.data.ref_id) : undefined,
      cardPan: payload.data?.card_pan,
      message: messages[code],
    };
  },
};
