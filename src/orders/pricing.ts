import { cents, percentOf, type Cents } from '../money.ts';
import type { Order } from './repository.ts';

export const FREE_SHIPPING_FROM = cents(5000);
export const SHIPPING = cents(490);

export type Totals = {
  subtotal: Cents;
  bulkDiscount: Cents;
  shipping: Cents;
  total: Cents;
};

/* Prices an order: the items, the bulk discount, then shipping. */
export function priceOrder(order: Order): Totals {
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

  const goods = subtotal - bulkDiscount;
  let shipping = SHIPPING;
  if (order.items.length === 0) {
    shipping = cents(0);
  } else if (goods >= FREE_SHIPPING_FROM) {
    shipping = cents(0);
  }

  return {
    subtotal: cents(subtotal),
    bulkDiscount: cents(bulkDiscount),
    shipping,
    total: cents(goods + shipping),
  };
}
