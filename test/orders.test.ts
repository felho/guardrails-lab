import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../src/db.ts';
import { addItemToOrder, applyDiscountCode, getOrder } from '../src/orders/handlers.ts';
import { request } from './helpers.ts';

beforeEach(() => seed());

describe('GET /orders/:id', () => {
  it('shows an order to its owner', () => {
    const res = getOrder(request({ customer: 1 }), 1001);
    expect(res.status).toBe(200);
  });

  it('hides an order from other customers', () => {
    const res = getOrder(request({ customer: 2 }), 1001);
    expect(res.status).toBe(404);
  });
});

describe('POST /orders/:id/items', () => {
  it('adds an item', () => {
    const res = addItemToOrder(request({ customer: 1, body: { sku: 'CAP', qty: 1 } }), 1001);
    expect(res.status).toBe(200);
  });

  it('refuses an unknown product', () => {
    const res = addItemToOrder(request({ customer: 1, body: { sku: 'NOPE', qty: 1 } }), 1001);
    expect(res.status).toBe(400);
  });

  it('refuses a paid order', () => {
    const res = addItemToOrder(request({ customer: 3, body: { sku: 'CAP', qty: 1 } }), 1004);
    expect(res.status).toBe(409);
  });
});

describe('POST /orders/:id/discount', () => {
  const apply = (customer: number, id: number, code: unknown) => applyDiscountCode(request({ customer, body: { code } }), id);

  it('applies a code in any case and shows it on the order', () => {
    // order 1007: 2 hoodies, goods 9980, 15% = 1497
    const res = apply(1, 1007, 'save15');
    expect(res.status).toBe(200);
    const body = getOrder(request({ customer: 1 }), 1007).body as any;
    expect(body.discountCode).toBe('SAVE15');
    expect(body.codeDiscount).toBe(1497);
    expect(body.total).toBe(9980 - 1497);
  });

  it('replaces the previous code', () => {
    apply(1, 1007, 'SAVE15');
    const res = apply(1, 1007, 'WELCOME10');
    expect((res.body as any).discountCode).toBe('WELCOME10');
    expect((res.body as any).codeDiscount).toBe(998);
  });

  it('refuses an expired code with a clear message', () => {
    const res = apply(1, 1007, 'SUMMER25');
    expect(res.status).toBe(400);
    expect((res.body as any).error).toBe('the code SUMMER25 expired on 2026-08-31');
  });

  it('refuses an order below the minimum', () => {
    // order 1002: 4 mugs, goods 5000 → exactly the minimum qualifies
    expect(apply(1, 1002, 'SAVE15').status).toBe(200);
    // order 1001: one hoodie, 4990
    const res = apply(1, 1001, 'SAVE15');
    expect(res.status).toBe(400);
    expect((res.body as any).error).toBe('the code SAVE15 needs an order of at least €50.00');
  });

  it('refuses an unknown code, a missing code, a paid order and someone else\'s order', () => {
    expect(apply(1, 1007, 'NOPE').status).toBe(400);
    expect(apply(1, 1007, undefined).status).toBe(400);
    expect(apply(3, 1004, 'WELCOME10').status).toBe(409);
    expect(apply(2, 1007, 'WELCOME10').status).toBe(404);
  });
});
