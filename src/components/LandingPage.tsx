"use client";

import { useState } from "react";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";
import BrandLogo from "@/components/BrandLogo";

const processSteps = [
  { number: "۰۱", title: "ثبت سفارش", description: "لینک کالا، تعداد و توضیحات هر قلم را در یک سفارش ثبت کنید." },
  { number: "۰۲", title: "خرید از چین", description: "هر کالا از فروشنده مربوط به خود تهیه می‌شود." },
  { number: "۰۳", title: "تجمیع در انبار", description: "بسته‌ها در انبار چین کنار هم جمع‌آوری می‌شوند." },
  { number: "۰۴", title: "ارسال به ایران", description: "سفارش تجمیع‌شده یکجا به ایران ارسال می‌شود." },
];

const benefits = [
  { title: "یک محموله به‌جای چند ارسال", description: "کالاهای چند فروشنده در یک مسیر یکپارچه مدیریت می‌شوند." },
  { title: "قیمت پیش از پرداخت", description: "مبلغ نهایی برای تأیید شما اعلام می‌شود." },
  { title: "پیگیری روشن سفارش", description: "روند سفارش را از ثبت تا ارسال دنبال کنید." },
  { title: "کارشناس همراه", description: "یک نفر مسئول پیگیری سفارش شما خواهد بود." },
];

const suitableFor = [
  "خرید از چند فروشنده چینی در یک بازه زمانی",
  "سفارش‌هایی با چند قلم کالا و لینک‌های جداگانه",
  "خریدهایی که ارسال یکجای آن‌ها به‌صرفه‌تر است",
];

const orderDetails = [
  { label: "لینک یا مشخصات کالا", detail: "آدرس صفحه کالا یا شرح دقیق آن" },
  { label: "فروشنده", detail: "نام یا لینک فروشگاه" },
  { label: "تعداد", detail: "تعداد موردنیاز از هر قلم" },
  { label: "توضیحات", detail: "رنگ، سایز، مدل یا نکته مهم دیگر" },
];

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const openAuth = () => setAuthOpen(true);

  return (
    <main className="landing-site" id="home">
      <header className="landing-header">
        <nav className="landing-nav" aria-label="ناوبری اصلی">
          <a className="landing-brand" href="#home" aria-label="ساینو پرشیا، صفحه اصلی">
            <BrandLogo className="landing-logo" priority />
          </a>
          <div className="landing-links">
            <Link href="/shop">فروشگاه</Link>
            <a href="#process">فرآیند</a>
            <a href="#consolidation">تجمیع</a>
            <a href="#benefits">چرا ما</a>
            <a href="#suitable">مناسب شما</a>
          </div>
          <div className="landing-actions">
            <button type="button" className="landing-login" onClick={openAuth}>ورود</button>
            <button type="button" className="landing-button landing-button-small" onClick={openAuth}>ثبت سفارش</button>
          </div>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-hero-inner">
          <div className="hero-copy">
            <p className="hero-eyebrow"><span>CHINA</span><span className="eyebrow-arrow" aria-hidden="true">→</span><span>IRAN</span></p>
            <h1 id="hero-title">چند فروشنده در چین،<br /><span>یک محموله به ایران</span></h1>
            <p className="hero-description">خرید از چند فروشگاه را یکجا مدیریت کنید. ما کالاها را در انبار چین جمع می‌کنیم و به‌صورت یک محموله به ایران می‌فرستیم.</p>
            <div className="hero-actions">
              <button type="button" className="landing-button" onClick={openAuth}>ثبت سفارش</button>
              <a href="#process" className="landing-button landing-button-outline">آشنایی با مراحل</a>
            </div>
            <ul className="hero-points">
              <li>تجمیع خریدها در چین</li>
              <li>تأیید قیمت پیش از پرداخت</li>
              <li>پیگیری تا ارسال به ایران</li>
            </ul>
          </div>

          <figure className="shipment-diagram" role="img" aria-label="چند فروشنده در چین، یک انبار مرکزی و یک محموله برای ارسال به ایران">
            <div className="diagram-heading">
              <span>مسیر محموله</span>
              <span className="diagram-route">CHINA <i>→</i> IRAN</span>
            </div>
            <div className="supplier-row">
              {["فروشنده ۱", "فروشنده ۲", "فروشنده ۳"].map((seller) => (
                <div className="supplier-node" key={seller}><span>چین</span><strong>{seller}</strong></div>
              ))}
            </div>
            <div className="diagram-connectors" aria-hidden="true"><span /><span /><span /></div>
            <div className="warehouse-node">
              <span className="diagram-label">تجمیع</span>
              <strong>انبار مرکزی در چین</strong>
              <span>بسته‌ها کنار هم آماده ارسال می‌شوند</span>
            </div>
            <div className="diagram-downline" aria-hidden="true"><span /></div>
            <div className="destination-node">
              <span className="diagram-label">مقصد</span>
              <strong>یک محموله به ایران</strong>
            </div>
            <figcaption>خرید از چند فروشنده، با یک مسیر پیگیری</figcaption>
          </figure>
        </div>
      </section>

      <section className="process-section landing-container" id="process">
        <div className="section-heading">
          <div><p className="section-eyebrow">از ثبت سفارش تا ارسال</p><h2>چهار مرحله، یک مسیر روشن</h2></div>
          <p>از ثبت کالاها تا تجمیع و ارسال، همه چیز در یک سفارش دنبال می‌شود.</p>
        </div>
        <div className="process-grid">
          {processSteps.map((step) => (
            <article className="process-step" key={step.number}>
              <span className="step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="benefits-section" id="benefits">
        <div className="benefits-inner">
          <div className="benefits-heading">
            <div><p className="section-eyebrow section-eyebrow-light">چرا ساینو پرشیا</p><h2>خرید از چین را ساده، مطمئن و اقتصادی می‌کنیم</h2></div>
            <p>به‌جای هماهنگی جداگانه با چند فروشنده، یک سفارش و یک مسیر پیگیری داشته باشید.</p>
          </div>
          <div className="benefit-grid">
            {benefits.map((benefit, index) => (
              <article className="benefit-item" key={benefit.title}>
                <span className="benefit-number">۰{index + 1}</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="consolidation-section landing-container" id="consolidation">
        <div className="section-heading consolidation-heading">
          <div><p className="section-eyebrow">تجمیع سفارش‌ها</p><h2>چند ارسال جدا، به یک محموله تبدیل می‌شود</h2></div>
          <p>وقتی خریدها از چند فروشنده انجام می‌شود، تجمیع آن‌ها می‌تواند مسیر ارسال را ساده‌تر کند.</p>
        </div>
        <div className="comparison-grid">
          <article className="comparison-panel comparison-muted">
            <p className="comparison-label">بدون تجمیع</p>
            <h3>هر فروشنده، یک ارسال جدا</h3>
            <ul><li>پیگیری چند بسته به‌صورت جداگانه</li><li>تکرار هزینه ارسال برای هر بسته</li><li>هماهنگی‌های پراکنده</li></ul>
          </article>
          <article className="comparison-panel comparison-brand">
            <p className="comparison-label">با ساینو پرشیا</p>
            <h3>چند خرید، یک محموله</h3>
            <ul><li>جمع‌آوری بسته‌ها در یک انبار چین</li><li>ارسال یکجای سفارش به ایران</li><li>یک مسیر روشن برای پیگیری</li></ul>
          </article>
        </div>
      </section>

      <section className="suitable-section" id="suitable">
        <div className="suitable-inner landing-container">
          <div className="suitable-heading">
            <p className="section-eyebrow">مناسب برای خرید شما</p>
            <h2>این روش برای چه سفارش‌هایی مناسب است؟</h2>
            <p>وقتی چند قلم کالا را از چند فروشنده تهیه می‌کنید و می‌خواهید ارسال آن‌ها یکجا مدیریت شود.</p>
          </div>
          <ul className="suitable-list">
            {suitableFor.map((item, index) => <li key={item}><span>۰{index + 1}</span>{item}</li>)}
          </ul>
        </div>
      </section>

      <section className="order-section landing-container" id="order-details">
        <div className="order-copy">
          <p className="section-eyebrow">ثبت سفارش</p>
          <h2>برای هر قلم کالا، این چهار مورد کافی است</h2>
          <p>اطلاعات کالاها را ثبت کنید تا کارشناسان ما درخواست شما را بررسی و قیمت نهایی را اعلام کنند.</p>
          <button type="button" className="landing-button" onClick={openAuth}>شروع سفارش</button>
        </div>
        <div className="order-sheet" aria-label="اطلاعات لازم برای ثبت سفارش">
          <div className="order-sheet-header"><span>یک سفارش</span><span>چند فروشنده</span></div>
          {orderDetails.map((detail, index) => (
            <div className="order-sheet-row" key={detail.label}>
              <span className="order-sheet-index">۰{index + 1}</span>
              <div><strong>{detail.label}</strong><span>{detail.detail}</span></div>
            </div>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <div className="final-cta-inner">
          <div><p className="section-eyebrow section-eyebrow-light">CHINA TO IRAN</p><h2>خرید چند فروشنده را به یک محموله تبدیل کنید</h2><p>سفارش خود را ثبت کنید تا کارشناسان ما برای بررسی و اعلام قیمت با شما همراه شوند.</p></div>
          <button type="button" className="landing-button" onClick={openAuth}>ثبت سفارش</button>
        </div>
      </section>

      <footer className="site-footer" id="contact">
        <div className="footer-inner">
          <div className="footer-brand-block">
            <a href="#home" aria-label="ساینو پرشیا، صفحه اصلی"><BrandLogo className="footer-logo" /></a>
            <p>خرید از چند فروشنده چینی، تجمیع در انبار و ارسال یک محموله به ایران.</p>
          </div>
          <div className="footer-column">
            <h2>دسترسی سریع</h2>
            <a href="#process">مراحل همکاری</a><a href="#consolidation">تجمیع سفارش‌ها</a><a href="#benefits">مزیت‌های ما</a><a href="#suitable">مناسب شما</a>
            <a href="/seller-centre/login">Seller Centre</a>
          </div>
          <div className="footer-column footer-contact">
            <h2>در تماس باشید</h2>
            <a href="https://wa.me/14168825015" target="_blank" rel="noreferrer">واتساپ: +1 416 882 5015</a>
            <a href="mailto:shabani_saeid@hotmail.com">shabani_saeid@hotmail.com</a>
            <button type="button" className="footer-order-link" onClick={openAuth}>ثبت سفارش <span aria-hidden="true">←</span></button>
          </div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} ساینو پرشیا. تمامی حقوق محفوظ است.</span><a href="#home">بازگشت به بالا <span aria-hidden="true">↑</span></a></div>
      </footer>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </main>
  );
}