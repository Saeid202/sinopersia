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
            </div>
            <div className="shop-footer-column shop-footer-contact">
              <h2>همراه شما هستیم</h2>
              <a href="https://wa.me/14168825015" target="_blank" rel="noreferrer">واتساپ: +1 416 882 5015</a>
              <a href="mailto:shabani_saeid@hotmail.com">shabani_saeid@hotmail.com</a>
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
