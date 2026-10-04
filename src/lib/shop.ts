export type ShopProduct = {
  id: string;
  seller_id: string;
  category: string;
  sku: string | null;
  title_en: string;
  title_fa: string | null;
  description_en: string | null;
  description_fa: string | null;
  price: number;
  currency: "CNY" | "USD";
  stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type ShopCartLine = {
  productId: string;
  quantity: number;
};

export function formatShopPrice(price: number, currency: ShopProduct["currency"]) {
  return new Intl.NumberFormat(currency === "CNY" ? "zh-CN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(price);
}

export function getProductTitle(product: ShopProduct) {
  return product.title_fa?.trim() || product.title_en;
}

export function getProductDescription(product: ShopProduct) {
  return product.description_fa?.trim() || product.description_en?.trim() || "";
}

export function getProductCategory(category: string) {
  const translations: Record<string, string> = {
    Electronics: "لوازم الکترونیکی",
    "Industrial Parts": "قطعات صنعتی",
    "Auto Parts": "قطعات خودرو",
    "Construction Equipment": "تجهیزات ساختمانی",
    "Raw Materials": "مواد اولیه",
    Machinery: "ماشین‌آلات",
    "Home Appliances": "لوازم خانگی",
    "Clothing & Textiles": "پوشاک و نساجی",
    Other: "سایر",
    General: "عمومی",
  };
  return translations[category] || category;
}
