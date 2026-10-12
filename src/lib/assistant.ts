import type { Order } from "@/lib/types";

export const ASSISTANT_HISTORY_LIMIT = 12;
export const ASSISTANT_MESSAGE_LIMIT = 1500;
export const ASSISTANT_ORDER_LIMIT = 15;

export type AssistantTurn = { role: "user" | "assistant"; content: string };

type OrderLine = {
  order_id: string;
  description: string | null;
  part_number: string | null;
  link: string | null;
};

type AgentNote = { order_id: string; message: string };

export function parseAssistantHistory(value: unknown): AssistantTurn[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > ASSISTANT_HISTORY_LIMIT) return null;
  const turns: AssistantTurn[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.trim();
    if (!text || text.length > ASSISTANT_MESSAGE_LIMIT) return null;
    turns.push({ role, content: text });
  }
  if (turns[turns.length - 1]?.role !== "user") return null;
  return turns;
}

function clip(value: string | null | undefined, max: number) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

export function buildOrderContext(orders: Order[], lines: OrderLine[], notes: AgentNote[]) {
  if (!orders.length) return "این مشتری هنوز سفارشی ندارد.";
  const linesByOrder = new Map<string, OrderLine[]>();
  for (const line of lines) {
    const list = linesByOrder.get(line.order_id) || [];
    if (list.length < 8) list.push(line);
    linesByOrder.set(line.order_id, list);
  }
  const noteByOrder = new Map<string, string>();
  for (const note of notes) {
    if (!noteByOrder.has(note.order_id)) noteByOrder.set(note.order_id, clip(note.message, 300));
  }

  return orders.map((order) => {
    const items = (linesByOrder.get(order.id) || []).map((line) => {
      return [clip(line.description, 180), line.part_number ? `کد: ${line.part_number}` : "", line.link ? `لینک: ${clip(line.link, 120)}` : ""]
        .filter(Boolean)
        .join(" | ");
    });
    return [
      `شماره: ${order.order_number}`,
      `عنوان: ${clip(order.title, 160) || "—"}`,
      `دسته: ${order.category || "—"}`,
      `وضعیت: ${order.status || "—"}`,
      `قیمت ثبت‌شده: ${order.price?.trim() || "هنوز قیمتی ثبت نشده"}`,
      `تعداد: ${order.quantity ?? "—"} ${order.unit || ""}`.trim(),
      `مهلت: ${order.deadline || "—"}`,
      `حمل: ${order.shipping_type || "—"}`,
      `بودجه مشتری: ${order.budget || "—"}`,
      `شماره فنی: ${order.part_number || "—"}`,
      `توضیح: ${clip(order.notes, 500) || "—"}`,
      `یادداشت ایجنت: ${noteByOrder.get(order.id) || "—"}`,
      items.length ? `اقلام:\n- ${items.join("\n- ")}` : "اقلام: —",
    ].join("\n");
  }).join("\n\n");
}

export function assistantInstructions(orderContext: string) {
  return [
    "تو دستیار سفارش ساینو پرشیا هستی و فقط با همین مشتری حرف می‌زنی.",
    "به زبان مشتری جواب بده. اگر فارسی نوشت، فارسی جواب بده.",
    "فقط از فهرست سفارش‌های زیر استفاده کن. اگر جواب در فهرست نیست، بگو این اطلاعات را نداری و مشتری باید در زبانهٔ گفتگو با ایجنت یا با تیکت پشتیبانی بپرسد.",
    "وضعیت، قیمت، حمل و پرداخت را عوض نکن و قول تاریخ تحویلی نده که در داده‌ها نیست.",
    "قیمت خالی یعنی هنوز قیمتی ثبت نشده است.",
    "دستهٔ فروشگاه یعنی خرید فروشگاه. قیمت آن مبلغ کالاست و هزینهٔ ارسال داخل آن نیست.",
    "درخواست تأمین را کارشناس قیمت می‌دهد و پرداختش داخل محصول انجام نمی‌شود.",
    "شمارهٔ سفارش، قیمت یا وضعیتی که در فهرست نیست نساز.",
    "جواب را کوتاه نگه دار، حدود چند جمله.",
    "",
    "سفارش‌های این مشتری:",
    orderContext,
  ].join("\n");
}
