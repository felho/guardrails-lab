import { describe, expect, it } from 'vitest';
import { cents } from '../src/money.ts';
import { discountCodeRefusal, priceOrder } from '../src/orders/pricing.ts';
import type { DiscountCode, Order, OrderItem } from '../src/orders/repository.ts';

const order = (items: { sku: string; qty: number; unitPrice: number }[], discount: DiscountCode | null = null): Order => ({
  id: 1,
  customerId: 1,
  status: 'open',
  discount,
  items: items.map((i): OrderItem => ({ ...i, unitPrice: cents(i.unitPrice) })),
});

describe('priceOrder', () => {
  it('adds up the items', () => {
    const totals = priceOrder(order([{ sku: 'MUG', qty: 2, unitPrice: 1250 }]));
    expect(totals.subtotal).toBe(2500);
    expect(totals.total).toBeGreaterThan(2500);
  });

  it('gives free shipping on large orders', () => {
    const totals = priceOrder(order([{ sku: 'HOODIE', qty: 2, unitPrice: 4990 }]));
    expect(totals.shipping).toBe(0);
  });

  it('charges shipping on small orders', () => {
    const totals = priceOrder(order([{ sku: 'CAP', qty: 1, unitPrice: 1500 }]));
    expect(totals.shipping).toBeGreaterThan(0);
  });

  it('gives a bulk discount', () => {
    const totals = priceOrder(order([{ sku: 'MUG', qty: 12, unitPrice: 1250 }]));
    expect(totals.bulkDiscount).toBeGreaterThan(0);
  });

  it('gives a discount on socks', () => {
    const totals = priceOrder(order([{ sku: 'SOCKS', qty: 6, unitPrice: 990 }]));
    expect(totals.bulkDiscount).toBeGreaterThan(0);
  });

  it('prices an empty order', () => {
    const totals = priceOrder(order([]));
    expect(totals.total).toBe(0);
  });

});

const code = (percent: number, minOrder: number, expiresOn = '2099-12-31'): DiscountCode => ({
  code: 'TEST',
  percent,
  minOrder: cents(minOrder),
  expiresOn,
});

describe('priceOrder with a discount code', () => {
  it('takes the percentage off the goods total, after the bulk discount', () => {
    // 12 mugs: 15000, bulk 5% = 750, goods 14250, 10% = 1425
    const totals = priceOrder(order([{ sku: 'MUG', qty: 12, unitPrice: 1250 }], code(10, 0)));
    expect(totals.bulkDiscount).toBe(750);
    expect(totals.codeDiscount).toBe(1425);
    expect(totals.total).toBe(14250 - 1425);
  });

  it('rounds the discount half up to the cent', () => {
    // 15% of 990 = 148.5 -> 149
    const totals = priceOrder(order([{ sku: 'SOCKS', qty: 1, unitPrice: 990 }], code(15, 0)));
    expect(totals.codeDiscount).toBe(149);
    expect(totals.total).toBe(990 - 149 + 490);
  });

  it('decides free shipping after the code discount', () => {
    // one hoodie twice is 9980; 50% off leaves 4990, under the free-shipping line
    const totals = priceOrder(order([{ sku: 'HOODIE', qty: 2, unitPrice: 4990 }], code(50, 0)));
    expect(totals.codeDiscount).toBe(4990);
    expect(totals.shipping).toBe(490);
    expect(totals.total).toBe(4990 + 490);
  });

  it('gives nothing once the goods total drops below the minimum', () => {
    const totals = priceOrder(order([{ sku: 'MUG', qty: 1, unitPrice: 1250 }], code(15, 5000)));
    expect(totals.codeDiscount).toBe(0);
  });

  it('applies at exactly the minimum', () => {
    const totals = priceOrder(order([{ sku: 'MUG', qty: 4, unitPrice: 1250 }], code(15, 5000)));
    expect(totals.codeDiscount).toBe(750);
  });
});

describe('discountCodeRefusal', () => {
  it('accepts an order that reaches exactly the minimum', () => {
    expect(discountCodeRefusal(code(15, 5000), cents(5000), '2026-10-08')).toBeUndefined();
  });

  it('refuses an order below the minimum', () => {
    expect(discountCodeRefusal(code(15, 5000), cents(4999), '2026-10-08')).toMatch(/at least €50.00/);
  });

  it('accepts a code on its last day and refuses it the day after', () => {
    expect(discountCodeRefusal(code(25, 0, '2026-08-31'), cents(1000), '2026-08-31')).toBeUndefined();
    expect(discountCodeRefusal(code(25, 0, '2026-08-31'), cents(1000), '2026-09-01')).toMatch(/expired on 2026-08-31/);
  });
});
