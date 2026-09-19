import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ساینو پرشیا | خرید از چین، ارسال به ایران",
  description: "شرکت بازرگانی ساینو پرشیا — خرید از چند فروشنده، تجمیع در یک انبار، ارسال به ایران",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
