import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../src/db.ts';
import { addItemToOrder, getOrder } from '../src/orders/handlers.ts';
import { request } from './helpers.ts';

beforeEach(() => {
  seed();
});

describe('GET /orders/:id', () => {
  it('shows an order to its owner', () => {
    const res = getOrder(request({ customer: 1 }), 1001);
    expect(res.status).toBe(200);
  });

  it('hides an order from other customers', () => {
    const res = getOrder(request({ customer: 2 }), 1001);
    expect(res.status).toBe(404);
  });

  it('asks an anonymous caller to sign in', () => {
    const res = getOrder(request(), 1001);
    expect(res.status).toBe(401);
  });

  it('reports an order that does not exist', () => {
    const res = getOrder(request({ customer: 1 }), 9999);
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

  it('refuses a body that is not an object', () => {
    const res = addItemToOrder(request({ customer: 1, body: null }), 1001);
    expect(res.status).toBe(400);
  });

  it('refuses a qty that is not a whole number', () => {
    const res = addItemToOrder(request({ customer: 1, body: { sku: 'CAP', qty: '2' } }), 1001);
    expect(res.status).toBe(400);
  });

  it('refuses a paid order', () => {
    const res = addItemToOrder(request({ customer: 3, body: { sku: 'CAP', qty: 1 } }), 1004);
    expect(res.status).toBe(409);
  });
});
