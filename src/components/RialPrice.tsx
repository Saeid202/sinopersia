"use client";

import { formatRial, rialAmount } from "@/lib/rial";
import { useRateBoard } from "@/lib/use-rate-board";

export default function RialPrice({ price, currency, quantity = 1 }: { price: number; currency: "CNY" | "USD"; quantity?: number }) {
  const board = useRateBoard();
  const amount = board ? rialAmount(price * quantity, currency, board) : null;
  return <span className="shop-rial-price">{amount == null ? "\u00a0" : formatRial(amount)}</span>;
}
