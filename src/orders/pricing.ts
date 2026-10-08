import type { DiscountCode } from '../discounts/repository.ts';
import { cents, formatCents, percentOf, type Cents } from '../money.ts';
import type { Order } from './repository.ts';

export const FREE_SHIPPING_FROM = cents(5000);
export const SHIPPING = cents(490);

export type Totals = {
  subtotal: Cents;
  bulkDiscount: Cents;
  codeDiscount: Cents;
  shipping: Cents;
  total: Cents;
};

/* Today's date as YYYY-MM-DD in the server's time zone, the format of `expires_on`. */
export function today(now = new Date()): string {
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
}

/* Why a code does not apply to goods worth `goods` on `day`, or undefined when it does. */
export function codeRefusal(code: DiscountCode, goods: Cents, day: string): string | undefined {
  if (day > code.expiresOn) return `the code ${code.code} expired on ${code.expiresOn}`;
  if (goods < code.minOrder) return `the code ${code.code} needs an order of at least ${formatCents(code.minOrder)}`;
  return undefined;
}

/* Prices an order: the items, the bulk discount, the discount code, then shipping. */
export function priceOrder(order: Order, day = today()): Totals {
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

  const goods = cents(subtotal - bulkDiscount);
  // a code counts only while it still applies: the items may have changed or the code expired since it was entered
  const codeDiscount = order.discount && !codeRefusal(order.discount, goods, day) ? percentOf(goods, order.discount.percent) : cents(0);
  const discounted = goods - codeDiscount;

  let shipping = SHIPPING;
  if (order.items.length === 0) {
    shipping = cents(0);
  } else if (discounted >= FREE_SHIPPING_FROM) {
    shipping = cents(0);
  }

  return {
    subtotal: cents(subtotal),
    bulkDiscount: cents(bulkDiscount),
    codeDiscount,
    shipping,
    total: cents(discounted + shipping),
  };
}

/* The goods total a discount code is checked against: the subtotal after the bulk discount. */
export function goodsTotal(totals: Totals): Cents {
  return cents(totals.subtotal - totals.bulkDiscount);
}
