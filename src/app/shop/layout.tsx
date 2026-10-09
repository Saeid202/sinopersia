import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { ShopCartProvider, ShopHeader } from "@/components/ShopCart";
import "./shop.css";

export default function ShopLayout({ children }: LayoutProps<"/shop">) {
  return (
    <ShopCartProvider>
      <div className="shop-site">
        <ShopHeader />
        <main>{children}</main>
        <footer className="shop-footer">
          <div className="shop-footer-main">
            <div className="shop-footer-brand">
              <Link className="shop-footer-logo-wrap" href="/" aria-label="ساینو پرشیا، صفحهٔ اصلی">
                <BrandLogo className="shop-footer-logo" />
              </Link>
              <p>خرید از چین را ساده‌تر می‌کنیم؛ از انتخاب محصول تا هماهنگی خرید، تجمیع و ارسال به ایران همراه شما هستیم.</p>
              <span className="shop-footer-route">CHINA <i>→</i> IRAN</span>
            </div>
            <div className="shop-footer-column">
              <h2>دسترسی سریع</h2>
              <Link href="/shop">فروشگاه محصولات</Link>
              <Link href="/shop/cart">سبد خرید</Link>
              <Link href="/#process">مراحل همکاری</Link>
              <Link href="/#contact">دربارهٔ ساینو پرشیا</Link>
              <Link href="/contact">تماس با ما</Link>
            </div>
            <div className="shop-footer-column shop-footer-contact">
              <h2>همراه شما هستیم</h2>
              <a href="https://wa.me/14168825015" target="_blank" rel="noreferrer">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 13.89c-.24.68-1.4 1.25-1.93 1.33-.49.07-1.1.1-1.78-.11-.41-.13-.94-.3-1.62-.59-2.85-1.23-4.7-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94s.73-2.08 1-2.37c.24-.26.64-.38 1.02-.38.12 0 .23 0 .33.01.3.01.45.03.65.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.27.14.43.12.59-.07.16-.19.68-.79.86-1.06.18-.27.36-.23.6-.14.24.09 1.54.73 1.8.86.27.14.44.2.51.31.07.12.07.67-.17 1.35z" /></svg>
                <span>واتساپ: +1 416 882 5015</span>
              </a>
              <a href="mailto:shabani_saeid@hotmail.com">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" d="M4 6.5h16v11H4z" /><path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" d="m4.5 7 7.5 6 7.5-6" /></svg>
                <span>shabani_saeid@hotmail.com</span>
              </a>
              <span>پاسخ‌گویی دربارهٔ محصولات و ارسال</span>
            </div>
            <div className="shop-footer-cta">
              <span>آمادهٔ شروع هستید؟</span>
              <strong>محصول دلخواهتان را پیدا کنید.</strong>
              <Link href="/shop" className="shop-footer-button">مشاهدهٔ محصولات <span aria-hidden="true">←</span></Link>
            </div>
          </div>
          <div className="shop-footer-bottom">
            <span>© {new Date().getFullYear()} ساینو پرشیا. تمامی حقوق محفوظ است.</span>
            <Link href="/">بازگشت به صفحهٔ اصلی <span aria-hidden="true">↑</span></Link>
          </div>
        </footer>
      </div>
    </ShopCartProvider>
  );
}
