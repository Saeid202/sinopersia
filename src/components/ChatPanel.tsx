"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, Profile } from "@/lib/types";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

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
  const [counterpartId, setCounterpartId] = useState<string | null>(null);
  const [counterpartOnline, setCounterpartOnline] = useState(false);
  const [counterpartTyping, setCounterpartTyping] = useState(false);
  const [counterpartReadAt, setCounterpartReadAt] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let activeChannel: RealtimeChannel | null = null;

    async function loadChat() {
      setLoading(true);
      const { data, error: messageError } = await supabase
        .from("order_comments")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (messageError) {
        if (mounted) { setError(messageError.message); setLoading(false); }
        return;
      }
      const rows = ((data as ChatMessage[]) || []).reverse();
      const userIds = [...new Set(rows.map((message) => message.user_id).filter(Boolean))] as string[];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id,full_name,email").in("id", userIds)
        : { data: [] as Pick<Profile, "id" | "full_name" | "email">[] };
      const names = new Map((profiles || []).map((profile) => [profile.id, profile.full_name || profile.email || null]));
      if (mounted) {
        const loadedMessages = rows.map((message) => ({ ...message, sender_name: names.get(message.user_id || "") || null }));
        setMessages((current) => {
          const mergedMessages = new Map([...loadedMessages, ...current].map((message) => [message.id, message]));
          return [...mergedMessages.values()].sort((left, right) => left.created_at.localeCompare(right.created_at));
        });
        setLoading(false);
      }
    }

    async function markChatRead() {
      const { error: readError } = await supabase.rpc("mark_order_chat_read", { order_id_input: orderId });
      if (readError && mounted) setError(readError.message);
    }

    async function connect() {
      setLoading(true);
      setError(null);
      setConnectionStatus("connecting");
      setMessages([]);
      setCounterpartId(null);
      setCounterpartOnline(false);
      setCounterpartTyping(false);
      setCounterpartReadAt(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) { setError("لطفاً دوباره وارد حساب شوید."); setLoading(false); setConnectionStatus("disconnected"); }
        return;
      }
      if (!mounted) return;
      setCurrentUserId(user.id);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("user_id,assigned_agent_id")
        .eq("id", orderId)
        .single();
      if (!mounted) return;
      if (orderError || !order) {
        if (mounted) { setError(orderError?.message || "سفارش پیدا نشد."); setLoading(false); setConnectionStatus("disconnected"); }
        return;
      }
      const peerId = mode === "customer" ? order.assigned_agent_id : order.user_id;
      setCounterpartId(peerId);
      if (peerId) {
        const { data: readMarker } = await supabase
          .from("order_chat_reads")
          .select("last_read_at")
          .eq("order_id", orderId)
          .eq("user_id", peerId)
          .maybeSingle();
        if (mounted) setCounterpartReadAt(readMarker?.last_read_at || null);
      }
      if (!mounted) return;

      const channel = supabase.channel(`order-chat:${orderId}`, {
        config: { private: true, presence: { key: user.id } },
      });
      activeChannel = channel;
      channelRef.current = channel;
      channel
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_comments", filter: `order_id=eq.${orderId}` }, (payload) => {
          const message = payload.new as ChatMessage;
          setMessages((current) => {
            const mergedMessages = new Map([...current, message].map((item) => [item.id, item]));
            return [...mergedMessages.values()].sort((left, right) => left.created_at.localeCompare(right.created_at));
          });
          if (message.user_id !== user.id && document.visibilityState === "visible") void markChatRead();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "order_chat_reads", filter: `order_id=eq.${orderId}` }, (payload) => {
          const marker = payload.new as { user_id?: string; last_read_at?: string };
          if (marker.user_id === peerId && marker.last_read_at) setCounterpartReadAt(marker.last_read_at);
        })
        .on("broadcast", { event: "typing" }, (event) => {
          const typingEvent = event.payload as { user_id?: string; is_typing?: boolean };
          if (typingEvent.user_id !== user.id) setCounterpartTyping(Boolean(typingEvent.is_typing));
        })
        .on("presence", { event: "sync" }, () => {
          const presenceState = channel.presenceState<{ user_id: string }>();
          const onlineUsers = Object.values(presenceState).flat();
          const peerIsOnline = onlineUsers.some((presence) => presence.user_id === peerId && presence.user_id !== user.id);
          setCounterpartOnline(Boolean(peerId && peerIsOnline));
          if (!peerIsOnline) setCounterpartTyping(false);
        })
        .subscribe(async (status) => {
          if (!mounted) return;
          if (status === "SUBSCRIBED") {
            setConnectionStatus("connected");
            setError(null);
            await channel.track({ user_id: user.id });
            await loadChat();
            await markChatRead();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setConnectionStatus("disconnected");
            setError("اتصال زنده قطع شد؛ در حال تلاش برای اتصال مجدد هستیم.");
          }
        });
    }

    connect();
    return () => {
      mounted = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingActiveRef.current = false;
      if (channelRef.current === activeChannel) channelRef.current = null;
      if (activeChannel) void supabase.removeChannel(activeChannel);
    };
  }, [mode, orderId, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [counterpartTyping, messages]);

  function publishTyping(isTyping: boolean) {
    const channel = channelRef.current;
    if (!channel || !currentUserId) return;
    void channel.send({ type: "broadcast", event: "typing", payload: { user_id: currentUserId, is_typing: isTyping } });
  }

  function handleTextChange(value: string) {
    setText(value);
    if (value.trim() && !typingActiveRef.current) {
      typingActiveRef.current = true;
      publishTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        typingActiveRef.current = false;
        publishTyping(false);
      }, 1300);
    } else if (typingActiveRef.current) {
      typingActiveRef.current = false;
      publishTyping(false);
    }
  }

  async function sendMessage() {
    const message = text.trim();
    if (!message || !currentUserId || sending) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingActiveRef.current = false;
    publishTyping(false);
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
    setError(null);
    setText("");
  }

  const lastOwnMessage = [...messages].reverse().find((message) => message.user_id === currentUserId);
  const presenceLabel = connectionStatus !== "connected"
    ? "اتصال برقرار نیست"
    : counterpartOnline
      ? "آنلاین"
      : mode === "customer" && !counterpartId
        ? "در انتظار تخصیص ایجنت"
        : mode === "agent" && !counterpartId
          ? "مشتری"
          : "آفلاین";

  return (
    <section className="chat-panel">
      <div className="chat-header"><div><h3>گفت‌وگوی سفارش</h3><span>{mode === "agent" ? customerName || "مشتری" : "ایجنت ساینو پرشیا"}</span></div><span className={counterpartOnline ? "chat-live" : "chat-connection"}><i className={counterpartOnline ? "is-online" : ""} />{presenceLabel}</span></div>
      <div className="chat-messages" aria-live="polite">
        {loading && <div className="chat-empty">در حال بارگذاری پیام‌ها...</div>}
        {!loading && !messages.length && <div className="chat-empty">هنوز پیامی در این سفارش ثبت نشده است.</div>}
        {messages.map((message) => {
          const own = message.user_id === currentUserId;
          return <div className={`chat-message ${own ? "own" : "other"}`} key={message.id}><div className="chat-bubble"><div className="chat-author">{own ? "شما" : message.author_type === "agent" ? "ایجنت" : "مشتری"}</div><div>{message.message}</div><time>{new Date(message.created_at).toLocaleString("fa-IR")}</time>{own && message.id === lastOwnMessage?.id && <small className="chat-read-status">{counterpartReadAt && new Date(counterpartReadAt) >= new Date(message.created_at) ? "خوانده شد" : "ارسال شد"}</small>}</div></div>;
        })}
        {counterpartTyping && <div className="chat-typing" aria-live="polite">{mode === "agent" ? "مشتری" : "ایجنت"} در حال نوشتن...</div>}
        <div ref={messagesEndRef} />
      </div>
      {error && <div className="chat-error">ارسال/دریافت پیام انجام نشد: {error}</div>}
      <form className="chat-compose" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}><textarea value={text} onChange={(event) => handleTextChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); sendMessage(); } }} placeholder="پیام خود را بنویسید..." rows={2} /><button className="primary" disabled={sending || !text.trim()}>{sending ? "در حال ارسال..." : "ارسال"}</button></form>
    </section>
  );
}
