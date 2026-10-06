# Sino Persia — Technical documentation

Last updated: 6 October 2026

This document is for people changing the app. It describes the code and the Supabase project as they exist in this repository. What the product means for customers and staff is in `docs/business/en.md`.

## Stack

| Piece | Version / choice |
| --- | --- |
| App | Next.js 16.3.5, App Router, Turbopack |
| UI | React 19.2.8, TypeScript 5, global CSS |
| Data and auth | Supabase, `@supabase/supabase-js` 2.116 and `@supabase/ssr` 0.12 |
| PDF text | `pdfjs-dist` 4.10.38, legacy build `pdfjs-dist/legacy/build/pdf.mjs` |
| Path alias | `@/*` → `src/*` |

There is no separate backend. The browser talks to Supabase with the anon key. Two Route Handlers run on the Next.js server. Row Level Security is the main access control; `src/proxy.ts` only redirects people to the right area.

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
| `/shop`, `/shop/[productId]`, `/shop/cart` | Public. Checkout requires a signed-in customer. |
| `/login`, `/reset-password` | Public auth |
| `/dashboard`, `/dashboard/messages`, `/dashboard/profile` | Signed-in `customer`. Other roles are redirected to their own area. |
| `/agent` | Signed-in `agent` |
| `/admin` | Signed-in `admin` |
| `/api/admin/agents` | Signed-in `admin`. Others receive JSON 403. |
| `/seller-centre/login`, `/seller-centre/register` | Public. A seller who already has a `shop_sellers` row is sent to `/seller-centre`. |
| `/seller-centre`, `/products`, `/orders`, `/settings` | Signed-in `seller` who also has a `shop_sellers` row. Otherwise `/seller-centre/login` or `/seller-centre/register`. |
| `/api/seller-centre/product-imports` | Not covered by the proxy matcher. The route checks the session and `shop_sellers` itself. |

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

Before `/admin` can be used, one existing profile must be promoted by hand:

```sql
update public.profiles set role = 'admin' where email = 'admin@example.com';
```

`agent-role.sql` also shows the same pattern for promoting an agent. The normal way to create an agent after that is `POST /api/admin/agents`.

### Tables this repository creates

`shop_sellers` — one row per seller, `id` equals `auth.users.id`, `store_name` required.

`shop_products` — catalogue row. `price > 0`, `currency` is `CNY` or `USD`, `stock >= 0`, `is_active` defaults to true. `updated_at` is maintained by a trigger.

`shop_product_imports` — one uploaded PDF. `status` is `needs_review` or `completed`.

`shop_product_import_items` — extracted draft rows. `review_status` is `pending`, `approved`, or `rejected`. Sellers may update the listing fields only while the row is `pending`.

`order_chat_reads` — `(order_id, user_id)` and `last_read_at`, used for unread badges.

`orders.assigned_agent_id` references `profiles.id`.

`profiles.role` is constrained to `customer`, `agent`, `admin`, or `seller`.

### Tables the app uses but this repository does not create

These tables are queried by the app and altered by later SQL. Their original `CREATE TABLE` is not in the repo, so a new Supabase project needs that schema from the existing database before the files above will apply:

- `profiles` — `id`, `full_name`, `phone`, `address`, `postal_code`, `email`, `role`
- `orders` — `id`, `order_number`, `user_id`, `title`, `title_en`, `category`, `part_number`, `assigned_agent_id`, `quantity`, `unit`, `deadline`, `budget`, `shipping_type`, `sample_request`, `notes`, `price`, `status`, `created_at`
- `order_products` — `id`, `order_id`, `link`, `description`, `part_number`
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

Triggers worth knowing:

- A non-admin cannot change `profiles.role`, except a customer becoming `seller` for their own new store.
- A non-admin cannot set or change `orders.assigned_agent_id`.
- Signing up with `account_type = seller` inserts `shop_sellers` and sets `profiles.role` to `seller`.
- Setting a profile role to `seller` creates a `shop_sellers` row if one is missing, using the name, the email local-part, or `Seller store`.

## Row Level Security

RLS is enabled on `profiles`, `orders`, `order_products`, `agent_messages`, `order_comments`, `order_chat_reads`, `shop_sellers`, `shop_products`, `shop_product_imports`, and `shop_product_import_items`.

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

- Anyone, including anonymous visitors, can select `shop_products` where `is_active` is true. A seller can also select their own paused products.
- Only that seller can insert, update, or delete their products, and only if `profiles.role` is `seller` and a `shop_sellers` row exists.
- A seller can read and update their own `shop_sellers.store_name`.
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

## Shop cart

`ShopCartProvider` stores `{ productId, quantity }[]` in `localStorage` under `sino-persia-shop-cart`. Quantities cannot exceed the stock known when the item was added. Checkout reloads active products, refuses missing or over-stock lines, and inserts one `orders` row plus one `order_products` row per line. It does not decrement `shop_products.stock`. The cart is cleared after the order insert even if the line insert fails; in that case the line text is only in `orders.notes`.

## Realtime chat

`ChatPanel` loads the latest 50 `order_comments` for an order, marks the chat read with `mark_order_chat_read`, and subscribes to a private channel for new comments, typing, presence, and read receipts. The agent queue and the customer inbox also subscribe to `chat-inbox:<user id>` for `INSERT` on `order_comments` so unread counts update without a reload.

## Gaps between the UI and the database

- The customer order card offers delete. Checked-in RLS allows delete only for admins, so a customer delete fails unless an older policy outside this repo still grants it.
- The customer order card's download button only shows an alert. It does not build a file.
- The agent screen queries every order. RLS returns only orders assigned to that agent, so unassigned orders stay on the admin screen until an agent is chosen.
- Seller Centre `/orders` is an empty state. Shop checkout creates a customer `orders` row, not a seller order.
- Shop checkout does not change stock.

## Keeping this document current

Change the code and this file together with `docs/technical/fa.md` whenever setup, routes, auth, schema, storage, or server behavior changes. The two languages must describe the same system.
