"use client";

import { Fragment, useEffect, useState } from "react";
import { getRateBoard } from "@/lib/rate-board";
import type { RateBoard, RateQuote } from "@/lib/rates";

const money = new Intl.NumberFormat("fa-IR");
const percent = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });

function clock(value: string) {
  const date = new Date(`${value.replace(" ", "T")}+03:30`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }).format(date);
}

function RateItem({ code, label, quote }: { code: string; label: string; quote: RateQuote }) {
  const moved = quote.direction !== "flat" && quote.change !== 0;
  return (
    <span className="rate-item">
      <span className="rate-code">{code}</span>
      <span className="rate-name">{label}</span>
      <strong>{money.format(quote.price)}</strong>
      <span className="rate-unit">ریال</span>
      {moved && (
        <span className={quote.direction === "high" ? "rate-change is-up" : "rate-change is-down"}>
          {quote.direction === "high" ? "▲" : "▼"} {percent.format(Math.abs(quote.change))}٪
        </span>
      )}
    </span>
  );
}

function Tape({ board, updated, hidden }: { board: RateBoard; updated: string; hidden?: boolean }) {
  return (
    <div className="rate-ticker-group" aria-hidden={hidden ? true : undefined}>
      {Array.from({ length: 4 }, (_, index) => (
        <Fragment key={index}>
          <RateItem code="USD" label="دلار آمریکا" quote={board.usd} />
          <RateItem code="CNY" label="یوان چین" quote={board.cny} />
          <span className="rate-note"><i />نرخ بازار{updated ? ` · ${updated}` : ""}</span>
        </Fragment>
      ))}
    </div>
  );
}

export default function ExchangeRates() {
  const [board, setBoard] = useState<RateBoard | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      const next = await getRateBoard();
      if (ignore) return;
      if (next) {
        setBoard(next);
        setFailed(false);
      } else {
        setFailed(true);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      ignore = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const updated = board ? clock(board.usd.updatedAt > board.cny.updatedAt ? board.usd.updatedAt : board.cny.updatedAt) : "";

  return (
    <section className="rate-ticker" aria-label="نرخ دلار و یوان به ریال">
      {board ? (
        <>
          <p className="rate-sr">
            دلار آمریکا {money.format(board.usd.price)} ریال، یوان چین {money.format(board.cny.price)} ریال. نرخ بازار{updated ? `، ${updated}` : ""}.
          </p>
          <div className="rate-ticker-track">
            <Tape board={board} updated={updated} />
            <Tape board={board} updated={updated} hidden />
          </div>
        </>
      ) : (
        <p className="rate-ticker-status">{failed ? "نرخ لحظه‌ای در دسترس نیست" : "در حال دریافت نرخ بازار…"}</p>
      )}
    </section>
  );
}
