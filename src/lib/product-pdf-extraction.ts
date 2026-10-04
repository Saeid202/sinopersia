import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export type ExtractedPdfProduct = {
  source_page: number;
  raw_text: string;
  title_en: string;
  title_fa: string | null;
  sku: string | null;
  price: number | null;
  currency: "CNY" | "USD" | null;
  extraction_note: string;
};

type TextLine = { y: number; items: { x: number; text: string }[] };

const MAX_PDF_PAGES = 60;
const MAX_EXTRACTED_PRODUCTS = 400;
const MAX_EXTRACTED_TEXT_CHARACTERS = 1_000_000;
const PRICE_PATTERN = /(?:CNY|RMB|USD|US\$|¥|￥|\$)\s*([0-9][\d,]*(?:\.\d{1,4})?)|([0-9][\d,]*(?:\.\d{1,4})?)\s*(CNY|RMB|USD)\b/i;
const SKU_PATTERN = /\b(?:SKU|ITEM\s*(?:NO\.?|#)|PART\s*(?:NO\.?|#)|MODEL)\s*[:#-]?\s*([A-Z0-9][A-Z0-9_-]{1,})\b/i;

function isPdfTextItem(item: unknown): item is { str: string; transform: number[] } {
  return typeof item === "object" &&
    item !== null &&
    "str" in item &&
    typeof item.str === "string" &&
    "transform" in item &&
    Array.isArray(item.transform) &&
    typeof item.transform[4] === "number" &&
    typeof item.transform[5] === "number";
}

function reconstructLines(items: unknown[]) {
  const positioned = items
    .filter(isPdfTextItem)
    .map((item) => ({
      x: item.transform[4],
      y: item.transform[5],
      text: item.str.replace(/\s+/g, " ").trim(),
    }))
    .filter((item) => item.text.length > 0)
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const linesByBaseline = new Map<number, TextLine>();
  for (const item of positioned) {
    const baseline = Math.round(item.y / 3);
    let line = linesByBaseline.get(baseline);
    if (!line) {
      line = { y: item.y, items: [] };
      linesByBaseline.set(baseline, line);
    }
    line.items.push({ x: item.x, text: item.text });
  }
  return [...linesByBaseline.values()]
    .sort((a, b) => b.y - a.y)
    .map((line) => {
      const rightToLeft = line.items.some((item) => /[\u0600-\u06ff]/.test(item.text));
      return line.items
        .sort((a, b) => rightToLeft ? b.x - a.x : a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    })
    .filter(Boolean);
}

function makeDraftProduct(rawText: string, sourcePage: number): ExtractedPdfProduct | null {
  const priceMatch = PRICE_PATTERN.exec(rawText);
  const rawPrice = priceMatch?.[1] || priceMatch?.[2] || null;
  const parsedPrice = rawPrice ? Number(rawPrice.replace(/,/g, "")) : null;
  const price = parsedPrice !== null && Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;
  const currencyToken = priceMatch?.[0] || "";
  const currency = /USD|US\$|\$/i.test(currencyToken) ? "USD" : /CNY|RMB|¥|￥/i.test(currencyToken) ? "CNY" : null;
  const sku = SKU_PATTERN.exec(rawText)?.[1] || null;
  const title = rawText
    .replace(PRICE_PATTERN, " ")
    .replace(SKU_PATTERN, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s|,;:·-]+|[\s|,;:·-]+$/g, "")
    .trim();

  if (!/[\p{L}]{2}/u.test(title)) return null;
  const hasPersianText = /[\u0600-\u06ff]/.test(title);
  return {
    source_page: sourcePage,
    raw_text: rawText.slice(0, 2000),
    title_en: hasPersianText ? "" : title.slice(0, 160),
    title_fa: hasPersianText ? title.slice(0, 160) : null,
    sku,
    price,
    currency,
    extraction_note: price && currency
      ? "قیمت و ارز از متن PDF پیشنهادی استخراج شده‌اند؛ پیش از انتشار بررسی کنید."
      : "اطلاعات قیمت یا ارز به‌طور مطمئن تشخیص داده نشد؛ پیش از انتشار تکمیل کنید.",
  };
}

export async function extractProductsFromTextPdf(data: Uint8Array) {
  const loadingTask = getDocument({ data, useSystemFonts: true });
  try {
    const document = await loadingTask.promise;
    if (document.numPages > MAX_PDF_PAGES) {
      throw new Error(`تعداد صفحه‌های فایل بیش از حد مجاز است (حداکثر ${MAX_PDF_PAGES} صفحه).`);
    }

    const products: ExtractedPdfProduct[] = [];
    let pagesWithText = 0;
    let extractedTextCharacters = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines = reconstructLines(content.items);
      extractedTextCharacters += lines.reduce((total, line) => total + line.length, 0);
      if (extractedTextCharacters > MAX_EXTRACTED_TEXT_CHARACTERS) {
        throw new Error("حجم متن استخراج‌شده بیش از حد مجاز است. فایل را به چند PDF کوچک‌تر تقسیم کنید.");
      }
      if (lines.length > 0) pagesWithText += 1;
      for (const line of lines) {
        const product = makeDraftProduct(line, pageNumber);
        if (product) products.push(product);
        if (products.length > MAX_EXTRACTED_PRODUCTS) {
          throw new Error(`تعداد ردیف‌های قابل استخراج از سقف ${MAX_EXTRACTED_PRODUCTS} بیشتر است. فایل را به چند PDF کوچک‌تر تقسیم کنید.`);
        }
      }
      page.cleanup();
    }

    if (pagesWithText === 0) {
      throw new Error("از این فایل متنی قابل استخراج پیدا نشد. احتمالاً PDF اسکن‌شده است؛ نسخهٔ متنی PDF را بارگذاری کنید.");
    }
    if (products.length === 0) {
      throw new Error("متن فایل خوانده شد، اما ردیف قابل شناسایی برای محصول پیدا نشد.");
    }
    return { pageCount: document.numPages, products };
  } finally {
    await loadingTask.destroy();
  }
}
