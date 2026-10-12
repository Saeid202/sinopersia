"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import BrandLogo from "@/components/BrandLogo";

type SiteHeaderProps = {
  actions: ReactNode;
  brandHref?: string;
  hashBase?: "" | "/";
};

export default function SiteHeader({ actions, brandHref = "/", hashBase = "/" }: SiteHeaderProps) {
  const pathname = usePathname();
  const links = [
    { key: "shop", label: "فروشگاه", href: "/shop", current: pathname.startsWith("/shop") },
    { key: "process", label: "فرآیند", href: `${hashBase}#process`, current: false },
    { key: "consolidation", label: "تجمیع", href: `${hashBase}#consolidation`, current: false },
    { key: "benefits", label: "چرا ما", href: `${hashBase}#benefits`, current: false },
    { key: "suitable", label: "مناسب شما", href: `${hashBase}#suitable`, current: false },
    { key: "contact", label: "تماس با ما", href: "/contact", current: pathname === "/contact" },
  ];
  const brand = <BrandLogo className="site-logo" priority />;

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="ناوبری اصلی">
        {brandHref.startsWith("#") ? (
          <a className="site-brand" href={brandHref} aria-label="ساینو پرشیا، صفحه اصلی">{brand}</a>
        ) : (
          <Link className="site-brand" href={brandHref} aria-label="ساینو پرشیا، صفحه اصلی">{brand}</Link>
        )}
        <div className="site-links">
          {links.map((item) =>
            item.href.startsWith("#") ? (
              <a key={item.key} href={item.href}>{item.label}</a>
            ) : (
              <Link key={item.key} href={item.href} aria-current={item.current ? "page" : undefined}>{item.label}</Link>
            ),
          )}
        </div>
        <div className="site-actions">{actions}</div>
      </nav>
    </header>
  );
}
