import { mellatGateway } from "@/lib/payments/gateways/mellat";
import { zarinpalGateway } from "@/lib/payments/gateways/zarinpal";
import type { PaymentGateway } from "@/lib/payments/types";

// Add a gateway by implementing PaymentGateway and appending it here.
const gateways: PaymentGateway[] = [zarinpalGateway, mellatGateway];

export function listGateways() {
  return gateways;
}

export function getGateway(code: string) {
  return gateways.find((gateway) => gateway.code === code) || null;
}
