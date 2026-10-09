export type GatewayMode = "live" | "sandbox";

export type CredentialField = {
  key: string;
  label: string;
  secret: boolean;
};

export type PaymentRequestInput = {
  amount: number;
  description: string;
  callbackUrl: string;
  orderId?: string | null;
  gatewayOrderId: string;
  mobile?: string | null;
  email?: string | null;
};

export type PaymentRequestResult = {
  authority: string;
  redirectUrl: string;
  redirectMethod: "GET" | "POST";
  redirectFields?: Record<string, string>;
};

export type PaymentVerifyInput = {
  amount: number;
  authority: string;
  gatewayOrderId: string;
  callback: Record<string, string>;
};

export type PaymentVerifyResult = {
  ok: boolean;
  settled: boolean;
  referenceId?: string;
  cardPan?: string;
  message: string;
};

export interface PaymentGateway {
  code: string;
  name: string;
  fields: CredentialField[];
  requestPayment(credentials: Record<string, string>, mode: GatewayMode, input: PaymentRequestInput): Promise<PaymentRequestResult>;
  verifyPayment(credentials: Record<string, string>, mode: GatewayMode, input: PaymentVerifyInput): Promise<PaymentVerifyResult>;
}
