import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { SellerLanguageSwitch } from "@/components/SellerCentreShell";

export default function SellerAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="seller-topbar">
        <Link className="seller-brand" href="/" aria-label="Sino Persia">
          <BrandLogo className="seller-brand-logo" priority />
        </Link>
        <SellerLanguageSwitch />
      </header>
      {children}
    </>
  );
}
