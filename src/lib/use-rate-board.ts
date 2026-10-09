"use client";

import { useEffect, useState } from "react";
import { cachedRateBoard, getRateBoard } from "@/lib/rate-board";
import type { RateBoard } from "@/lib/rates";

export function useRateBoard() {
  const [board, setBoard] = useState<RateBoard | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = () => {
      const cached = cachedRateBoard();
      if (cached && !ignore) setBoard(cached);
      void getRateBoard().then((next) => {
        if (!ignore && next) setBoard(next);
      });
    };
    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, []);

  return board;
}
