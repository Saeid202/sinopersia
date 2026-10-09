import type { RateBoard } from "@/lib/rates";

const cacheMs = 60_000;
let cache: { at: number; board: RateBoard } | null = null;
let pending: Promise<RateBoard | null> | null = null;

export function cachedRateBoard() {
  return cache && Date.now() - cache.at < cacheMs ? cache.board : null;
}

export function getRateBoard() {
  const fresh = cachedRateBoard();
  if (fresh) return Promise.resolve(fresh);
  if (!pending) {
    pending = fetch("/api/rates", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return cachedRateBoard();
        const board = await response.json() as RateBoard;
        cache = { at: Date.now(), board };
        return board;
      })
      .catch(() => cachedRateBoard())
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}
