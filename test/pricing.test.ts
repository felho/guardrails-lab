import { describe, expect, it } from 'vitest';
import type { DiscountCode } from '../src/discounts/repository.ts';
import { cents } from '../src/money.ts';
import { codeRefusal, FREE_SHIPPING_FROM, priceOrder, SHIPPING, today } from '../src/orders/pricing.ts';
import type { Order, OrderItem } from '../src/orders/repository.ts';

const order = (items: { sku: string; qty: number; unitPrice: number }[], discount: DiscountCode | null = null): Order => ({
  id: 1,
  customerId: 1,
  status: 'open',
  discount,
  items: items.map((i): OrderItem => ({ ...i, unitPrice: cents(i.unitPrice) })),
});

const code = (percent: number, minOrder = 0, expiresOn = '2099-12-31'): DiscountCode =>
  ({ code: 'TEST', percent, minOrder: cents(minOrder), expiresOn });

const DAY = '2026-10-08';

describe('priceOrder', () => {
  it('adds up the items and charges shipping', () => {
    const totals = priceOrder(order([{ sku: 'MUG', qty: 2, unitPrice: 1250 }]));
    expect(totals).toEqual({ subtotal: 2500, bulkDiscount: 0, codeDiscount: 0, shipping: SHIPPING, total: 2500 + SHIPPING });
  });

  it('gives free shipping at exactly the threshold', () => {
    const totals = priceOrder(order([{ sku: 'MUG', qty: 4, unitPrice: 1250 }]));
    expect(totals.subtotal).toBe(FREE_SHIPPING_FROM);
    expect(totals.shipping).toBe(0);
    expect(totals.total).toBe(5000);
  });

  it('charges shipping one cent below the threshold', () => {
    const totals = priceOrder(order([{ sku: 'X', qty: 1, unitPrice: 4999 }]));
    expect(totals.shipping).toBe(SHIPPING);
    expect(totals.total).toBe(4999 + SHIPPING);
  });

  it('gives 5% off a line of ten or more', () => {
    const totals = priceOrder(order([{ sku: 'MUG', qty: 12, unitPrice: 1250 }]));
    expect(totals.bulkDiscount).toBe(750);
    expect(totals.total).toBe(15000 - 750);
  });

  it('gives 10% off five or more socks', () => {
    const totals = priceOrder(order([{ sku: 'SOCKS', qty: 6, unitPrice: 990 }]));
    expect(totals.bulkDiscount).toBe(594);
    expect(totals.total).toBe(5940 - 594);
  });

  it('decides free shipping after the bulk discount', () => {
    const totals = priceOrder(order([{ sku: 'SOCKS', qty: 5, unitPrice: 1000 }]));
    expect(totals.bulkDiscount).toBe(500);
    expect(totals.shipping).toBe(SHIPPING);
  });

  it('prices an empty order at zero without shipping', () => {
    expect(priceOrder(order([]))).toEqual({ subtotal: 0, bulkDiscount: 0, codeDiscount: 0, shipping: 0, total: 0 });
  });
});

describe('discount codes in priceOrder', () => {
  it('takes the percentage off the goods total, after the bulk discount', () => {
    // 12 mugs: 15000, bulk 750, goods 14250, 15% of that is 2137.5 -> 2138
    const totals = priceOrder(order([{ sku: 'MUG', qty: 12, unitPrice: 1250 }], code(15)), DAY);
    expect(totals.bulkDiscount).toBe(750);
    expect(totals.codeDiscount).toBe(2138);
    expect(totals.total).toBe(15000 - 750 - 2138);
  });

  it('applies at exactly the minimum goods total', () => {
    const totals = priceOrder(order([{ sku: 'MUG', qty: 4, unitPrice: 1250 }], code(10, 5000)), DAY);
    expect(totals.codeDiscount).toBe(500);
  });

  it('gives nothing below the minimum, checked after the bulk discount', () => {
    // 5 socks at 1000: subtotal 5000, but goods 4500
    const totals = priceOrder(order([{ sku: 'SOCKS', qty: 5, unitPrice: 1000 }], code(10, 5000)), DAY);
    expect(totals.codeDiscount).toBe(0);
  });

  it('gives nothing once the code has expired', () => {
    const items = [{ sku: 'MUG', qty: 4, unitPrice: 1250 }];
    expect(priceOrder(order(items, code(10, 0, DAY)), DAY).codeDiscount).toBe(500);
    expect(priceOrder(order(items, code(10, 0, '2026-10-07')), DAY).codeDiscount).toBe(0);
  });

  it('decides free shipping after the code discount', () => {
    const totals = priceOrder(order([{ sku: 'MUG', qty: 4, unitPrice: 1250 }], code(10)), DAY);
    expect(totals.shipping).toBe(SHIPPING);
    expect(totals.total).toBe(4500 + SHIPPING);
  });
});

describe('codeRefusal', () => {
  it('accepts a code on its last day and refuses it the day after', () => {
    expect(codeRefusal(code(10, 0, '2026-08-31'), cents(1000), '2026-08-31')).toBeUndefined();
    expect(codeRefusal(code(10, 0, '2026-08-31'), cents(1000), '2026-09-01')).toBe('the code TEST expired on 2026-08-31');
  });

  it('names the minimum order', () => {
    expect(codeRefusal(code(10, 5000), cents(4999), DAY)).toBe('the code TEST needs an order of at least €50.00');
    expect(codeRefusal(code(10, 5000), cents(5000), DAY)).toBeUndefined();
  });
});

describe('today', () => {
  it('formats the local date like expires_on', () => {
    expect(today(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
