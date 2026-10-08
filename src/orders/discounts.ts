import { db } from '../db.ts';
import { cents, formatCents, type Cents } from '../money.ts';

export type DiscountCode = {
  code: string;
  percent: number;
  minOrder: Cents;
  expiresOn: string; // YYYY-MM-DD, the last day the code works
};

type CodeRow = { code: string; percent: number; min_order_cents: number; expires_on: string };

/* Customers type codes in any case; the table stores them in upper case. */
export function findDiscountCode(code: string): DiscountCode | undefined {
  const row = db.prepare('SELECT code, percent, min_order_cents, expires_on FROM discount_codes WHERE code = ?')
    .get(code.trim().toUpperCase()) as CodeRow | undefined;
  if (!row) return undefined;
  return { code: row.code, percent: row.percent, minOrder: cents(row.min_order_cents), expiresOn: row.expires_on };
}

/* Today's date as YYYY-MM-DD in the server's local time zone. */
export function today(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/* Why a code can't be used on an order with this goods total, or undefined if it can. */
export function refusal(code: DiscountCode, goods: Cents, on: string): string | undefined {
  if (on > code.expiresOn) return `the code ${code.code} expired on ${code.expiresOn}`;
  if (goods < code.minOrder) return `the code ${code.code} needs an order of at least ${formatCents(code.minOrder)}`;
  return undefined;
}

/* The code applied to an order, if it is still in the table. */
export function appliedCode(order: { discountCode: string | null }): DiscountCode | undefined {
  return order.discountCode ? findDiscountCode(order.discountCode) : undefined;
}
