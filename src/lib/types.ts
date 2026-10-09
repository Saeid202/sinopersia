export type Order = {
  id: string;
  order_number: string;
  user_id: string;
  title: string;
  title_en: string | null;
  category: string | null;
  part_number: string | null;
  assigned_agent_id: string | null;
  quantity: number | null;
  unit: string | null;
  deadline: string | null;
  budget: string | null;
  shipping_type: string | null;
  sample_request: boolean;
  notes: string | null;
  price: string | null;
  status: string;
  created_at: string;
};

export type OrderProduct = {
  id: string;
  order_id: string;
  link: string | null;
  description: string | null;
  part_number: string | null;
};

export type OrderComment = {
  id: string;
  order_id: string;
  user_id: string | null;
  author_type: "customer" | "agent";
  message: string;
  created_at: string;
};

export type ChatMessage = OrderComment & {
  sender_name?: string | null;
};

export type Ticket = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  ticket_replies?: TicketReply[];
};

export type TicketReply = {
  id: string;
  ticket_id: string;
  author_type: string;
  message: string;
  created_at: string;
};

export type AgentMessage = {
  id: string;
  order_id: string;
  user_id: string;
  agent_name: string | null;
  message: string;
  created_at: string;
  orders?: { order_number: string } | null;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: "جدید" | "خوانده‌شده";
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  email: string | null;
  role: "customer" | "agent" | "admin" | "seller";
};

export function statusClass(status: string) {
  if (status === "تکمیل‌شده") return "done";
  if (status === "در حال بررسی") return "review";
  return "";
}
