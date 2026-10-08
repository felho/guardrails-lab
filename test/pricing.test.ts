import { describe, expect, it } from 'vitest';
import { cents } from '../src/money.ts';
import { FREE_SHIPPING_FROM, priceOrder, SHIPPING } from '../src/orders/pricing.ts';
import type { Order, OrderItem } from '../src/orders/repository.ts';

const order = (items: { sku: string; qty: number; unitPrice: number }[]): Order => ({
  id: 1,
  customerId: 1,
  status: 'open',
  discountCode: null,
  items: items.map((i): OrderItem => ({ ...i, unitPrice: cents(i.unitPrice) })),
});

describe('priceOrder', () => {
  it('adds up the items and charges shipping', () => {
    const totals = priceOrder(order([{ sku: 'MUG', qty: 2, unitPrice: 1250 }]));
    expect(totals).toEqual({ subtotal: 2500, bulkDiscount: 0, shipping: SHIPPING, total: 2500 + SHIPPING });
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
    expect(priceOrder(order([]))).toEqual({ subtotal: 0, bulkDiscount: 0, shipping: 0, total: 0 });
  });
});
