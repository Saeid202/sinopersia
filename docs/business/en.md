# Sino Persia — Business overview

Last updated: 9 October 2026

This document explains what Sino Persia is and what the product does today. It is written for founders, operations, sales, and partners. A separate technical document will come later.

## What Sino Persia is

Sino Persia helps people in Iran buy from more than one seller in China and receive the goods as one shipment.

A customer can either describe what they want and have a Sino Persia specialist source it, or choose products already listed in the Sino Persia shop. In both cases the goods are gathered and the customer can follow the order until it is sent to Iran. A sourcing request still has its final amount confirmed before any money is collected. A shop purchase charges the goods total in rials at checkout, through a gateway an admin has turned on. Shipping is not part of that shop charge.

The public promise, stated on the homepage, is: several sellers in China, one shipment to Iran.

## The problem it addresses

Buying from several Chinese sellers usually means several parcels, several shipping charges, and several things to track. Sino Persia replaces that with one order and one path:

- purchases from different sellers are collected in a warehouse in China
- those parcels are prepared as one shipment
- the shipment is sent to Iran
- one specialist stays responsible for the order

This is most useful when a buyer needs several items, from several sellers, in the same period, and a single shipment is cheaper or simpler than separate ones.

## Who it is for

| Who | What they come to Sino Persia to do |
| --- | --- |
| Customer | Place a sourcing request, buy from the shop, follow the order, and talk to the specialist |
| Agent | Review customer orders, set the price and status, and talk to the customer |
| Admin | See the whole operation, create agent accounts, assign an agent to a sourcing order, set each person's role, manage shop categories and products, turn payment gateways on, and export the main lists |
| Seller | Open a store, list products in Chinese yuan or US dollars, and publish them to the shop |

The customer-facing site is in Persian. Seller Centre can be used in English or Persian.

## How a shipment is meant to work

1. **Place the order.** The customer records each item: a product link or a clear description, the seller, the quantity, and notes such as colour, size, or model.
2. **Buy in China.** Each item is purchased from the relevant seller.
3. **Consolidate.** The parcels are gathered in the China warehouse.
4. **Ship to Iran.** The consolidated order is sent as one shipment.

Before a sourcing customer pays, Sino Persia states the final amount for confirmation. A shop purchase pays the goods total at checkout. Shipping for that purchase is still arranged separately.

## Two ways to buy

### Custom sourcing

The customer signs in and creates an order from their account. They name the goods in Persian and, if they want, in English. They choose a category, quantity and unit, shipping preference, and whether they need a sample before the main order.

Categories are electronics, industrial parts, auto parts, construction equipment, raw materials, machinery, home appliances, clothing and textiles, and other.

For auto parts, each part can include a photo and its part number. A photo without a part number, or a part number without a photo, is not accepted. For other categories the customer can attach one product photo and add extra product links or descriptions. Photos must be real images under 5 MB.

The customer can later view, edit, or delete their own order, and leave a comment on it.

### The shop

The shop is a catalogue of products that sellers have published. A visitor can browse without an account: search by name or SKU, filter by category, sort by newest or by price, and open a product page.

Adding to the cart does not buy the goods. The cart is saved in the browser. At checkout the customer must sign in, choose an enabled gateway, and pay. That payment becomes a normal order in their account, with the category "shop". The shop list, each product page, and the cart show the yuan or dollar price and, beside it, the same amount in rials. The rial figure uses the market board already cached for the rate tape, so the shop does not ask the market once for every product. The cart charges that rial total. The server calculates it again from the current board; the browser cannot set the amount. When a seller saves or publishes a product, the conversion at that moment is also stored on the product row. Shipping is not included and is still arranged separately.

If a product is no longer available, or the requested quantity is higher than the current stock, checkout stops until the cart is corrected. If no gateway is enabled, the cart says so and does not charge.

## Order lifecycle

An agent moves an order through these statuses:

| Status | Meaning |
| --- | --- |
| Awaiting review | New order. Nobody has started working on it. |
| In review | A specialist is following it up. |
| Awaiting customer confirmation | A price has been prepared and the customer needs to confirm it. |
| Completed | The order is finished. |

The customer dashboard keeps two lists. ثبت سفارش is the sourcing requests the customer creates. خرید فروشگاه is what they paid for in the shop. Each list counts its own active, awaiting-review, and completed rows. A shop purchase can be opened, but it is not edited in the sourcing form.

## The customer account

A customer signs in with email and password and can reset a forgotten password. The account has three areas:

- **Orders.** Create, view, edit, and delete sourcing requests. Shop purchases are a separate list on the same page. Those can be viewed. They are not edited as sourcing requests.
- **Messages.** Open a support ticket, read replies from support, or chat with the agent about a specific order. Unread agent messages are marked.
- **Profile.** Save name, mobile number, address, and postal code. Email is the sign-in address and is not edited here.

Someone who is not a customer is sent to the area that matches their role.

## The agent

An agent sees incoming customer orders, searches by order number, product, or customer, and opens the details. From an order they can:

- read the customer's category, quantity, deadline, shipping preference, and notes
- chat with the customer on that order, with a badge for unread customer messages
- set the status and the final price
- send an optional note to the customer when the price is saved

Agents do not manage the shop catalogue. Shop purchases are not in the agent queue. They stay on the admin shop-purchases list and on the customer's shop-purchases tab. Admin assigns which agent is responsible for a sourcing order.

## The admin

Admin is the operations view of the whole service:

- counts of users, agents, customers, and orders awaiting review
- create an agent account with a name, email, and temporary password
- change a person's role among customer, agent, admin, and seller
- see every order, who placed it, its status and price, and assign or clear the responsible agent
- search, filter, and page the user list, sourcing orders, shop purchases, contact messages, and the payment report. Ten rows show on each page. Users filter by role. Sourcing orders and shop purchases filter by status. Messages filter by new or read. The payment report filters by status, gateway, and sandbox or live. Excel download includes every matching row, not only the page on screen.
- turn Zarinpal or Bank Mellat on or off, store that gateway's keys, and switch it between sandbox and live. Customers only see gateways that are on. A charge fails if the keys for that gateway are missing.
- open Product management and keep the shop categories: add one, rename it, or delete it when no product still uses it
- see every shop product, edit its names, category, SKU, price, currency, and stock, pause or republish it, or delete it

## Seller Centre

A seller registers a store with a store name, or turns an existing signed-in account into a seller store. The password must be at least 8 characters. If email confirmation is required, the seller verifies the email before signing in.

Inside Seller Centre the seller can:

- rename the store and see when the store was created
- add, edit, pause, republish, and delete products
- list a product with an English name, an optional Persian name, descriptions in both languages, a category from the admin list, an optional SKU, a price in CNY or USD, a stock quantity, and an image under 5 MB
- upload a text PDF catalogue, review the extracted rows, correct them, reject rows that should not be listed, and publish only the rows they approve

Nothing from a PDF is published automatically. Scanned PDFs, which contain no extractable text, are not supported. The seller must give every approved row an English name, a category, a price, a currency, and a stock quantity before it can go live. A paused product disappears from the shop. A deleted product is removed.

Seller Centre orders lists shop purchases that include that seller's own products: order number, date, status, and each line's quantity and unit price. The seller cannot change the status or mark the order fulfilled there. Custom sourcing requests are not in that list. Until `supabase/seller-orders.sql` has been run once, the page says so and stays empty.

Account settings let the seller change their password or sign out.

## Market rates

The homepage, the shop, and the contact page show the free-market price of one US dollar and one Chinese yuan in rials. The figures come from the TGJU market board. The page checks again about once a minute. The clock on the tape is the time of the last market change, so a price that has not moved stays as it is. The shop uses the same board to show rial prices and to charge the cart. Shipping is not part of that charge. A sourcing order is still priced by a specialist and is not paid through these gateways.

## Communication

There are two separate conversations:

- **Order chat** is between the customer and the agent, attached to one order. Both sides see new messages.
- **Support tickets** are messages the customer sends to support. Replies appear under the original ticket.

A price update can also include a short message from the agent to the customer.

## What is not finished

These items exist in the product as gaps, not as working features:

- A sourcing order is still not paid inside the product. The customer confirms a quoted price, and that money is collected outside Sino Persia. Shop checkout does charge the goods total when a gateway is enabled.
- The order "download" action does not yet produce a PDF or spreadsheet. It only tells the user that a file would be prepared.
- A seller can see shop lines for their own products. They cannot change the order status or mark it fulfilled from Seller Centre.
- A shop purchase does not reserve or reduce stock.
- Scanned product catalogues cannot be imported.

## How this document stays current

When a feature changes what a customer, agent, admin, or seller can do, this file and `docs/business/fa.md` are updated together. The Persian and English versions must describe the same product.
