# Sino Persia — Technical documentation

Last updated: 9 October 2026

This document is for people changing the app. It describes the code and the Supabase project as they exist in this repository. What the product means for customers and staff is in `docs/business/en.md`.

## Stack

| Piece | Version / choice |
| --- | --- |
| App | Next.js 16.3.5, App Router, Turbopack |
| UI | React 19.2.8, TypeScript 5, global CSS |
| Data and auth | Supabase, `@supabase/supabase-js` 2.116 and `@supabase/ssr` 0.12 |
| PDF text | `pdfjs-dist` 4.10.38, legacy build `pdfjs-dist/legacy/build/pdf.mjs` |
| Path alias | `@/*` → `src/*` |

There is no separate backend. The browser talks to Supabase with the anon key. Route Handlers run on the Next.js server. Row Level Security is the main access control; `src/proxy.ts` only redirects people to the right area.

Scripts in `package.json`:

- `npm run dev` — development server, default [http://localhost:3000](http://localhost:3000)
- `npm run build` — production build
- `npm start` — serve that build
- `npm run lint` — ESLint

Copy `.env.example` to `.env.local`. The dev server and the production build both read `.env.local`.

## Configuration

| Variable | Where it is used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser client, server client, and the admin Route Handler |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser client and server client. Safe to expose. |
| `SUPABASE_SERVICE_ROLE_KEY` | Only `POST /api/admin/agents`. Bypasses RLS. Never import it into a client component. |

`next.config.ts` sets two development options:

- `turbopack.root` is this repository, so Next.js does not walk up to a `package-lock.json` in `E:\laragon\www`.
- `allowedDevOrigins` includes `127.0.0.1`, because the dev server trusts `localhost` and browsers or Laragon often use the IP instead.

The root layout sets `lang="fa"` and `dir="rtl"`. Metadata points at `https://sinopersia.biz`.

## Repository map

```text
src/app/                 routes, layouts, and the two Route Handlers
src/components/          shared UI
src/lib/supabase/        browser and server Supabase clients
src/lib/types.ts         order, profile, ticket, and chat types
src/lib/shop.ts          shop product types and price/title helpers
src/lib/product-pdf-extraction.ts
src/proxy.ts             auth redirects (Next.js 16 proxy, formerly middleware)
supabase/                SQL to apply in the Supabase SQL editor, in order
docs/business/           what the product does
docs/technical/          this document
```

Most pages are client components. They call `createClient()` from `src/lib/supabase/client.ts`, which uses `createBrowserClient`. Route Handlers and any server code use `src/lib/supabase/server.ts`, which binds the Supabase session to Next.js cookies. If `setAll` runs inside a Server Component, the cookie write is ignored; `src/proxy.ts` refreshes the session on matched requests.

## Routes and who may open them

`src/proxy.ts` runs on `/dashboard`, `/agent`, `/admin`, `/api/admin`, and `/seller-centre`. It loads the session and `profiles.role`.

| Path | Who gets in |
| --- | --- |
| `/` | Public landing page |
| `/contact` | Public. Saves a row in `contact_messages`. |
| `/shop`, `/shop/[productId]`, `/shop/cart` | Public. Paying the cart requires a signed-in customer. |
| `/payment/result` | Public. The bank callback lands here after verify. |
| `/api/shop/checkout` | Signed-in customer. Computes the rial total and starts a gateway transaction. |
| `/api/payments/gateways` | Public. Enabled gateways only: code, name, and whether sandbox is on. No keys. |
| `/api/payments/callback/[gateway]` | Public. The bank calls this. It is not behind the proxy. |
| `/login`, `/reset-password` | Public auth |
| `/dashboard`, `/dashboard/messages`, `/dashboard/profile` | Signed-in `customer`. Other roles are redirected to their own area. |
| `/agent` | Signed-in `agent` |
| `/admin` | Signed-in `admin` |
| `/admin/products` | Signed-in `admin`. Category list and every shop product. |
| `/api/admin/agents` | Signed-in `admin`. Others receive JSON 403. |
| `/api/rates` | Public. Live dollar and yuan rates in rials. |
| `/seller-centre/login`, `/seller-centre/register` | Public. A seller who already has a `shop_sellers` row is sent to `/seller-centre`. |
| `/seller-centre`, `/products`, `/orders`, `/settings` | Signed-in `seller` who also has a `shop_sellers` row. Otherwise `/seller-centre/login` or `/seller-centre/register`. |
| `/api/seller-centre/product-imports` | Not covered by the proxy matcher. The route checks the session and `shop_sellers` itself. |
| `/api/seller-centre/product-fx` | Signed-in seller. Writes the saved rial snapshot. |

After password login, `AuthCard` honors a same-origin `?next=` path that starts with a single `/`. Without it, the destination is `/admin`, `/agent`, `/seller-centre`, or `/dashboard` from `profiles.role`.

Customer registration is `supabase.auth.signUp` with `full_name` in user metadata. The password must be at least 6 characters. Seller registration uses a separate form, password at least 8 characters, and metadata `account_type: "seller"` plus `store_name`. Password reset emails redirect to `/reset-password`.

## Roles

Every account has one role, stored in `profiles.role`. The allowed values are `customer`, `agent`, `admin`, and `seller`. A person cannot hold two roles at once. Changing the column moves them into a different area of the app on the next sign-in.

`src/proxy.ts` reads this column to decide which pages open. Row Level Security reads the same column through `is_admin()`, `is_agent()`, and `is_shop_seller()`. Both checks have to agree: a role that only exists in the UI is not enough, and a role that only exists in SQL still gets redirected by the proxy.

| Role | Home | How the account gets this role |
| --- | --- | --- |
| `customer` | `/dashboard` | Normal registration at `/login`. This repository does not insert that profile row; the live database must create `profiles` with `role = 'customer'` when the auth user is created. |
| `agent` | `/agent` | An admin creates the account with `POST /api/admin/agents`, or an existing admin changes the role in `/admin`. The API confirms the email and writes `role = 'agent'`. |
| `admin` | `/admin` | The first admin is set in the Supabase SQL Editor. Later admins are promoted from `/admin`. |
| `seller` | `/seller-centre` | Registration at `/seller-centre/register`, a signed-in customer calling `create_shop_seller_profile`, or an admin setting the role to seller. A seller also needs a `shop_sellers` row. |

### Making the first admin

The app cannot create the first admin. The trigger `prevent_profile_role_change` rejects a role change when the signed-in user is not already an admin. The SQL Editor has no `auth.uid()`, so this update is allowed there:

```sql
update public.profiles
set role = 'admin'
where email = 'their-email@example.com';
```

The email must already belong to a `profiles` row. After the update, that person signs in again and opens `/admin`.

### Changing a role later

On `/admin`, the **Users and roles** tab updates `profiles.role` directly. The same trigger allows it only because the caller is an admin. Choices in that dropdown are customer, agent, admin, and seller.

Setting the role to `seller` also runs `ensure_shop_seller_profile`, which inserts a `shop_sellers` row when one is missing. The store name falls back to the profile name, the part of the email before `@`, or the text `Seller store`.

A customer who already has an account can become a seller without a new login by submitting a store name at `/seller-centre/register`. That calls `create_shop_seller_profile`. The trigger allows this one self-service change: their own row, from `customer` to `seller`, and only after the `shop_sellers` row exists. No other self-service role change is allowed.

`POST /api/admin/agents` is only for a new agent. It uses the service-role key, creates the auth user with `email_confirm: true`, then upserts the profile as `agent`. If the profile write fails, the new auth user is deleted.

## Database

Apply the files in `supabase/` in the Supabase SQL editor in this order, after the original tables already exist:

1. `add-order-part-number.sql` — `orders.part_number`
2. `add-order-product-part-number.sql` — `order_products.part_number`
3. `add-order-title-en.sql` — `orders.title_en`
4. `agent-role.sql` — agent assignment, chat reads, realtime, role protection
5. `seller-centre.sql` — shop tables, seller role, product images
6. `product-pdf-imports.sql` — PDF import tables, private PDF bucket, approve/reject functions
7. `contact-messages.sql` — public contact form, admin read and mark-as-read. Run after `agent-role.sql`
8. `seller-orders.sql` — shop line columns on `order_products` and `seller_shop_order_lines()`. Run after `seller-centre.sql`
9. `payment-gateways.sql` — gateway settings, transactions, and `next_payment_order_id()`
10. `product-rial.sql` — saved rial snapshot columns and `apply_shop_product_rial()`. Run after `seller-centre.sql`
11. `shop-categories.sql` — shop category list, and admin access to every product and store name. Run after `agent-role.sql` and `seller-centre.sql`

Before `/admin` can be used, one existing profile must be promoted by hand:

```sql
update public.profiles set role = 'admin' where email = 'admin@example.com';
```

`agent-role.sql` also shows the same pattern for promoting an agent. The normal way to create an agent after that is `POST /api/admin/agents`.

### Tables this repository creates

`shop_sellers` — one row per seller, `id` equals `auth.users.id`, `store_name` required.

`shop_categories` — the category list. `name_en` and `name_fa` are both required and unique. `shop_products.category` stores `name_en`. Run `supabase/shop-categories.sql` once in the SQL editor. Renaming `name_en` rewrites products that use the old name. A category that still has products cannot be deleted. Until that file is run, the seller form keeps the original fixed list.

`contact_messages` — one public contact submission. `status` is `جدید` or `خوانده‌شده`. Anyone, signed in or not, can insert a row with status `جدید`. Only an admin can select rows or change the status to read. Run `supabase/contact-messages.sql` once.

`shop_products` — catalogue row. `price > 0`, `currency` is `CNY` or `USD`, `stock >= 0`, `is_active` defaults to true. `updated_at` is maintained by a trigger. `fx_rate_irr`, `price_irr`, and `fx_quoted_at` store the market conversion at the moment the product is saved. They are filled by `POST /api/seller-centre/product-fx`, which reads the current board once and writes every selected row in one database call. Run `supabase/product-rial.sql` once in the SQL editor before that route can write.

`shop_product_imports` — one uploaded PDF. `status` is `needs_review` or `completed`.

`shop_product_import_items` — extracted draft rows. `review_status` is `pending`, `approved`, or `rejected`. Sellers may update the listing fields only while the row is `pending`.

`order_chat_reads` — `(order_id, user_id)` and `last_read_at`, used for unread badges.

`orders.assigned_agent_id` references `profiles.id`.

`profiles.role` is constrained to `customer`, `agent`, `admin`, or `seller`.

### Tables the app uses but this repository does not create

These tables are queried by the app and altered by later SQL. Their original `CREATE TABLE` is not in the repo, so a new Supabase project needs that schema from the existing database before the files above will apply:

- `profiles` — `id`, `full_name`, `phone`, `address`, `postal_code`, `email`, `role`
- `orders` — `id`, `order_number`, `user_id`, `title`, `title_en`, `category`, `part_number`, `assigned_agent_id`, `quantity`, `unit`, `deadline`, `budget`, `shipping_type`, `sample_request`, `notes`, `price`, `status`, `created_at`
- `order_products` — `id`, `order_id`, `link`, `description`, `part_number`. `seller-orders.sql` also adds `shop_product_id`, `quantity`, `unit_price`, and `currency` so a shop line can be tied to the seller's product.
- `order_comments` — chat rows with `author_type` of `customer` or `agent`
- `agent_messages` — optional note stored when an agent saves a quote
- `tickets` and `ticket_replies`

The client never sends `order_number`. The database must generate it. Status values written by the agent UI are the Persian strings `در انتظار بررسی`, `در حال بررسی`, `منتظر تأیید مشتری`, and `تکمیل‌شده`. Shop checkout writes `category` `فروشگاه` and does not set a status, so the database default is what the new shop order starts as.

### Functions

| Function | Who can call it | Effect |
| --- | --- | --- |
| `is_admin()`, `is_agent()`, `is_shop_seller()` | Policies | Role checks. `security definer`. |
| `assign_order_agent(order_id, agent_id)` | Authenticated admin | Sets or clears `assigned_agent_id`. The agent id must have role `agent`. |
| `mark_order_chat_read(order_id)` | Customer, assigned agent, or admin | Upserts `order_chat_reads.last_read_at`. |
| `create_shop_seller_profile(store_name)` | Signed-in customer or seller | Inserts or updates `shop_sellers` and promotes a customer to `seller`. |
| `approve_shop_product_import_items(import_id, item_ids)` | Seller | Copies valid pending drafts into `shop_products` as active listings with no image, marks them approved, and completes the import when no pending rows remain. |
| `reject_shop_product_import_item(item_id)` | Seller | Marks one pending draft `rejected` and completes the import when nothing is left pending. |
| `seller_shop_order_lines()` | Signed-in seller | Returns shop order lines whose product belongs to that seller. `security definer`. Granted to `authenticated`. |

Triggers worth knowing:

- A non-admin cannot change `profiles.role`, except a customer becoming `seller` for their own new store.
- A non-admin cannot set or change `orders.assigned_agent_id`.
- Signing up with `account_type = seller` inserts `shop_sellers` and sets `profiles.role` to `seller`.
- Setting a profile role to `seller` creates a `shop_sellers` row if one is missing, using the name, the email local-part, or `Seller store`.

## Row Level Security

RLS is enabled on `profiles`, `orders`, `order_products`, `agent_messages`, `order_comments`, `order_chat_reads`, `shop_sellers`, `shop_products`, `shop_categories`, `contact_messages`, `shop_product_imports`, and `shop_product_import_items`.

Orders:

- A customer can select, insert, and update their own orders.
- An agent can select and update only orders assigned to them.
- An admin can select, update, and delete any order.
- The checked-in policies do not grant customers `DELETE` on `orders`.

Order lines follow the parent order. Customers can insert and delete `order_products` on their own orders.

Chat:

- Customers insert `order_comments` with `author_type = customer` on their own orders.
- An assigned agent or an admin inserts with `author_type = agent`.
- Read access is the customer, the assigned agent, or an admin.
- `agent_messages` can be inserted by the assigned agent or an admin, and read by the customer, that agent, or an admin.

Shop:

- Anyone, including anonymous visitors, can select `shop_products` where `is_active` is true. A seller can also select their own paused products. An admin can select every product, including paused ones, after `shop-categories.sql`.
- Only that seller can insert, update, or delete their products, and only if `profiles.role` is `seller` and a `shop_sellers` row exists. An admin can update or delete any product after `shop-categories.sql`.
- A seller can read and update their own `shop_sellers.store_name`. An admin can read every store name after `shop-categories.sql`.
- Anyone can read `shop_categories`. Only an admin can insert, update, or delete a category.
- Import batches and drafts are visible only to the owning seller.

Realtime policies on `realtime.messages` allow broadcast and presence for a topic `chat-inbox:<user id>` or `<order id>:<…>` when the caller is the customer, the assigned agent, or an admin. `order_comments` and `order_chat_reads` are added to the `supabase_realtime` publication.

## Storage

| Bucket | Public | Limit | Used by |
| --- | --- | --- | --- |
| `shop-product-images` | Yes | Created without a size cap in SQL. The seller UI rejects files over 5 MB. | Seller product photos. Path starts with the seller user id. |
| `shop-product-imports` | No | 12,582,912 bytes, PDF only | Original uploaded catalogues. Path is `<seller id>/<import id>.pdf`. |
| `product-images` | Expected public by the customer order form | The UI rejects files over 5 MB. | Customer order photos. Path is `<user id>/<order id>-….`. |

`product-images` is not created by any SQL file in this repository. Until that bucket exists, customer photo upload fails with the message shown in `OrderModal`.

## Server routes

### `POST /api/admin/agents`

Body: `{ name, email, password }`. Password must be at least 6 characters.

The handler checks the session and `profiles.role = admin` with the anon server client, then uses the service-role client to `auth.admin.createUser` with `email_confirm: true` and to upsert `profiles` as `agent`. If the profile write fails, it deletes the new auth user.

Responses: `401` unauthenticated, `403` not admin, `400` bad input or Supabase auth error, `500` missing service key or profile failure. Success returns `{ id, email, name }`.

### `POST /api/seller-centre/product-imports`

`runtime = "nodejs"`. Multipart field `file`.

Checks, in order: signed-in user, a `shop_sellers` row, declared length, file present, size between 1 byte and 12 MB, header `%PDF-`, then text extraction. The PDF is stored only after the import row is inserted. If storage or draft insert fails, the handler deletes the partial import and, when needed, the uploaded object.

Success is `201` with `{ batch, items }`. Draft rows start as category `Other`, `review_status` `pending`, and null stock. Nothing is published here.

Extraction limits in `src/lib/product-pdf-extraction.ts`:

- at most 60 pages
- at most 400 draft products
- at most 1,000,000 extracted characters
- a page with no text fails the whole file as a likely scan
- a line becomes a draft only if it still contains at least two letters after price and SKU removal
- price detection looks for CNY, RMB, USD, ¥, or $
- SKU detection looks for labels such as SKU, item number, part number, or model

The seller reviews drafts in Seller Centre and calls `approve_shop_product_import_items` or `reject_shop_product_import_item` from the browser. Approved products are published without an image.

### `GET /api/rates`

Public. No session.

`src/lib/rates.ts` requests `https://call5.tgju.org/ajax.json` and, if that fails, `https://call1.tgju.org/ajax.json`. It reads `current.price_dollar_rl` and `current.price_cny`. Both prices are rials, as that board publishes them. The server keeps the last successful board for 60 seconds. If a later fetch fails and a board is already cached, that board is returned. If nothing has been fetched yet, the route responds `503`.

The body is `{ usd, cny, fetchedAt }`. Each quote has `price`, `change` (percent), `direction` (`high`, `low`, or `flat`), and `updatedAt`. `updatedAt` is the market's own last change, so an unchanged price keeps the same clock. Each upstream request adds a fresh query so the source's five-minute cache is not reused. The route responds with `Cache-Control: no-store`. `ExchangeRates` is a bar fixed to the top of `/`, `/contact`, and every `/shop` page, above the header, and asks again every 60 seconds.

## Payments

`supabase/payment-gateways.sql` creates `payment_gateways` and `payment_transactions`, plus `next_payment_order_id()`. Run it once in the Supabase SQL Editor. Both tables have RLS on and no policies; `anon` and `authenticated` cannot read them. The service role writes them.

Gateways are a strategy in `src/lib/payments/`: `ZarinpalGateway` and `MellatGateway`, registered in `registry.ts`. Amounts are integer rials. An admin enables a gateway, stores its keys, and can leave it in sandbox, from the admin tab درگاه پرداخت. `GET /api/admin/payment-gateways` returns masked secrets. `PUT` keeps a stored secret when the field is sent empty. `GET /api/admin/payments` lists the latest 1,000 transactions. On the payment report, and on the users, sourcing orders, shop purchases, and contact-message tables, the browser filters the loaded rows, shows 10 per page, and downloads the matching rows as a SpreadsheetML `.xls` file.

`POST /api/shop/checkout` is the shop path. The body is `{ gatewayCode, lines: [{ productId, quantity }] }`. It does not accept an amount. It reloads active `shop_products`, rejects a missing or over-stock line, loads the rate board with `loadRates()`, and sums `rialAmount`. It inserts one `orders` row with category `فروشگاه` and `price` set to that rial total, then one `order_products` row per line. `startPayment` inserts a `pending` `payment_transactions` row and returns the bank redirect. Zarinpal is a GET redirect. Mellat is a POST of `RefId`. The browser clears the cart only after that payload arrives. If the gateway request fails, the new order and its lines are deleted. The failed transaction row stays. Checkout does not change `shop_products.stock`. Shipping is not added to the amount.

`GET` and `POST /api/payments/callback/[gateway]` call `completePayment`. Status `OK` is verified with the gateway. Mellat is verified and then settled. A successful result is `paid` or `verified`, and the tracking number is appended to `orders.notes`. The browser is redirected to `/payment/result`. `POST /api/payments/request` still accepts a client-supplied amount for a signed-in user. The shop cart does not call it.

## Shop cart

`ShopCartProvider` stores `{ productId, quantity }[]` in `localStorage` under `sino-persia-shop-cart`. Quantities cannot exceed the stock known when the item was added. The cart lists enabled gateways from `GET /api/payments/gateways` and posts the selected code plus the lines to `POST /api/shop/checkout`. The rial figure on screen uses the same cached board. The charged amount is the one the server computes at checkout.

## Customer dashboard

`/dashboard` loads the signed-in customer's `orders`. Rows with `category` `فروشگاه` are the خرید فروشگاه tab. Every other row is the ثبت سفارش tab. Counts are calculated inside the open tab. The new-order form is only on the sourcing tab, and a shop purchase is not passed to that form.

## Admin catalogue

`/admin/products` has two tabs. دسته‌بندی‌ها creates, renames, and deletes `shop_categories` through the signed-in admin's Supabase client. محصولات lists every `shop_products` row, including paused ones, with the store name from `shop_sellers`. The admin can edit `title_en`, `title_fa`, `category`, `sku`, `price`, `currency`, and `stock`, set `is_active`, or delete the row. Those writes need the policies in `shop-categories.sql`. The seller form and the shop category labels read `shop_categories` when that table exists.

## Admin tables

Users, sourcing orders, shop purchases, and contact messages on `/admin`, plus the payment report in `AdminPaymentPanel`, share `src/components/AdminTableControls.tsx`. Search and the filter run in the browser on the rows already loaded. Each page shows 10 rows. `src/lib/excel.ts` downloads the filtered rows, across every page, as a SpreadsheetML `.xls` file. Filters are role for users, status for sourcing orders and shop purchases, `جدید` or `خوانده‌شده` for messages, and status, gateway, and sandbox or live for payments. `GET /api/admin/payments` still returns only the latest 1,000 transactions, so the report cannot export older rows.

The agent page loads assigned orders and then drops rows whose `category` is `فروشگاه`.

## Realtime chat

`ChatPanel` loads the latest 50 `order_comments` for an order, marks the chat read with `mark_order_chat_read`, and subscribes to a private channel for new comments, typing, presence, and read receipts. The agent queue and the customer inbox also subscribe to `chat-inbox:<user id>` for `INSERT` on `order_comments` so unread counts update without a reload.

## Gaps between the UI and the database

- The customer order card offers delete. Checked-in RLS allows delete only for admins, so a customer delete fails unless an older policy outside this repo still grants it.
- The customer order card's download button only shows an alert. It does not build a file.
- The agent screen queries every order, then hides rows whose category is `فروشگاه`. RLS returns only orders assigned to that agent, so unassigned sourcing orders stay on the admin screen until an agent is chosen.
- Seller Centre `/orders` calls `seller_shop_order_lines()` and shows only that seller's shop lines. Until `seller-orders.sql` is applied, the page asks for that file. The seller cannot update the order there.
- Shop checkout does not change stock.

## Keeping this document current

Change the code and this file together with `docs/technical/fa.md` whenever setup, routes, auth, schema, storage, or server behavior changes. The two languages must describe the same system.
