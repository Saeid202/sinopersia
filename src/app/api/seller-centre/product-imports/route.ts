import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractProductsFromTextPdf } from "@/lib/product-pdf-extraction";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 12 * 1024 * 1024;
const PDF_BUCKET = "shop-product-imports";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) return NextResponse.json({ error: "احراز هویت انجام نشد. دوباره وارد شوید." }, { status: 401 });
  if (!user) return NextResponse.json({ error: "برای واردکردن محصول ابتدا وارد حساب فروشنده شوید." }, { status: 401 });

  const { data: seller, error: sellerError } = await supabase.from("shop_sellers").select("id").eq("id", user.id).maybeSingle();
  if (sellerError) return NextResponse.json({ error: `بررسی حساب فروشنده انجام نشد: ${sellerError.message}` }, { status: 500 });
  if (!seller) return NextResponse.json({ error: "این بخش فقط برای حساب فروشنده در دسترس است." }, { status: 403 });

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_PDF_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: "حجم فایل بیش از حد مجاز است (حداکثر ۱۲ مگابایت)." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطای نامشخص";
    return NextResponse.json({ error: `فرم بارگذاری PDF قابل خواندن نیست: ${message}` }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "فایل PDF انتخاب نشده است." }, { status: 400 });
  if (file.size === 0 || file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "حجم فایل باید بیشتر از صفر و حداکثر ۱۲ مگابایت باشد." }, { status: 413 });
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطای نامشخص";
    return NextResponse.json({ error: `خواندن فایل PDF انجام نشد: ${message}` }, { status: 400 });
  }
  const signature = new TextDecoder().decode(bytes.subarray(0, 5));
  if (signature !== "%PDF-") return NextResponse.json({ error: "فایل انتخاب‌شده PDF معتبر نیست." }, { status: 415 });

  let extraction: Awaited<ReturnType<typeof extractProductsFromTextPdf>>;
  try {
    extraction = await extractProductsFromTextPdf(bytes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "استخراج متن PDF انجام نشد.";
    console.error("Product PDF text extraction failed:", error);
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const importId = randomUUID();
  const safeFilename = file.name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 160) || "products.pdf";
  const storagePath = `${user.id}/${importId}.pdf`;
  const { error: batchError } = await supabase.from("shop_product_imports").insert({
    id: importId,
    seller_id: user.id,
    source_filename: safeFilename,
    storage_path: storagePath,
    status: "needs_review",
    page_count: extraction.pageCount,
    item_count: extraction.products.length,
  });
  if (batchError) {
    return NextResponse.json({ error: `ثبت پروندهٔ ورود انجام نشد: ${batchError.message}` }, { status: 500 });
  }

  const { error: uploadError } = await supabase.storage.from(PDF_BUCKET).upload(storagePath, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploadError) {
    const { error: cleanupError } = await supabase.from("shop_product_imports").delete().eq("id", importId).eq("seller_id", user.id);
    const cleanupNote = cleanupError ? ` پاک‌سازی پروندهٔ ناقص نیز ناموفق بود: ${cleanupError.message}` : "";
    return NextResponse.json({ error: `ذخیرهٔ امن PDF انجام نشد: ${uploadError.message}.${cleanupNote}` }, { status: 500 });
  }

  const draftRows = extraction.products.map((product) => ({
    import_id: importId,
    seller_id: user.id,
    ...product,
    category: "Other",
    description_en: null,
    description_fa: null,
    stock: null,
    review_status: "pending",
  }));
  const { data: items, error: itemsError } = await supabase.from("shop_product_import_items").insert(draftRows).select("*");
  if (itemsError) {
    const { error: storageCleanupError } = await supabase.storage.from(PDF_BUCKET).remove([storagePath]);
    const { error: batchCleanupError } = await supabase.from("shop_product_imports").delete().eq("id", importId).eq("seller_id", user.id);
    const cleanupNote = storageCleanupError || batchCleanupError
      ? ` پاک‌سازی فایل/پروندهٔ ناقص انجام نشد: ${storageCleanupError?.message || batchCleanupError?.message}`
      : "";
    return NextResponse.json({ error: `ذخیرهٔ ردیف‌های استخراج‌شده انجام نشد: ${itemsError.message}.${cleanupNote}` }, { status: 500 });
  }

  return NextResponse.json({
    batch: {
      id: importId,
      source_filename: safeFilename,
      status: "needs_review",
      page_count: extraction.pageCount,
      item_count: extraction.products.length,
      created_at: new Date().toISOString(),
    },
    items,
  }, { status: 201 });
}
