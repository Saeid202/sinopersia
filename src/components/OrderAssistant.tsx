"use client";

import { useEffect, useRef, useState } from "react";
import type { AssistantTurn } from "@/lib/assistant";

const SUGGESTIONS = ["وضعیت سفارش‌های من چیست؟", "کدام سفارش قیمت دارد؟", "آخرین سفارش من چه جزئیاتی دارد؟"];

export default function OrderAssistant() {
  const [messages, setMessages] = useState<AssistantTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, sending]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    const history: AssistantTurn[] = [...messages, { role: "user", content }];
    setMessages(history);
    setDraft("");
    setError(null);
    setSending(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const payload = await response.json().catch(() => ({})) as { reply?: string; error?: string };
      if (!response.ok || !payload.reply) {
        setError(payload.error || "پاسخ دستیار دریافت نشد.");
        return;
      }
      setMessages((current) => [...current, { role: "assistant", content: payload.reply as string }]);
    } catch {
      setError("اتصال به دستیار برقرار نشد.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <p className="assistant-note">این گفتگو خودکار است و فقط سفارش‌های خودتان را توضیح می‌دهد. قیمت و وضعیت را عوض نمی‌کند و پیامی برای ایجنت نمی‌فرستد. با تازه‌کردن صفحه، این گفتگو پاک می‌شود.</p>
      <section className="chat-panel assistant-panel">
        <div className="chat-header">
          <div>
            <h3>دستیار سفارش</h3>
            <span>پاسخ از روی سفارش‌های ثبت‌شدهٔ همین حساب</span>
          </div>
        </div>
        <div className="chat-messages">
          <div className="chat-message other">
            <div className="chat-bubble">
              <div className="chat-author">دستیار</div>
              سلام. می‌توانم وضعیت، قیمت و جزئیات سفارش‌های خودتان را بگویم. اگر چیزی در سفارش ثبت نشده باشد، همان را می‌گویم.
            </div>
          </div>
          {messages.map((message, index) => (
            <div className={`chat-message ${message.role === "user" ? "own" : "other"}`} key={`${message.role}-${index}`}>
              <div className="chat-bubble">
                <div className="chat-author">{message.role === "user" ? "شما" : "دستیار"}</div>
                {message.content}
              </div>
            </div>
          ))}
          {sending && <div className="chat-typing">در حال نوشتن...</div>}
          <div ref={bottomRef} />
        </div>
        {error && <div className="chat-error">{error}</div>}
        {!messages.length && (
          <div className="assistant-suggestions">
            {SUGGESTIONS.map((suggestion) => (
              <button type="button" key={suggestion} onClick={() => send(suggestion)} disabled={sending}>{suggestion}</button>
            ))}
          </div>
        )}
        <form className="chat-compose" onSubmit={(event) => { event.preventDefault(); void send(draft); }}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void send(draft);
              }
            }}
            placeholder="دربارهٔ سفارش خود بپرسید..."
            rows={2}
            maxLength={1500}
          />
          <button className="primary" disabled={sending || !draft.trim()}>{sending ? "..." : "ارسال"}</button>
        </form>
      </section>
    </div>
  );
}
