import { describe, expect, it } from 'vitest';
import { cents } from '../src/money.ts';
import type { DiscountCode } from '../src/orders/discounts.ts';
import { priceOrder, SHIPPING } from '../src/orders/pricing.ts';
import type { Order, OrderItem } from '../src/orders/repository.ts';

const order = (items: { sku: string; qty: number; unitPrice: number }[]): Order => ({
  id: 1,
  customerId: 1,
  status: 'open',
  discountCode: null,
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

describe('priceOrder with a discount code', () => {
  const code = (percent: number, minOrder = 0, expiresOn = '2099-12-31'): DiscountCode =>
    ({ code: 'TEST', percent, minOrder: cents(minOrder), expiresOn });

  it('takes the percentage off the goods total, after the bulk discount', () => {
    // 12 mugs: 15000, bulk 5% = 750, goods 14250, 15% = 2137.5 → 2138 (half up)
    const totals = priceOrder(order([{ sku: 'MUG', qty: 12, unitPrice: 1250 }]), code(15));
    expect(totals.bulkDiscount).toBe(750);
    expect(totals.codeDiscount).toBe(2138);
    expect(totals.total).toBe(14250 - 2138);
  });

  it('applies when the goods total is exactly the minimum', () => {
    const totals = priceOrder(order([{ sku: 'X', qty: 1, unitPrice: 5000 }]), code(10, 5000));
    expect(totals.codeDiscount).toBe(500);
  });

  it('does not apply below the minimum', () => {
    const totals = priceOrder(order([{ sku: 'X', qty: 1, unitPrice: 4999 }]), code(10, 5000));
    expect(totals.codeDiscount).toBe(0);
  });

  it('works on its last day and not after', () => {
    const items = [{ sku: 'X', qty: 1, unitPrice: 1000 }];
    expect(priceOrder(order(items), code(10, 0, '2026-08-31'), '2026-08-31').codeDiscount).toBe(100);
    expect(priceOrder(order(items), code(10, 0, '2026-08-31'), '2026-09-01').codeDiscount).toBe(0);
  });

  it('decides free shipping after the code discount', () => {
    const totals = priceOrder(order([{ sku: 'X', qty: 1, unitPrice: 5500 }]), code(10));
    expect(totals.codeDiscount).toBe(550);
    expect(totals.shipping).toBe(SHIPPING);
    expect(totals.total).toBe(4950 + SHIPPING);
  });
});
