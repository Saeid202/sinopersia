"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, Profile } from "@/lib/types";

export default function ChatPanel({
  orderId,
  mode,
  customerName,
}: {
  orderId: string;
  mode: "customer" | "agent";
  customerName?: string;
}) {
  const [supabase] = useState(() => createClient());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadChat() {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) { setError("لطفاً دوباره وارد حساب شوید."); setLoading(false); }
        return;
      }
      if (mounted) setCurrentUserId(user.id);
      const { data, error: messageError } = await supabase
        .from("order_comments")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (messageError) {
        if (mounted) { setError(messageError.message); setLoading(false); }
        return;
      }
      const rows = (data as ChatMessage[]) || [];
      const userIds = [...new Set(rows.map((message) => message.user_id).filter(Boolean))] as string[];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id,full_name,email").in("id", userIds)
        : { data: [] as Pick<Profile, "id" | "full_name" | "email">[] };
      const names = new Map((profiles || []).map((profile) => [profile.id, profile.full_name || profile.email || null]));
      if (mounted) {
        setMessages(rows.map((message) => ({ ...message, sender_name: names.get(message.user_id || "") || null })));
        setLoading(false);
      }
    }
    loadChat();
    const channel = supabase
      .channel(`order-chat-${orderId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_comments", filter: `order_id=eq.${orderId}` }, (payload) => {
        const message = payload.new as ChatMessage;
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      })
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [orderId, supabase]);

  async function sendMessage() {
    const message = text.trim();
    if (!message || !currentUserId || sending) return;
    setSending(true);
    const { data, error: sendError } = await supabase.from("order_comments").insert({
      order_id: orderId,
      user_id: currentUserId,
      author_type: mode,
      message,
    }).select().single();
    setSending(false);
    if (sendError) { setError(sendError.message); return; }
    if (data) setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data as ChatMessage]);
    setText("");
  }

  return (
    <section className="chat-panel">
      <div className="chat-header"><div><h3>گفت‌وگوی سفارش</h3><span>{mode === "agent" ? customerName || "مشتری" : "ایجنت ساینو پرشیا"}</span></div><span className="chat-live">آنلاین</span></div>
      <div className="chat-messages" aria-live="polite">
        {loading && <div className="chat-empty">در حال بارگذاری پیام‌ها...</div>}
        {!loading && !messages.length && <div className="chat-empty">هنوز پیامی در این سفارش ثبت نشده است.</div>}
        {messages.map((message) => {
          const own = message.user_id === currentUserId;
          return <div className={`chat-message ${own ? "own" : "other"}`} key={message.id}><div className="chat-bubble"><div className="chat-author">{own ? "شما" : message.author_type === "agent" ? "ایجنت" : "مشتری"}</div><div>{message.message}</div><time>{new Date(message.created_at).toLocaleString("fa-IR")}</time></div></div>;
        })}
      </div>
      {error && <div className="chat-error">ارسال/دریافت پیام انجام نشد: {error}</div>}
      <form className="chat-compose" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="پیام خود را بنویسید..." rows={2} /><button className="primary" disabled={sending || !text.trim()}>{sending ? "..." : "ارسال"}</button></form>
    </section>
  );
}
