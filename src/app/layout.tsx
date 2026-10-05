import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ساینو پرشیا | خرید از چین، ارسال به ایران",
  description: "شرکت بازرگانی ساینو پرشیا — خرید از چند فروشنده، تجمیع در یک انبار، ارسال به ایران",
  metadataBase: new URL("https://sinopersia.biz"),
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "https://sinopersia.biz",
    siteName: "ساینو پرشیا",
    title: "ساینو پرشیا | خرید از چین، ارسال به ایران",
    description: "شرکت بازرگانی ساینو پرشیا — خرید از چند فروشنده، تجمیع در یک انبار، ارسال به ایران",
    images: [
      {
        url: "/logo.png",
        width: 393,
        height: 278,
        alt: "لوگوی ساینو پرشیا",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ساینو پرشیا | خرید از چین، ارسال به ایران",
    description: "شرکت بازرگانی ساینو پرشیا — خرید از چند فروشنده، تجمیع در یک انبار، ارسال به ایران",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
