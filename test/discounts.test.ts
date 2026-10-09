import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seed } from '../src/db.ts';
import { cents } from '../src/money.ts';
import { applyDiscountCode, getOrder, removeItemFromOrder } from '../src/orders/handlers.ts';
import { priceOrder, type DiscountCode } from '../src/orders/pricing.ts';
import { buildReceipt } from '../src/orders/receipts.ts';
import type { Order, OrderItem } from '../src/orders/repository.ts';
import { request } from './helpers.ts';

beforeEach(() => {
  seed();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-09T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

const apply = (orderId: number, code: unknown, customer = 1) =>
  applyDiscountCode(request({ customer, body: { code } }), orderId);

const shown = (orderId: number, customer = 1) => getOrder(request({ customer }), orderId).body as Record<string, unknown>;

const errorOf = (res: { body?: unknown }) => (res.body as { error: string }).error;

describe('POST /orders/:id/discount', () => {
  it('applies a code to an open order', () => {
    // 1007: 2 × HOODIE = €99.80; 15% = €14.97
    const res = apply(1007, 'SAVE15');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ discountCode: 'SAVE15', codeDiscount: 1497, total: 8483 });
  });

  it('accepts a code typed in any case', () => {
    const res = apply(1007, 'save15');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ discountCode: 'SAVE15', codeDiscount: 1497 });
  });

  it('takes the percentage off the goods total, after the bulk discount', () => {
    // 1005: 10 × SOCKS = €99.00, bulk 5% = €4.95, goods €94.05; 15% = €14.1075 → €14.11
    const res = apply(1005, 'SAVE15');
    expect(res.body).toMatchObject({ subtotal: 9900, bulkDiscount: 495, codeDiscount: 1411, total: 7994 });
  });

  it('accepts an order that reaches exactly the minimum', () => {
    // 1002: 4 × MUG = €50.00, SAVE15 needs €50.00
    const res = apply(1002, 'SAVE15');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ codeDiscount: 750 });
  });

  it('refuses an order below the minimum', () => {
    // 1001: 1 × HOODIE = €49.90
    const res = apply(1001, 'SAVE15');
    expect(res.status).toBe(400);
    expect(errorOf(res)).toContain('€50.00');
    expect(shown(1001).discountCode).toBeNull();
  });

  it('refuses an expired code with a clear message', () => {
    const res = apply(1007, 'SUMMER25');
    expect(res.status).toBe(400);
    expect(errorOf(res)).toBe('the code SUMMER25 expired on 2026-08-31');
    expect(shown(1007).discountCode).toBeNull();
  });

  it('accepts a code on its last day, until midnight UTC', () => {
    vi.setSystemTime(new Date('2026-08-31T23:59:59Z'));
    expect(apply(1007, 'SUMMER25').status).toBe(200);
  });

  it('refuses a code the day after its last day, from midnight UTC', () => {
    vi.setSystemTime(new Date('2026-09-01T00:00:00Z'));
    expect(apply(1007, 'SUMMER25').status).toBe(400);
  });

  it('replaces the previous code', () => {
    apply(1007, 'WELCOME10');
    const res = apply(1007, 'SAVE15');
    expect(res.body).toMatchObject({ discountCode: 'SAVE15', codeDiscount: 1497 });
  });

  it('keeps the previous code when the new one is refused', () => {
    apply(1007, 'WELCOME10');
    apply(1007, 'SUMMER25');
    expect(shown(1007)).toMatchObject({ discountCode: 'WELCOME10', codeDiscount: 998 });
  });

  it('refuses an unknown code', () => {
    const res = apply(1007, 'NOPE');
    expect(res.status).toBe(400);
    expect(errorOf(res)).toBe('unknown discount code');
  });

  it('refuses a body without a code', () => {
    expect(apply(1007, undefined).status).toBe(400);
    expect(apply(1007, 15).status).toBe(400);
  });

  it('refuses an order that is not open', () => {
    expect(apply(1004, 'WELCOME10', 3).status).toBe(409);
  });

  it('hides an order from other customers', () => {
    expect(apply(1007, 'WELCOME10', 2).status).toBe(404);
  });

  it('asks an anonymous caller to sign in', () => {
    expect(applyDiscountCode(request({ body: { code: 'WELCOME10' } }), 1007).status).toBe(401);
  });
});

describe('GET /orders/:id with a discount code', () => {
  it('shows the applied code and the discount it gives', () => {
    apply(1007, 'SAVE15');
    expect(shown(1007)).toMatchObject({ discountCode: 'SAVE15', codeDiscount: 1497, total: 8483 });
  });

  it('shows no discount without a code', () => {
    expect(shown(1007)).toMatchObject({ discountCode: null, codeDiscount: 0 });
  });

  it('keeps the code but gives no discount once the order falls below the minimum', () => {
    apply(1002, 'SAVE15');
    removeItemFromOrder(request({ customer: 1 }), 1002, 'MUG');
    expect(shown(1002)).toMatchObject({ discountCode: 'SAVE15', codeDiscount: 0 });
  });

  it('keeps the code but gives no discount once the code has expired', () => {
    vi.setSystemTime(new Date('2026-08-31T12:00:00Z'));
    apply(1007, 'SUMMER25');
    vi.setSystemTime(new Date('2026-09-01T00:00:00Z'));
    expect(shown(1007)).toMatchObject({ discountCode: 'SUMMER25', codeDiscount: 0 });
  });

  it('decides free shipping after the code discount', () => {
    // 1002: €50.00 ships free; with 10% off the goods are €45.00, so shipping is charged
    expect(shown(1002)).toMatchObject({ shipping: 0, total: 5000 });
    apply(1002, 'WELCOME10');
    expect(shown(1002)).toMatchObject({ codeDiscount: 500, shipping: 490, total: 4990 });
  });
});

describe('receipt with a discount code', () => {
  it('totals the same as the order', () => {
    apply(1007, 'SAVE15');
    expect(buildReceipt(1007)).toContain('Total  €84.83');
  });
});

describe('priceOrder with a discount code', () => {
  const order = (items: { sku: string; qty: number; unitPrice: number }[]): Order => ({
    id: 1,
    customerId: 1,
    status: 'open',
    discountCode: 'X',
    items: items.map((i): OrderItem => ({ ...i, unitPrice: cents(i.unitPrice) })),
  });
  const code = (percent: number, minOrder: number, expiresOn = '2099-12-31'): DiscountCode => ({
    code: 'X',
    percent,
    minOrder: cents(minOrder),
    expiresOn,
  });

  it('rounds the discount half up to the cent', () => {
    // 10% of €10.05 = €1.005 → €1.01
    const totals = priceOrder(order([{ sku: 'CAP', qty: 1, unitPrice: 1005 }]), code(10, 0), '2026-10-09');
    expect(totals.codeDiscount).toBe(101);
    expect(totals.total).toBe(1005 - 101 + 490);
  });

  it('checks the minimum against the goods total, not the subtotal', () => {
    // 5 × SOCKS at €10.10 = €50.50, pack discount 10% → goods €45.45
    const totals = priceOrder(order([{ sku: 'SOCKS', qty: 5, unitPrice: 1010 }]), code(15, 5000), '2026-10-09');
    expect(totals.codeDiscount).toBe(0);
  });

  it('gives the discount on the last day and not after', () => {
    const items = order([{ sku: 'CAP', qty: 1, unitPrice: 1500 }]);
    expect(priceOrder(items, code(10, 0, '2026-10-09'), '2026-10-09').codeDiscount).toBe(150);
    expect(priceOrder(items, code(10, 0, '2026-10-09'), '2026-10-10').codeDiscount).toBe(0);
  });
});
