import SellerCentreShell from "@/components/SellerCentreShell";

export default function SellerCentreLayout({ children }: LayoutProps<"/seller-centre">) {
  return <SellerCentreShell>{children}</SellerCentreShell>;
}