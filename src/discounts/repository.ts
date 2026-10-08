import { db } from '../db.ts';
import { cents, type Cents } from '../money.ts';

export type DiscountCode = {
  code: string;
  percent: number;
  minOrder: Cents;
  /** YYYY-MM-DD, the last day the code works. */
  expiresOn: string;
};

type DiscountCodeRow = { code: string; percent: number; min_order_cents: number; expires_on: string };

/* Codes are stored in upper case; customers may type them in any case. */
export function normaliseCode(input: string): string {
  return input.trim().toUpperCase();
}

export function findDiscountCode(code: string): DiscountCode | undefined {
  const row = db.prepare('SELECT code, percent, min_order_cents, expires_on FROM discount_codes WHERE code = ?')
    .get(normaliseCode(code)) as DiscountCodeRow | undefined;
  return row ? toDiscountCode(row) : undefined;
}

function toDiscountCode(row: DiscountCodeRow): DiscountCode {
  return { code: row.code, percent: row.percent, minOrder: cents(row.min_order_cents), expiresOn: row.expires_on };
}
