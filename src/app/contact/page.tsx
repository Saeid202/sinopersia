"use client";

import { useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import ExchangeRates from "@/components/ExchangeRates";
import { createClient } from "@/lib/supabase/client";

const WHATSAPP_URL = "https://wa.me/14168825015";
const CONTACT_EMAIL = "shabani_saeid@hotmail.com";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSent(false);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedMessage = message.trim();

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setError("نام باید بین ۲ تا ۸۰ حرف باشد.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 160) {
      setError("ایمیل را درست وارد کنید.");
      return;
    }
    if (trimmedPhone && (trimmedPhone.length < 6 || trimmedPhone.length > 30)) {
      setError("شماره تماس را درست وارد کنید.");
      return;
    }
    if (trimmedMessage.length < 10 || trimmedMessage.length > 2000) {
      setError("متن پیام باید بین ۱۰ تا ۲۰۰۰ حرف باشد.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("contact_messages").insert({
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone || null,
      message: trimmedMessage,
    });
    setSubmitting(false);

    if (insertError) {
      setError("ارسال پیام انجام نشد. لطفاً کمی بعد دوباره تلاش کنید.");
      return;
    }

    setName("");
    setEmail("");
    setPhone("");
    setMessage("");
    setSent(true);
  }

  return (
    <main className="contact-page">
      <ExchangeRates />
      <header className="landing-header">
        <nav className="landing-nav" aria-label="ناوبری اصلی">
          <Link className="landing-brand" href="/" aria-label="ساینو پرشیا، صفحه اصلی">
            <BrandLogo className="landing-logo" priority />
          </Link>
          <div className="landing-links">
            <Link href="/shop">فروشگاه</Link>
            <Link href="/#process">فرآیند</Link>
            <Link href="/#consolidation">تجمیع</Link>
            <Link href="/#benefits">چرا ما</Link>
            <Link href="/#suitable">مناسب شما</Link>
            <Link href="/contact" aria-current="page">تماس با ما</Link>
          </div>
          <div className="landing-actions">
            <Link className="landing-login" href="/login">ورود</Link>
            <Link className="landing-button landing-button-small" href="/login">ثبت سفارش</Link>
          </div>
        </nav>
      </header>

      <section className="contact-section" aria-labelledby="contact-title">
        <div className="contact-copy">
          <p className="section-eyebrow">تماس با ما</p>
          <h1 id="contact-title">پیام خود را برای ما بفرستید</h1>
          <p>دربارهٔ خرید، تجمیع یا ارسال سؤال دارید؟ پیام بگذارید تا کارشناسان ساینو پرشیا با شما تماس بگیرند.</p>
          <div className="contact-channels">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 13.89c-.24.68-1.4 1.25-1.93 1.33-.49.07-1.1.1-1.78-.11-.41-.13-.94-.3-1.62-.59-2.85-1.23-4.7-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94s.73-2.08 1-2.37c.24-.26.64-.38 1.02-.38.12 0 .23 0 .33.01.3.01.45.03.65.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.27.14.43.12.59-.07.16-.19.68-.79.86-1.06.18-.27.36-.23.6-.14.24.09 1.54.73 1.8.86.27.14.44.2.51.31.07.12.07.67-.17 1.35z" /></svg>
              <span>واتساپ: +1 416 882 5015</span>
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" d="M4 6.5h16v11H4z" /><path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" d="m4.5 7 7.5 6 7.5-6" /></svg>
              <span>{CONTACT_EMAIL}</span>
            </a>
          </div>
        </div>

        <form className="contact-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="contact-name">نام</label>
            <input id="contact-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="contact-form-row">
            <div className="field">
              <label htmlFor="contact-email">ایمیل</label>
              <input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={160} value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="contact-phone">شماره تماس</label>
              <input id="contact-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="اختیاری" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="contact-message">پیام</label>
            <textarea id="contact-message" name="message" required minLength={10} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="سؤال یا درخواست خود را بنویسید" />
          </div>
          {error && <p className="contact-feedback is-error" role="alert">{error}</p>}
          {sent && <p className="contact-feedback is-success" role="status">پیام شما ثبت شد. به‌زودی پاسخ می‌دهیم.</p>}
          <button className="landing-button" type="submit" disabled={submitting}>{submitting ? "در حال ارسال..." : "ارسال پیام"}</button>
        </form>
      </section>
    </main>
  );
}
