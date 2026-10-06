# ساینو پرشیا — سند فنی

آخرین به‌روزرسانی: ۱۴ مهر ۱۴۰۵ (۶ اکتبر ۲۰۲۶)

این سند برای کسی است که می‌خواهد کد را عوض کند. کد و پروژهٔ Supabase را همان‌طور که در این مخزن هستند شرح می‌دهد. معنی محصول برای مشتری و کارکنان در `docs/business/fa.md` است.

## پشته

| بخش | نسخه / انتخاب |
| --- | --- |
| برنامه | Next.js 16.3.5، App Router، Turbopack |
| رابط | React 19.2.8، TypeScript 5، CSS سراسری |
| داده و ورود | Supabase، `@supabase/supabase-js` نسخهٔ ۲٫۱۱۶ و `@supabase/ssr` نسخهٔ ۰٫۱۲ |
| متن PDF | `pdfjs-dist` نسخهٔ ۴٫۱۰٫۳۸، بیلد قدیمی `pdfjs-dist/legacy/build/pdf.mjs` |
| نام مستعار مسیر | `@/*` به `src/*` |

بک‌اند جدا وجود ندارد. مرورگر با کلید anon به Supabase وصل می‌شود. دو Route Handler روی سرور Next.js اجرا می‌شوند. کنترل اصلی دسترسی Row Level Security است؛ `src/proxy.ts` فقط افراد را به بخش درست می‌فرستد.

اسکریپت‌های `package.json`:

- `npm run dev` — سرور توسعه، پیش‌فرض [http://localhost:3000](http://localhost:3000)
- `npm run build` — بیلد تولید
- `npm start` — اجرای همان بیلد
- `npm run lint` — ESLint

`.env.example` را به `.env.local` کپی کنید. هم سرور توسعه و هم بیلد تولید `.env.local` را می‌خوانند.

## پیکربندی

| متغیر | کجا استفاده می‌شود |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | کلاینت مرورگر، کلاینت سرور، و Route Handler ادمین |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | کلاینت مرورگر و کلاینت سرور. دیده‌شدنش در کلاینت اشکالی ندارد. |
| `SUPABASE_SERVICE_ROLE_KEY` | فقط `POST /api/admin/agents`. از RLS عبور می‌کند. هرگز آن را در کامپوننت کلاینت import نکنید. |

`next.config.ts` دو تنظیم توسعه دارد:

- `turbopack.root` همین مخزن است تا Next.js سراغ `package-lock.json` در `E:\laragon\www` نرود.
- `allowedDevOrigins` شامل `127.0.0.1` است، چون سرور توسعه به `localhost` اعتماد دارد و مرورگر یا Laragon اغلب از IP استفاده می‌کنند.

لایهٔ ریشه `lang="fa"` و `dir="rtl"` است. متادیتا به `https://sinopersia.biz` اشاره می‌کند.

## نقشهٔ مخزن

```text
src/app/                 مسیرها، لایه‌ها، و دو Route Handler
src/components/          رابط مشترک
src/lib/supabase/        کلاینت مرورگر و سرور Supabase
src/lib/types.ts         نوع سفارش، پروفایل، تیکت و گفتگو
src/lib/shop.ts          نوع محصول فروشگاه و کمک‌تابع قیمت و عنوان
src/lib/product-pdf-extraction.ts
src/proxy.ts             هدایت بر اساس ورود (proxy در Next.js 16، جانشین middleware)
supabase/                SQLهایی که باید به ترتیب در ویرایشگر SQL سوپابیس اجرا شوند
docs/business/           کاری که محصول می‌کند
docs/technical/          همین سند
```

بیشتر صفحه‌ها کامپوننت کلاینت‌اند. `createClient()` را از `src/lib/supabase/client.ts` می‌گیرند که `createBrowserClient` است. Route Handlerها و کد سرور از `src/lib/supabase/server.ts` استفاده می‌کنند که نشست Supabase را به کوکی Next.js وصل می‌کند. اگر `setAll` داخل Server Component اجرا شود، نوشتن کوکی نادیده گرفته می‌شود؛ `src/proxy.ts` روی درخواست‌های منطبق، نشست را تازه می‌کند.

## مسیرها و اینکه چه کسی بازشان می‌کند

`src/proxy.ts` روی `/dashboard`، `/agent`، `/admin`، `/api/admin` و `/seller-centre` اجرا می‌شود. نشست و `profiles.role` را می‌خواند.

| مسیر | چه کسی وارد می‌شود |
| --- | --- |
| `/` | صفحهٔ اصلی، عمومی |
| `/shop`، `/shop/[productId]`، `/shop/cart` | عمومی. ثبت درخواست خرید به مشتری واردشده نیاز دارد. |
| `/login`، `/reset-password` | ورود عمومی |
| `/dashboard`، `/dashboard/messages`، `/dashboard/profile` | `customer` واردشده. نقش‌های دیگر به بخش خودشان می‌روند. |
| `/agent` | `agent` واردشده |
| `/admin` | `admin` واردشده |
| `/api/admin/agents` | `admin` واردشده. دیگران JSON با وضعیت ۴۰۳ می‌گیرند. |
| `/seller-centre/login`، `/seller-centre/register` | عمومی. فروشنده‌ای که ردیف `shop_sellers` دارد به `/seller-centre` می‌رود. |
| `/seller-centre`، `/products`، `/orders`، `/settings` | `seller` واردشده که ردیف `shop_sellers` هم دارد. وگرنه `/seller-centre/login` یا `/seller-centre/register`. |
| `/api/seller-centre/product-imports` | در matcher پروکسی نیست. خود مسیر، نشست و `shop_sellers` را چک می‌کند. |

بعد از ورود با رمز، `AuthCard` اگر `?next=` یک مسیر همان‌سایت باشد که با یک `/` شروع شود، همان را باز می‌کند. بدون آن، مقصد از روی `profiles.role` یکی از `/admin`، `/agent`، `/seller-centre` یا `/dashboard` است.

ثبت‌نام مشتری `supabase.auth.signUp` است و `full_name` در متادیتای کاربر می‌رود. رمز باید دست‌کم ۶ نویسه باشد. ثبت‌نام فروشنده فرم جدا دارد، رمز دست‌کم ۸ نویسه، و متادیتا `account_type: "seller"` به‌همراه `store_name`. ایمیل بازیابی رمز به `/reset-password` برمی‌گردد.

## نقش‌ها

هر حساب یک نقش دارد و در `profiles.role` ذخیره می‌شود. مقدارهای مجاز `customer`، `agent`، `admin` و `seller` هستند. یک نفر هم‌زمان دو نقش ندارد. عوض کردن این ستون، در ورود بعدی او را به بخش دیگری از برنامه می‌برد.

`src/proxy.ts` همین ستون را می‌خواند تا ببیند کدام صفحه‌ها باز می‌شوند. Row Level Security هم با `is_admin()`، `is_agent()` و `is_shop_seller()` همان ستون را می‌خواند. هر دو باید با هم جور باشند: نقشی که فقط در رابط باشد کافی نیست، و نقشی که فقط در SQL باشد باز هم توسط پروکسی هدایت می‌شود.

| نقش | خانه | حساب چطور این نقش را می‌گیرد |
| --- | --- | --- |
| `customer` | `/dashboard` | ثبت‌نام معمولی در `/login`. این مخزن آن ردیف پروفایل را درج نمی‌کند؛ پایگاه زنده باید هنگام ساخت کاربر auth، ردیف `profiles` را با `role = 'customer'` بسازد. |
| `agent` | `/agent` | ادمین حساب را با `POST /api/admin/agents` می‌سازد، یا ادمین موجود نقش را در `/admin` عوض می‌کند. API ایمیل را تأییدشده می‌سازد و `role = 'agent'` می‌نویسد. |
| `admin` | `/admin` | اولین ادمین در ویرایشگر SQL سوپابیس تعیین می‌شود. ادمین‌های بعدی از `/admin` ارتقا می‌گیرند. |
| `seller` | `/seller-centre` | ثبت‌نام در `/seller-centre/register`، مشتری واردشده که `create_shop_seller_profile` را صدا بزند، یا ادمین که نقش را seller کند. فروشنده به ردیف `shop_sellers` هم نیاز دارد. |

### ساختن اولین ادمین

برنامه نمی‌تواند اولین ادمین را بسازد. تریگر `prevent_profile_role_change` تغییر نقش را رد می‌کند اگر کاربر واردشده از قبل ادمین نباشد. ویرایشگر SQL مقدار `auth.uid()` ندارد، پس این به‌روزرسانی آنجا مجاز است:

```sql
update public.profiles
set role = 'admin'
where email = 'their-email@example.com';
```

ایمیل باید از قبل ردیف `profiles` داشته باشد. بعد از به‌روزرسانی، آن شخص دوباره وارد می‌شود و `/admin` را باز می‌کند.

### عوض کردن نقش بعد از آن

در `/admin`، زبانهٔ **کاربران و نقش‌ها** مستقیماً `profiles.role` را به‌روز می‌کند. همان تریگر این کار را فقط به این دلیل اجازه می‌دهد که فراخواننده ادمین است. گزینه‌های آن فهرست مشتری، ایجنت، ادمین و فروشنده هستند.

گذاشتن نقش `seller` تابع `ensure_shop_seller_profile` را هم اجرا می‌کند و اگر ردیف `shop_sellers` نباشد یکی می‌سازد. نام فروشگاه از نام پروفایل، بخش پیش از `@` در ایمیل، یا متن `Seller store` می‌آید.

مشتری‌ای که از قبل حساب دارد می‌تواند بدون ثبت‌نام تازه فروشنده شود: در `/seller-centre/register` نام فروشگاه را می‌فرستد. این کار `create_shop_seller_profile` را صدا می‌زند. تریگر فقط همین یک تغییر خودخدمت را اجازه می‌دهد: ردیف خودش، از `customer` به `seller`، و فقط بعد از وجود ردیف `shop_sellers`. هیچ تغییر نقش خودخدمت دیگری مجاز نیست.

`POST /api/admin/agents` فقط برای ایجنت تازه است. از کلید service-role استفاده می‌کند، کاربر auth را با `email_confirm: true` می‌سازد، بعد پروفایل را با نقش `agent` upsert می‌کند. اگر نوشتن پروفایل شکست بخورد، کاربر تازهٔ auth حذف می‌شود.

## پایگاه داده

فایل‌های `supabase/` را بعد از وجود جدول‌های اولیه، به همین ترتیب در ویرایشگر SQL سوپابیس اجرا کنید:

۱. `add-order-part-number.sql` — ستون `orders.part_number`
۲. `add-order-product-part-number.sql` — ستون `order_products.part_number`
۳. `add-order-title-en.sql` — ستون `orders.title_en`
۴. `agent-role.sql` — تخصیص ایجنت، خوانده‌شدن گفتگو، realtime، و قفل نقش
۵. `seller-centre.sql` — جدول‌های فروشگاه، نقش فروشنده، عکس محصول
۶. `product-pdf-imports.sql` — جدول‌های ورود PDF، باکت خصوصی PDF، و تابع تأیید و رد

پیش از استفاده از `/admin` باید یک پروفایل موجود را دستی ارتقا داد:

```sql
update public.profiles set role = 'admin' where email = 'admin@example.com';
```

`agent-role.sql` همین الگو را برای ارتقای ایجنت هم نشان می‌دهد. راه معمولی ساخت ایجنت بعد از آن، `POST /api/admin/agents` است.

### جدول‌هایی که این مخزن می‌سازد

`shop_sellers` — یک ردیف برای هر فروشنده. `id` برابر `auth.users.id` است و `store_name` اجباری است.

`shop_products` — ردیف کاتالوگ. `price > 0`، ارز `CNY` یا `USD`، `stock >= 0`، و `is_active` پیش‌فرض true. تریگر `updated_at` را تازه می‌کند.

`shop_product_imports` — یک PDF بارگذاری‌شده. `status` برابر `needs_review` یا `completed` است.

`shop_product_import_items` — ردیف پیش‌نویس استخراج‌شده. `review_status` برابر `pending`، `approved` یا `rejected` است. فروشنده فیلدهای فهرست را فقط وقتی ردیف `pending` است می‌تواند عوض کند.

`order_chat_reads` — زوج `(order_id, user_id)` و `last_read_at` برای نشان پیام نخوانده.

`orders.assigned_agent_id` به `profiles.id` اشاره می‌کند.

`profiles.role` محدود به `customer`، `agent`، `admin` یا `seller` است.

### جدول‌هایی که برنامه استفاده می‌کند ولی این مخزن نمی‌سازد

برنامه این جدول‌ها را می‌خواند و SQLهای بعدی آن‌ها را تغییر می‌دهند. `CREATE TABLE` اولیه‌شان در مخزن نیست. پروژهٔ تازهٔ Supabase پیش از فایل‌های بالا به همان اسکیمای پایگاه موجود نیاز دارد:

- `profiles` — `id`، `full_name`، `phone`، `address`، `postal_code`، `email`، `role`
- `orders` — `id`، `order_number`، `user_id`، `title`، `title_en`، `category`، `part_number`، `assigned_agent_id`، `quantity`، `unit`، `deadline`، `budget`، `shipping_type`، `sample_request`، `notes`، `price`، `status`، `created_at`
- `order_products` — `id`، `order_id`، `link`، `description`، `part_number`
- `order_comments` — ردیف گفتگو با `author_type` برابر `customer` یا `agent`
- `agent_messages` — یادداشت اختیاری که هنگام ذخیرهٔ قیمت ایجنت ثبت می‌شود
- `tickets` و `ticket_replies`

کلاینت هرگز `order_number` نمی‌فرستد. پایگاه باید آن را بسازد. وضعیت‌هایی که رابط ایجنت می‌نویسد رشته‌های فارسی `در انتظار بررسی`، `در حال بررسی`، `منتظر تأیید مشتری` و `تکمیل‌شده` هستند. تسویهٔ فروشگاه `category` را `فروشگاه` می‌گذارد و وضعیت نمی‌فرستد؛ پس سفارش تازهٔ فروشگاه با پیش‌فرض پایگاه شروع می‌شود.

### تابع‌ها

| تابع | چه کسی صدا می‌زند | اثر |
| --- | --- | --- |
| `is_admin()`، `is_agent()`، `is_shop_seller()` | سیاست‌ها | بررسی نقش. `security definer`. |
| `assign_order_agent(order_id, agent_id)` | ادمین واردشده | `assigned_agent_id` را می‌گذارد یا خالی می‌کند. شناسهٔ ایجنت باید نقش `agent` داشته باشد. |
| `mark_order_chat_read(order_id)` | مشتری، ایجنت مسئول، یا ادمین | `order_chat_reads.last_read_at` را upsert می‌کند. |
| `create_shop_seller_profile(store_name)` | مشتری یا فروشندهٔ واردشده | `shop_sellers` را درج یا به‌روز می‌کند و مشتری را به `seller` ارتقا می‌دهد. |
| `approve_shop_product_import_items(import_id, item_ids)` | فروشنده | پیش‌نویس‌های معتبر و pending را به `shop_products` به‌صورت فهرست فعال و بدون عکس کپی می‌کند، آن‌ها را approved می‌کند، و اگر ردیف pending نماند پرونده را completed می‌کند. |
| `reject_shop_product_import_item(item_id)` | فروشنده | یک پیش‌نویس pending را `rejected` می‌کند و اگر چیزی pending نماند پرونده را completed می‌کند. |

تریگرهایی که باید دانست:

- غیرادمین نمی‌تواند `profiles.role` را عوض کند، مگر مشتری که فروشگاه خودش را می‌سازد و به `seller` تبدیل می‌شود.
- غیرادمین نمی‌تواند `orders.assigned_agent_id` را بگذارد یا عوض کند.
- ثبت‌نام با `account_type = seller` ردیف `shop_sellers` می‌سازد و `profiles.role` را `seller` می‌کند.
- اگر نقش پروفایل `seller` شود و ردیف `shop_sellers` نباشد، یکی ساخته می‌شود؛ نام از نام، بخش محلی ایمیل، یا عبارت `Seller store` می‌آید.

## Row Level Security

RLS روی `profiles`، `orders`، `order_products`، `agent_messages`، `order_comments`، `order_chat_reads`، `shop_sellers`، `shop_products`، `shop_product_imports` و `shop_product_import_items` روشن است.

سفارش:

- مشتری سفارش خودش را می‌تواند ببیند، بسازد و به‌روز کند.
- ایجنت فقط سفارش‌هایی را می‌بیند و به‌روز می‌کند که به او سپرده شده‌اند.
- ادمین هر سفارشی را می‌بیند، به‌روز می‌کند و حذف می‌کند.
- سیاست‌های موجود در مخزن به مشتری `DELETE` روی `orders` نمی‌دهند.

ردیف‌های کالا از سفارش والد پیروی می‌کنند. مشتری می‌تواند `order_products` سفارش خودش را درج و حذف کند.

گفتگو:

- مشتری روی سفارش خودش `order_comments` را با `author_type = customer` درج می‌کند.
- ایجنت مسئول یا ادمین با `author_type = agent` درج می‌کند.
- خواندن برای مشتری، ایجنت مسئول، یا ادمین است.
- `agent_messages` را ایجنت مسئول یا ادمین درج می‌کند و مشتری، همان ایجنت، یا ادمین می‌خواند.

فروشگاه:

- هر کس، از جمله بازدیدکنندهٔ ناشناس، `shop_products` را وقتی `is_active` true است می‌بیند. فروشنده محصول متوقف‌شدهٔ خودش را هم می‌بیند.
- فقط همان فروشنده می‌تواند محصولش را درج، به‌روز یا حذف کند، و فقط اگر `profiles.role` برابر `seller` باشد و ردیف `shop_sellers` وجود داشته باشد.
- فروشنده `shop_sellers.store_name` خودش را می‌خواند و به‌روز می‌کند.
- پرونده و پیش‌نویس ورود فقط برای فروشندهٔ مالک دیده می‌شود.

سیاست‌های realtime روی `realtime.messages` به broadcast و presence اجازه می‌دهند اگر موضوع `chat-inbox:<شناسه کاربر>` یا `<شناسه سفارش>:<…>` باشد و فراخواننده مشتری، ایجنت مسئول، یا ادمین باشد. `order_comments` و `order_chat_reads` به انتشار `supabase_realtime` اضافه شده‌اند.

## فضای ذخیره‌سازی

| باکت | عمومی | سقف | استفاده‌کننده |
| --- | --- | --- | --- |
| `shop-product-images` | بله | در SQL سقف حجم ندارد. رابط فروشنده فایل بالای ۵ مگابایت را رد می‌کند. | عکس محصول فروشنده. مسیر با شناسهٔ کاربر فروشنده شروع می‌شود. |
| `shop-product-imports` | خیر | ۱۲٬۵۸۲٬۹۱۲ بایت، فقط PDF | اصل کاتالوگ بارگذاری‌شده. مسیر `<شناسه فروشنده>/<شناسه ورود>.pdf` است. |
| `product-images` | فرم سفارش مشتری آن را عمومی فرض می‌کند | رابط فایل بالای ۵ مگابایت را رد می‌کند. | عکس سفارش مشتری. مسیر `<شناسه کاربر>/<شناسه سفارش>-…` است. |

هیچ فایل SQL این مخزن باکت `product-images` را نمی‌سازد. تا وقتی آن باکت نباشد، آپلود عکس مشتری در `OrderModal` با همان پیام خطا شکست می‌خورد.

## مسیرهای سرور

### `POST /api/admin/agents`

بدنه: `{ name, email, password }`. رمز باید دست‌کم ۶ نویسه باشد.

هندلر با کلاینت anon سرور، نشست و `profiles.role = admin` را چک می‌کند، بعد با کلاینت service-role کاربر را با `auth.admin.createUser` و `email_confirm: true` می‌سازد و `profiles` را با نقش `agent` upsert می‌کند. اگر نوشتن پروفایل شکست بخورد، کاربر تازهٔ auth را حذف می‌کند.

پاسخ‌ها: `401` بدون ورود، `403` غیرادمین، `400` ورودی بد یا خطای auth سوپابیس، `500` نبودن کلید سرویس یا شکست پروفایل. موفقیت `{ id, email, name }` برمی‌گرداند.

### `POST /api/seller-centre/product-imports`

`runtime = "nodejs"`. فیلد multipart به نام `file`.

به ترتیب چک می‌کند: کاربر واردشده، ردیف `shop_sellers`، طول اعلام‌شده، وجود فایل، حجم بین ۱ بایت و ۱۲ مگابایت، سرآیند `%PDF-`، سپس استخراج متن. PDF فقط بعد از درج ردیف پرونده ذخیره می‌شود. اگر ذخیره یا درج پیش‌نویس شکست بخورد، هندلر پروندهٔ ناقص و در صورت نیاز خود فایل را پاک می‌کند.

موفقیت `201` است با `{ batch, items }`. ردیف‌های پیش‌نویس با دستهٔ `Other`، `review_status` برابر `pending`، و موجودی null شروع می‌شوند. اینجا چیزی منتشر نمی‌شود.

سقف‌های استخراج در `src/lib/product-pdf-extraction.ts`:

- حداکثر ۶۰ صفحه
- حداکثر ۴۰۰ پیش‌نویس محصول
- حداکثر ۱٬۰۰۰٬۰۰۰ نویسهٔ استخراج‌شده
- صفحه‌ای که متن ندارد کل فایل را به‌عنوان اسکن محتمل رد می‌کند
- یک خط فقط وقتی پیش‌نویس می‌شود که بعد از حذف قیمت و SKU هنوز دست‌کم دو حرف داشته باشد
- تشخیص قیمت به دنبال CNY، RMB، USD، ¥ یا $ می‌گردد
- تشخیص SKU به دنبال برچسب‌هایی مثل SKU، شمارهٔ کالا، شمارهٔ فنی یا مدل می‌گردد

فروشنده پیش‌نویس‌ها را در مرکز فروشنده می‌بیند و از مرورگر `approve_shop_product_import_items` یا `reject_shop_product_import_item` را صدا می‌زند. محصول تأییدشده بدون عکس منتشر می‌شود.

## سبد فروشگاه

`ShopCartProvider` آرایهٔ `{ productId, quantity }` را در `localStorage` با کلید `sino-persia-shop-cart` نگه می‌دارد. تعداد نمی‌تواند از موجودی‌ای که هنگام افزودن معلوم بوده بیشتر شود. تسویه محصول‌های فعال را دوباره می‌خواند، ردیف گم‌شده یا بیش از موجودی را رد می‌کند، و یک ردیف `orders` به‌همراه یک ردیف `order_products` برای هر قلم می‌سازد. `shop_products.stock` را کم نمی‌کند. سبد بعد از درج سفارش پاک می‌شود، حتی اگر درج ردیف‌ها شکست بخورد؛ در آن حالت متن اقلام فقط در `orders.notes` می‌ماند.

## گفتگوی realtime

`ChatPanel` ۵۰ `order_comments` آخر یک سفارش را می‌خواند، با `mark_order_chat_read` گفتگو را خوانده‌شده علامت می‌زند، و به یک کانال خصوصی برای نظر تازه، در حال نوشتن، حضور، و رسید خواندن وصل می‌شود. صف ایجنت و صندوق مشتری هم به `chat-inbox:<شناسه کاربر>` برای `INSERT` روی `order_comments` وصل می‌شوند تا شمار نخوانده‌ها بدون بارگذاری دوباره تازه شود.

## فاصلهٔ رابط و پایگاه

- کارت سفارش مشتری دکمهٔ حذف دارد. RLS موجود در مخزن حذف را فقط به ادمین می‌دهد، پس حذف مشتری شکست می‌خورد مگر سیاست قدیمی بیرون از این مخزن هنوز اجازه بدهد.
- دکمهٔ دانلود روی کارت سفارش مشتری فقط یک هشدار نشان می‌دهد و فایلی نمی‌سازد.
- صفحهٔ ایجنت همهٔ سفارش‌ها را query می‌کند. RLS فقط سفارش‌های سپرده‌شده به همان ایجنت را برمی‌گرداند، پس سفارش بدون ایجنت تا زمان انتخاب، فقط در صفحهٔ ادمین می‌ماند.
- `/orders` مرکز فروشنده حالت خالی است. تسویهٔ فروشگاه یک ردیف `orders` برای مشتری می‌سازد، نه سفارش فروشنده.
- تسویهٔ فروشگاه موجودی را عوض نمی‌کند.

## به‌روز ماندن این سند

هر وقت راه‌اندازی، مسیر، ورود، اسکیما، ذخیره‌سازی یا رفتار سرور عوض شد، این فایل را همراه `docs/technical/en.md` در همان تغییر به‌روز کنید. دو زبان باید یک سیستم را توصیف کنند.
