const sources = ["https://call5.tgju.org/ajax.json", "https://call1.tgju.org/ajax.json"];
const cacheMs = 60_000;

export type RateDirection = "high" | "low" | "flat";

export type RateQuote = {
  price: number;
  change: number;
  direction: RateDirection;
  updatedAt: string;
};

export type RateBoard = {
  usd: RateQuote;
  cny: RateQuote;
  fetchedAt: string;
};

type TgjuQuote = { p?: string; dp?: string | number; dt?: string; ts?: string };

let cache: { at: number; board: RateBoard } | null = null;

function readQuote(raw: TgjuQuote | undefined): RateQuote | null {
  const price = Number(String(raw?.p || "").replaceAll(",", ""));
  if (!Number.isFinite(price) || price <= 0) return null;
  const change = Number(raw?.dp);
  const direction: RateDirection = raw?.dt === "high" || raw?.dt === "low" ? raw.dt : "flat";
  return {
    price,
    change: Number.isFinite(change) ? change : 0,
    direction,
    updatedAt: raw?.ts || "",
  };
}

async function fetchBoard(): Promise<RateBoard> {
  let lastError: Error | null = null;
  for (const source of sources) {
    try {
      const response = await fetch(`${source}?t=${Date.now()}`, {
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`rate source ${response.status}`);
      const body = await response.json() as { current?: { price_dollar_rl?: TgjuQuote; price_cny?: TgjuQuote } };
      const usd = readQuote(body.current?.price_dollar_rl);
      const cny = readQuote(body.current?.price_cny);
      if (!usd || !cny) throw new Error("rate fields missing");
      return { usd, cny, fetchedAt: new Date().toISOString() };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("rate source failed");
    }
  }
  throw lastError || new Error("rate source failed");
}

export async function loadRates() {
  if (cache && Date.now() - cache.at < cacheMs) return cache.board;
  try {
    const board = await fetchBoard();
    cache = { at: Date.now(), board };
    return board;
  } catch (error) {
    if (cache) return cache.board;
    throw error;
  }
}
