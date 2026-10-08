# Money

- Every amount is a whole number of cents: the `Cents` type in `src/money.ts`. Never use floating-point numbers for money.
- A percentage discount is computed from the amount it applies to and rounded half up to the cent: use `percentOf()`. Round the discount, never the total.
- Show amounts to customers with `formatCents()`.
