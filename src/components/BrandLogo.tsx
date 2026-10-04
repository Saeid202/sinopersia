import Image from "next/image";

type BrandLogoProps = {
  className: string;
  priority?: boolean;
};

export default function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Sino Persia"
      width={393}
      height={278}
      className={`brand-logo ${className}`}
      priority={priority}
    />
  );
}
