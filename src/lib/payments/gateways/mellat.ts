import { postSoap, tehranStamp } from "@/lib/payments/http";
import type { GatewayMode, PaymentGateway } from "@/lib/payments/types";

const endpoints: Record<GatewayMode, { soap: string; startPay: string }> = {
  live: {
    soap: "https://bpm.shaparak.ir/pgwchannel/services/pgw",
    startPay: "https://bpm.shaparak.ir/pgwchannel/startpay.mellat",
  },
  sandbox: {
    soap: "https://pgw.dev.bpmellat.ir/pgwchannel/services/pgw",
    startPay: "https://pgw.dev.bpmellat.ir/pgwchannel/startpay.mellat",
  },
};

const messages: Record<string, string> = {
  "0": "تراکنش موفق است.",
  "11": "شماره کارت نامعتبر است.",
  "12": "موجودی کافی نیست.",
  "17": "پرداخت توسط کاربر لغو شد.",
  "21": "پذیرنده نامعتبر است.",
  "24": "نام کاربری یا رمز بانک ملت نادرست است.",
  "25": "مبلغ نامعتبر است.",
  "41": "شماره سفارش تکراری است.",
  "43": "تراکنش قبلاً تأیید شده است.",
  "45": "تراکنش قبلاً تسویه شده است.",
  "48": "تراکنش برگشت خورده است.",
  "62": "دامنهٔ کال‌بک در بانک ملت ثبت نشده است.",
  "421": "آی‌پی سرور در بانک ملت ثبت نشده است.",
};

function required(credentials: Record<string, string>) {
  const terminalId = credentials.terminal_id?.trim();
  const userName = credentials.username?.trim();
  const userPassword = credentials.password?.trim();
  if (!terminalId || !userName || !userPassword) throw new Error("ترمینال، نام کاربری یا رمز بانک ملت کامل نیست.");
  return { terminalId, userName, userPassword };
}

function codeOf(result: string) {
  return result.split(",")[0]?.trim() || "";
}

export const mellatGateway: PaymentGateway = {
  code: "mellat",
  name: "بانک ملت",
  fields: [
    { key: "terminal_id", label: "شماره ترمینال", secret: false },
    { key: "username", label: "نام کاربری", secret: false },
    { key: "password", label: "رمز عبور", secret: true },
  ],

  async requestPayment(credentials, mode, input) {
    const account = required(credentials);
    if (input.amount < 1000) throw new Error("حداقل مبلغ بانک ملت ۱٬۰۰۰ ریال است.");
    const stamp = tehranStamp();
    const result = await postSoap(endpoints[mode].soap, "bpPayRequest", {
      terminalId: account.terminalId,
      userName: account.userName,
      userPassword: account.userPassword,
      orderId: input.gatewayOrderId,
      amount: input.amount,
      localDate: stamp.localDate,
      localTime: stamp.localTime,
      additionalData: (input.orderId || "").slice(0, 1000),
      callBackUrl: input.callbackUrl,
      payerId: 0,
    });
    const [code, refId] = result.split(",").map((part) => part.trim());
    if (code !== "0" || !refId) throw new Error(messages[code] || `درخواست بانک ملت ناموفق بود (${code}).`);
    return {
      authority: refId,
      redirectUrl: endpoints[mode].startPay,
      redirectMethod: "POST",
      redirectFields: { RefId: refId },
    };
  },

  async verifyPayment(credentials, mode, input) {
    const resCode = input.callback.ResCode || input.callback.resCode || "";
    if (resCode === "17") return { ok: false, settled: false, message: messages["17"] };
    if (resCode !== "0") return { ok: false, settled: false, message: messages[resCode] || `پرداخت بانک ملت ناموفق بود (${resCode}).` };

    const saleOrderId = input.callback.SaleOrderId || input.callback.saleOrderId || "";
    const saleReferenceId = input.callback.SaleReferenceId || input.callback.saleReferenceId || "";
    const returnedRef = input.callback.RefId || input.callback.refId || "";
    if (returnedRef !== input.authority || saleOrderId !== input.gatewayOrderId || !saleReferenceId) {
      return { ok: false, settled: false, message: "مشخصات برگشتی با تراکنش ثبت‌شده یکی نیست." };
    }

    const account = required(credentials);
    const shared = {
      terminalId: account.terminalId,
      userName: account.userName,
      userPassword: account.userPassword,
      orderId: input.gatewayOrderId,
      saleOrderId,
      saleReferenceId,
    };
    const verifyCode = codeOf(await postSoap(endpoints[mode].soap, "bpVerifyRequest", shared));
    if (verifyCode !== "0" && verifyCode !== "43") {
      let reversalNote = "";
      try {
        const reversalCode = codeOf(await postSoap(endpoints[mode].soap, "bpReversalRequest", shared));
        reversalNote = reversalCode === "0" || reversalCode === "48" ? " مبلغ برگشت داده شد." : ` برگشت وجه ناموفق بود (${reversalCode}).`;
      } catch {
        reversalNote = " برگشت وجه انجام نشد.";
      }
      return { ok: false, settled: false, message: (messages[verifyCode] || `تأیید بانک ملت ناموفق بود (${verifyCode}).`) + reversalNote };
    }
    const settleCode = codeOf(await postSoap(endpoints[mode].soap, "bpSettleRequest", shared));
    const settled = settleCode === "0" || settleCode === "45";
    return {
      ok: true,
      settled,
      referenceId: saleReferenceId,
      cardPan: input.callback.CardHolderPan || input.callback.cardHolderPan,
      message: settled ? messages[settleCode] : messages[settleCode] || `تراکنش تأیید شد ولی تسویه ناموفق بود (${settleCode}).`,
    };
  },
};
