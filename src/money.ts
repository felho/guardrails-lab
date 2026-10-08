/*
 * Money is always a whole number of cents. See docs/money.md.
 */

export type Cents = number & { readonly __brand: 'Cents' };

export function cents(n: number): Cents {
  if (!Number.isInteger(n)) throw new Error(`not a whole number of cents: ${String(n)}`);
  return n as Cents;
}

/** `pct` percent of an amount, rounded half up to the cent. */
export function percentOf(amount: Cents, pct: number): Cents {
  return cents(Math.round((amount * pct) / 100));
}

export function formatCents(amount: Cents): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  return `${sign}€${String(Math.floor(abs / 100))}.${String(abs % 100).padStart(2, '0')}`;
}
