import type { RateBoard } from "@/lib/rates";

const rialFormat = new Intl.NumberFormat("fa-IR");

export function rialAmount(price: number, currency: "CNY" | "USD", board: RateBoard) {
  const rate = currency === "USD" ? board.usd.price : board.cny.price;
  return Math.round(price * rate);
}

export function formatRial(amount: number) {
  return `${rialFormat.format(amount)} ریال`;
}
