import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../src/db.ts';
import { addItemToOrder, applyDiscountCode, getOrder, getReceipt, listOrdersForWarehouse, removeItemFromOrder } from '../src/orders/handlers.ts';
import { request, staffRequest } from './helpers.ts';

beforeEach(() => seed());

describe('GET /orders/:id', () => {
  it('shows an order to its owner with its prices', () => {
    const res = getOrder(request({ customer: 1 }), 1002);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1002, status: 'open', subtotal: 5000, shipping: 0, total: 5000 });
  });

  it('answers 404 to another customer', () => {
    expect(getOrder(request({ customer: 2 }), 1002).status).toBe(404);
  });

  it('answers 401 without a signed-in customer', () => {
    expect(getOrder(request(), 1002).status).toBe(401);
  });

  it('answers 404 for a missing order', () => {
    expect(getOrder(request({ customer: 1 }), 9999).status).toBe(404);
  });
});

describe('POST /orders/:id/items', () => {
  it('adds an item and reprices the order', () => {
    const res = addItemToOrder(request({ customer: 1, body: { sku: 'CAP', qty: 1 } }), 1001);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ subtotal: 6490, shipping: 0, total: 6490 });
  });

  it('refuses an unknown product', () => {
    expect(addItemToOrder(request({ customer: 1, body: { sku: 'NOPE', qty: 1 } }), 1001).status).toBe(400);
  });

  it('refuses a quantity outside 1..99', () => {
    expect(addItemToOrder(request({ customer: 1, body: { sku: 'CAP', qty: 0 } }), 1001).status).toBe(400);
    expect(addItemToOrder(request({ customer: 1, body: { sku: 'CAP', qty: '2' } }), 1001).status).toBe(400);
  });

  it('refuses a paid order', () => {
    expect(addItemToOrder(request({ customer: 3, body: { sku: 'CAP', qty: 1 } }), 1004).status).toBe(409);
  });

  it("refuses another customer's order", () => {
    expect(addItemToOrder(request({ customer: 2, body: { sku: 'CAP', qty: 1 } }), 1001).status).toBe(404);
  });
});

describe('DELETE /orders/:id/items/:sku', () => {
  it('removes an item for the owner', () => {
    const res = removeItemFromOrder(request({ customer: 1 }), 1007, 'HOODIE');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 0 });
  });

  it("refuses another customer's order and leaves it untouched", () => {
    expect(removeItemFromOrder(request({ customer: 2 }), 1006, 'MUG').status).toBe(404);
    expect(getOrder(request({ customer: 1 }), 1006).body).toMatchObject({ total: 7500 });
  });

  it('refuses a paid order', () => {
    expect(removeItemFromOrder(request({ customer: 3 }), 1004, 'TEE').status).toBe(409);
  });
});

describe('POST /orders/:id/discount', () => {
  const apply = (customer: number, id: number, code: unknown) => applyDiscountCode(request({ customer, body: { code } }), id);

  it('applies a code typed in any case and shows it on the order', () => {
    // 1007: two hoodies, 9980; 15% off is 1497
    expect(apply(1, 1007, 'save15').status).toBe(200);
    expect(getOrder(request({ customer: 1 }), 1007).body).toMatchObject({
      discountCode: 'SAVE15', discountCodeProblem: null, subtotal: 9980, codeDiscount: 1497, shipping: 0, total: 8483,
    });
  });

  it('accepts an order at exactly the minimum', () => {
    // 1002: four mugs, 5000; after 15% the goods are 4250, so shipping is charged again
    const res = apply(1, 1002, 'SAVE15');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ codeDiscount: 750, shipping: 490, total: 4250 + 490 });
  });

  it('refuses an order below the minimum, checked after the bulk discount', () => {
    // 1005: ten socks, 9900, bulk 495 -> goods 9405; 1001: one hoodie, 4990
    expect(apply(1, 1005, 'SAVE15').status).toBe(200);
    const res = apply(1, 1001, 'SAVE15');
    expect(res).toEqual({ status: 400, body: { error: 'the code SAVE15 needs an order of at least €50.00' } });
  });

  it('refuses an expired code with a clear message', () => {
    expect(apply(1, 1007, 'SUMMER25')).toEqual({ status: 400, body: { error: 'the code SUMMER25 expired on 2026-08-31' } });
    expect(getOrder(request({ customer: 1 }), 1007).body).toMatchObject({ discountCode: null, codeDiscount: 0 });
  });

  it('refuses an unknown or missing code', () => {
    expect(apply(1, 1007, 'NOPE')).toEqual({ status: 400, body: { error: 'there is no discount code NOPE' } });
    expect(apply(1, 1007, '  ').status).toBe(400);
    expect(apply(1, 1007, 15).status).toBe(400);
  });

  it('replaces the previous code', () => {
    apply(1, 1007, 'SAVE15');
    const res = apply(1, 1007, 'welcome10');
    expect(res.body).toMatchObject({ discountCode: 'WELCOME10', codeDiscount: 998 });
  });

  it('keeps the previous code when a new one is refused', () => {
    apply(1, 1007, 'WELCOME10');
    apply(1, 1007, 'SUMMER25');
    expect(getOrder(request({ customer: 1 }), 1007).body).toMatchObject({ discountCode: 'WELCOME10', codeDiscount: 998 });
  });

  it('stops discounting, and says why, when items drop the order below the minimum', () => {
    apply(1, 1007, 'SAVE15');
    removeItemFromOrder(request({ customer: 1 }), 1007, 'HOODIE');
    addItemToOrder(request({ customer: 1, body: { sku: 'CAP', qty: 1 } }), 1007);
    expect(getOrder(request({ customer: 1 }), 1007).body).toMatchObject({
      discountCode: 'SAVE15', codeDiscount: 0, discountCodeProblem: 'the code SAVE15 needs an order of at least €50.00',
    });
  });

  it('refuses a paid order', () => {
    expect(apply(3, 1004, 'WELCOME10').status).toBe(409);
  });

  it("refuses another customer's order and leaves it untouched", () => {
    expect(apply(2, 1007, 'SAVE15').status).toBe(404);
    expect(getOrder(request({ customer: 1 }), 1007).body).toMatchObject({ discountCode: null });
  });

  it('answers 401 without a signed-in customer', () => {
    expect(applyDiscountCode(request({ body: { code: 'SAVE15' } }), 1007).status).toBe(401);
  });
});

describe('GET /orders/:id/receipt', () => {
  it('prints the receipt for the owner', () => {
    const res = getReceipt(request({ customer: 1 }), 1006);
    expect(res.status).toBe(200);
    expect((res.body as { receipt: string }).receipt).toContain('Anna Kovács');
  });

  it('shows the discount code and its total', () => {
    applyDiscountCode(request({ customer: 1, body: { code: 'SAVE15' } }), 1007);
    const receipt = (getReceipt(request({ customer: 1 }), 1007).body as { receipt: string }).receipt;
    expect(receipt).toContain('Code SAVE15  -€14.97');
    expect(receipt).toContain('Total  €84.83');
  });

  it('hides the receipt from another customer', () => {
    const res = getReceipt(request({ customer: 2 }), 1006);
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('Anna');
  });

  it('answers 401 without a signed-in customer', () => {
    expect(getReceipt(request(), 1006).status).toBe(401);
  });
});

describe('GET /warehouse/orders', () => {
  it('lists orders by status for staff, grouped by customer', () => {
    const res = listOrdersForWarehouse(staffRequest(), 'open');
    expect(res.status).toBe(200);
    expect((res.body as { id: number }[]).map((o) => o.id)).toEqual([1001, 1002, 1005, 1006, 1007, 1003]);
  });

  it('refuses a request without the staff token', () => {
    expect(listOrdersForWarehouse(request({ customer: 1 }), 'open').status).toBe(403);
  });

  it('refuses a status outside the known ones', () => {
    expect(listOrdersForWarehouse(staffRequest(), "open' OR '1'='1").status).toBe(400);
  });
});
