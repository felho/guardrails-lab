import { cents, formatCents, percentOf, type Cents } from '../money.ts';
import type { DiscountCode, Order } from './repository.ts';

export const FREE_SHIPPING_FROM = cents(5000);
export const SHIPPING = cents(490);

export type Totals = {
  subtotal: Cents;
  bulkDiscount: Cents;
  codeDiscount: Cents;
  shipping: Cents;
  total: Cents;
};

/* Prices an order: the items, the bulk discount, the discount code, then shipping. */
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

  const goods = cents(subtotal - bulkDiscount);
  // a code that no longer reaches its minimum (items were removed) gives nothing
  const codeDiscount = order.discount && goods >= order.discount.minOrder ? percentOf(goods, order.discount.percent) : cents(0);
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

/* Why a code can't be applied to an order, or undefined when it can. `today` is YYYY-MM-DD. */
export function discountCodeRefusal(code: DiscountCode, goods: Cents, today: string): string | undefined {
  if (today > code.expiresOn) return `This code expired on ${code.expiresOn}.`;
  if (goods < code.minOrder) return `This code needs an order of at least ${formatCents(code.minOrder)}.`;
  return undefined;
}
