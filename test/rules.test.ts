import { beforeEach, describe, expect, it } from 'vitest';
import { findCustomerByEmail } from '../src/customers/repository.ts';
import { seed } from '../src/db.ts';
import { getOrder, getReceipt, removeItemFromOrder } from '../src/orders/handlers.ts';
import { findOrdersByStatus } from '../src/orders/repository.ts';
import { request } from './helpers.ts';

beforeEach(() => {
  seed();
});

describe('DELETE /orders/:id/items/:sku', () => {
  it('removes an item from the owner\'s order', () => {
    const res = removeItemFromOrder(request({ customer: 1 }), 1002, 'MUG');
    expect(res.status).toBe(200);
  });

  it('hides an order from other customers and leaves it alone', () => {
    const res = removeItemFromOrder(request({ customer: 2 }), 1002, 'MUG');
    expect(res.status).toBe(404);
    const order = getOrder(request({ customer: 1 }), 1002).body as { items: unknown[] };
    expect(order.items).toHaveLength(1);
  });
});

describe('GET /orders/:id/receipt', () => {
  it('gives the owner their receipt', () => {
    const res = getReceipt(request({ customer: 1 }), 1001);
    expect(res.status).toBe(200);
  });

  it('hides a receipt from other customers', () => {
    const res = getReceipt(request({ customer: 2 }), 1001);
    expect(res.status).toBe(404);
  });
});

describe('values travel as SQL parameters', () => {
  it('treats a quote in the warehouse status filter as text', () => {
    expect(findOrdersByStatus("paid' OR '1'='1")).toEqual([]);
    expect(findOrdersByStatus('paid').map((o) => o.id)).toEqual([1004]);
  });

  it('treats a quote in an email as text', () => {
    expect(findCustomerByEmail("x' OR '1'='1")).toBeUndefined();
    expect(findCustomerByEmail('bence@example.com')?.id).toBe(2);
  });
});
