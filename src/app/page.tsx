import Link from "next/link";

const steps = [
  { title: "خرید از چند فروشنده", desc: "سفارش خود را در داشبورد ثبت می‌کنید و ما از چندین فروشنده در چین خرید می‌کنیم." },
  { title: "تجمیع در یک انبار", desc: "تمام کالاهای شما در انبار مرکزی ما در چین جمع‌آوری و بسته‌بندی می‌شود." },
  { title: "ارسال به ایران", desc: "پس از تجمیع، محموله به‌صورت یکجا و مقرون‌به‌صرفه به ایران ارسال می‌شود." },
];

const whyUs = [
  { icon: "💰", title: "صرفه‌جویی در هزینه حمل", desc: "با تجمیع سفارش‌ها، هزینه ارسال به شدت کاهش می‌یابد." },
  { icon: "🕒", title: "پیگیری شفاف", desc: "وضعیت سفارش خود را همیشه در داشبورد مشاهده کنید." },
  { icon: "🤝", title: "کارشناس اختصاصی", desc: "یک ایجنت مسئول، سفارش شما را از ابتدا تا تحویل پیگیری می‌کند." },
  { icon: "🛡️", title: "امنیت خرید", desc: "قیمت نهایی پیش از پرداخت به تأیید شما می‌رسد." },
];

export default function Home() {
  return (
    <div>
      <header className="landing-header">
        <nav className="landing-nav">
          <div className="logo">SINO <span>PERSIA</span></div>
          <div className="landing-links">
            <a href="#how">روند کار</a>
            <a href="#why">چرا ما</a>
            <Link href="/login">ورود</Link>
            <Link href="/login" className="primary">ثبت سفارش</Link>
          </div>
        </nav>
      </header>

      <section className="hero">
        <h1>خرید از چند فروشنده، تجمیع در یک انبار، <span className="accent">ارسال به ایران</span></h1>
        <p>شرکت بازرگانی ساینو پرشیا، ارائه‌دهنده خدمات تجاری از چین به ایران با پیگیری کامل سفارش توسط کارشناسان ما.</p>
        <div className="hero-actions">
          <Link href="/login" className="primary">شروع سفارش</Link>
          <a href="#how" className="ghost-on-dark">روند کار را ببینید</a>
        </div>
      </section>

      <section className="section" id="how">
        <h2 className="section-title">روند کار</h2>
        <p className="section-subtitle">از ثبت درخواست تا تحویل کالا، همه چیز شفاف و قابل پیگیری است.</p>
        <div className="steps">
          {steps.map((s, i) => (
            <div className="step-card" key={s.title}>
              <div className="step-num">{i + 1}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="why">
        <h2 className="section-title">چرا ساینو پرشیا؟</h2>
        <p className="section-subtitle">ما تجربه خرید از چین را ساده، مطمئن و اقتصادی می‌کنیم.</p>
        <div className="why-grid">
          {whyUs.map((w) => (
            <div className="why-card" key={w.title}>
              <div className="why-icon">{w.icon}</div>
              <h4>{w.title}</h4>
              <p>{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="cta-band">
        <h2>همین حالا سفارش خود را ثبت کنید</h2>
        <p>ثبت‌نام رایگان است. کارشناسان ما در کمتر از ۲۴ ساعت قیمت نهایی را اعلام می‌کنند.</p>
        <Link href="/login" className="primary">ورود / ثبت‌نام</Link>
      </div>

      <footer className="site-footer">
        <div>© {new Date().getFullYear()} ساینو پرشیا — تمامی حقوق محفوظ است.</div>
        <div style={{ marginTop: 6 }}>تماس: WhatsApp +14168825015 — shabani_saeid@hotmail.com</div>
      </footer>
    </div>
  );
}
