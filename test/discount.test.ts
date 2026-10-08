import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../src/db.ts';
import type { Request } from '../src/http.ts';
import { applyDiscountCode, getOrder } from '../src/orders/handlers.ts';

const req = (customerId: number | undefined, body: any = {}): Request => ({
  method: 'POST',
  path: '',
  headers: customerId === undefined ? {} : { 'x-customer-id': String(customerId) },
  body,
});

const TODAY = '2026-10-08';

describe('POST /orders/:id/discount', () => {
  beforeEach(() => seed());

  it('applies a code typed in any case, and GET shows it', () => {
    // order 1007: two hoodies, 9980
    const res = applyDiscountCode(req(1, { code: ' save15 ' }), 1007, TODAY);
    expect(res.status).toBe(200);
    const order = getOrder(req(1), 1007).body as any;
    expect(order.discountCode).toBe('SAVE15');
    expect(order.codeDiscount).toBe(1497); // 15% of 9980
    expect(order.total).toBe(9980 - 1497); // 8483 still ships free
  });

  it('accepts an order at exactly the minimum', () => {
    // order 1002: four mugs, 5000
    const res = applyDiscountCode(req(1, { code: 'SAVE15' }), 1002, TODAY);
    expect(res.status).toBe(200);
    expect((res.body as any).codeDiscount).toBe(750);
    expect((res.body as any).shipping).toBe(490); // 4250 after the code
  });

  it('refuses an order below the minimum', () => {
    const res = applyDiscountCode(req(1, { code: 'SAVE15' }), 1001, TODAY);
    expect(res.status).toBe(400);
    expect((res.body as any).error).toMatch(/at least €50.00/);
  });

  it('refuses an expired code', () => {
    const res = applyDiscountCode(req(1, { code: 'SUMMER25' }), 1007, TODAY);
    expect(res.status).toBe(400);
    expect((res.body as any).error).toMatch(/expired on 2026-08-31/);
  });

  it('accepts a code on its last day', () => {
    expect(applyDiscountCode(req(1, { code: 'SUMMER25' }), 1007, '2026-08-31').status).toBe(200);
  });

  it('refuses an unknown or missing code', () => {
    expect(applyDiscountCode(req(1, { code: 'NOPE' }), 1007, TODAY).status).toBe(400);
    expect(applyDiscountCode(req(1, {}), 1007, TODAY).status).toBe(400);
  });

  it('replaces the previous code', () => {
    applyDiscountCode(req(1, { code: 'SAVE15' }), 1007, TODAY);
    const res = applyDiscountCode(req(1, { code: 'WELCOME10' }), 1007, TODAY);
    expect((res.body as any).discountCode).toBe('WELCOME10');
    expect((res.body as any).codeDiscount).toBe(998);
  });

  it('keeps the previous code when the new one is refused', () => {
    applyDiscountCode(req(1, { code: 'SAVE15' }), 1007, TODAY);
    applyDiscountCode(req(1, { code: 'SUMMER25' }), 1007, TODAY);
    expect((getOrder(req(1), 1007).body as any).discountCode).toBe('SAVE15');
  });

  it("refuses someone else's order, a paid order, and a signed-out customer", () => {
    expect(applyDiscountCode(req(2, { code: 'WELCOME10' }), 1007, TODAY).status).toBe(404);
    expect(applyDiscountCode(req(3, { code: 'WELCOME10' }), 1004, TODAY).status).toBe(409);
    expect(applyDiscountCode(req(undefined, { code: 'WELCOME10' }), 1007, TODAY).status).toBe(401);
    expect(applyDiscountCode(req(1, { code: 'WELCOME10' }), 9999, TODAY).status).toBe(404);
  });
});
