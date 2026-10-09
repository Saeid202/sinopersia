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

export type ShopCategory = {
  id: string;
  name_en: string;
  name_fa: string;
  sort_order: number;
};

export const FALLBACK_SHOP_CATEGORIES: ShopCategory[] = [
  { id: "Electronics", name_en: "Electronics", name_fa: "لوازم الکترونیکی", sort_order: 1 },
  { id: "Industrial Parts", name_en: "Industrial Parts", name_fa: "قطعات صنعتی", sort_order: 2 },
  { id: "Auto Parts", name_en: "Auto Parts", name_fa: "قطعات خودرو", sort_order: 3 },
  { id: "Construction Equipment", name_en: "Construction Equipment", name_fa: "تجهیزات ساختمانی", sort_order: 4 },
  { id: "Raw Materials", name_en: "Raw Materials", name_fa: "مواد اولیه", sort_order: 5 },
  { id: "Machinery", name_en: "Machinery", name_fa: "ماشین‌آلات", sort_order: 6 },
  { id: "Home Appliances", name_en: "Home Appliances", name_fa: "لوازم خانگی", sort_order: 7 },
  { id: "Clothing & Textiles", name_en: "Clothing & Textiles", name_fa: "پوشاک و نساجی", sort_order: 8 },
  { id: "Other", name_en: "Other", name_fa: "سایر", sort_order: 9 },
];

export function categoryLabel(category: string, categories: Pick<ShopCategory, "name_en" | "name_fa">[] = []) {
  return categories.find((item) => item.name_en === category)?.name_fa || getProductCategory(category);
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
