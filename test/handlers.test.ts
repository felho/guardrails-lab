import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../src/db.ts';
import { addItemToOrder, getOrder, getReceipt, listOrdersForWarehouse, removeItemFromOrder } from '../src/orders/handlers.ts';
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

describe('GET /orders/:id/receipt', () => {
  it('prints the receipt for the owner', () => {
    const res = getReceipt(request({ customer: 1 }), 1006);
    expect(res.status).toBe(200);
    expect((res.body as { receipt: string }).receipt).toContain('Anna Kovács');
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
