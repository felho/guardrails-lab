import { cents, formatCents, percentOf, type Cents } from '../money.ts';
import type { Order } from './repository.ts';

export const FREE_SHIPPING_FROM = cents(5000);
export const SHIPPING = cents(490);

export type DiscountCode = {
  code: string;
  percent: number;
  minOrder: Cents;
  expiresOn: string; // YYYY-MM-DD, the last day the code is valid
};

export type Totals = {
  subtotal: Cents;
  bulkDiscount: Cents;
  codeDiscount: Cents;
  shipping: Cents;
  total: Cents;
};

/* Today's date in UTC as YYYY-MM-DD: the calendar discount codes expire by. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/* Why a code cannot be used on goods worth `goods` today, or undefined if it can. */
export function whyCodeDoesNotApply(code: DiscountCode, goods: Cents, today: string): string | undefined {
  if (today > code.expiresOn) return `the code ${code.code} expired on ${code.expiresOn}`;
  if (goods < code.minOrder) return `the code ${code.code} needs an order of at least ${formatCents(code.minOrder)}`;
  return undefined;
}

/* Prices an order: the items, the bulk discount, the discount code, then shipping. */
export function priceOrder(order: Order, code?: DiscountCode, today: string = todayUtc()): Totals {
  const { subtotal, bulkDiscount } = itemTotals(order);
  const goods = cents(subtotal - bulkDiscount);
  const codeDiscount = code && !whyCodeDoesNotApply(code, goods, today) ? percentOf(goods, code.percent) : cents(0);

  const discounted = goods - codeDiscount;
  let shipping = SHIPPING;
  if (order.items.length === 0) {
    shipping = cents(0);
  } else if (discounted >= FREE_SHIPPING_FROM) {
    shipping = cents(0);
  }

  return {
    subtotal,
    bulkDiscount,
    codeDiscount,
    shipping,
    total: cents(discounted + shipping),
  };
}

/* The goods total of an order: its subtotal after the bulk discount. */
export function goodsTotal(order: Order): Cents {
  const { subtotal, bulkDiscount } = itemTotals(order);
  return cents(subtotal - bulkDiscount);
}

function itemTotals(order: Order): { subtotal: Cents; bulkDiscount: Cents } {
  let subtotal = 0;
  let bulkDiscount = 0;
  for (const item of order.items) {
    const line = item.unitPrice * item.qty;
    subtotal += line;
    if (item.qty >= 10) {
      // ten or more of one product: 5% off that line
      bulkDiscount += percentOf(cents(line), 5);
    } else if (item.sku === 'SOCKS' && item.qty >= 5) {
      // socks are sold in packs of five: 10% off
      bulkDiscount += percentOf(cents(line), 10);
    }
  }
  return { subtotal: cents(subtotal), bulkDiscount: cents(bulkDiscount) };
}
