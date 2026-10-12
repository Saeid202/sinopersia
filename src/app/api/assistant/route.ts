import { NextResponse } from "next/server";
import { assistantInstructions, buildOrderContext, parseAssistantHistory, ASSISTANT_ORDER_LIMIT } from "@/lib/assistant";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REPLIES = 20;
const hits = new Map<string, number[]>();

function allowReply(userId: string) {
  const now = Date.now();
  const recent = (hits.get(userId) || []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REPLIES) {
    hits.set(userId, recent);
    return false;
  }
  recent.push(now);
  hits.set(userId, recent);
  return true;
}

function providerBaseUrl() {
  const raw = (process.env.AI_BASE_URL || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  return raw;
}

function replyText(payload: unknown) {
  const content = (payload as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (typeof part === "string" ? part : typeof part === "object" && part && "text" in part ? String((part as { text?: unknown }).text || "") : ""))
    .join("")
    .trim();
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "برای گفتگو با دستیار وارد حساب شوید." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "customer") return NextResponse.json({ error: "دستیار سفارش فقط برای مشتری است." }, { status: 403 });

  const apiKey = process.env.AI_API_KEY?.trim();
  const baseUrl = providerBaseUrl();
  const model = (process.env.AI_MODEL || "gpt-4o-mini").trim();
  if (!apiKey || !baseUrl || !model || model.length > 120) {
    return NextResponse.json({ error: "دستیار سفارش هنوز وصل نشده است." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بدنهٔ درخواست معتبر نیست." }, { status: 400 });
  }
  const messages = parseAssistantHistory((body as { messages?: unknown })?.messages);
  if (!messages) return NextResponse.json({ error: "پیام معتبر نیست." }, { status: 400 });
  if (!allowReply(user.id)) return NextResponse.json({ error: "تعداد پرسش‌ها در این بازه زیاد شده است. چند دقیقهٔ دیگر دوباره بپرسید." }, { status: 429 });

  const { data: orderRows, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(ASSISTANT_ORDER_LIMIT);
  if (orderError) return NextResponse.json({ error: "خواندن سفارش‌ها انجام نشد." }, { status: 500 });

  const orders = (orderRows || []) as Order[];
  const orderIds = orders.map((order) => order.id);
  const [{ data: lineRows }, { data: noteRows }] = orderIds.length
    ? await Promise.all([
        supabase.from("order_products").select("*").in("order_id", orderIds),
        supabase.from("agent_messages").select("order_id, message, created_at").in("order_id", orderIds).order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

  const context = buildOrderContext(
    orders,
    (lineRows || []) as { order_id: string; description: string | null; part_number: string | null; link: string | null }[],
    (noteRows || []) as { order_id: string; message: string }[],
  );

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 500,
        messages: [{ role: "system", content: assistantInstructions(context) }, ...messages],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const payload = await response.json().catch(() => null);
    const reply = replyText(payload);
    if (!response.ok || !reply) {
      const providerMessage = typeof (payload as { error?: { message?: unknown } } | null)?.error?.message === "string"
        ? (payload as { error: { message: string } }).error.message.slice(0, 180)
        : "";
      return NextResponse.json({ error: providerMessage || "دستیار الان جواب نداد. کمی بعد دوباره بپرسید." }, { status: 502 });
    }
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: "اتصال به سرویس هوش مصنوعی برقرار نشد." }, { status: 502 });
  }
}
