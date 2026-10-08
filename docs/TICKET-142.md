# TICKET-142 · Discount codes at checkout

Marketing launches discount codes next week. The codes are already in the `discount_codes` table; their tool fills it.

## What we need

- `POST /orders/:id/discount` with `{ "code": "SAVE15" }` applies a code to an open order.
- A code takes its percentage off the goods total, which is the subtotal after the bulk discount.
- Customers type codes in any case: `save15` works too.
- A code has a minimum order value, checked against the goods total. An order that reaches exactly the minimum qualifies.
- An expired code is refused with a clear message. `expires_on` is the last day the code works.
- Applying a new code replaces the previous one.
- `GET /orders/:id` shows the applied code and the discount it gives.
- Free shipping is decided after the code's discount.

The money rules are in `docs/money.md`.
