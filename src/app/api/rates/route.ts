import { NextResponse } from "next/server";
import { loadRates } from "@/lib/rates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const board = await loadRates();
    return NextResponse.json(board, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "نرخ در دسترس نیست." }, { status: 503 });
  }
}
