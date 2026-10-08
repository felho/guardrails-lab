import { describe, expect, it } from 'vitest';
import { cents } from '../src/money.ts';
import { priceOrder } from '../src/orders/pricing.ts';
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
