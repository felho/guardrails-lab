import { beforeEach, describe, expect, it } from 'vitest';
import { findCustomerByEmail } from '../src/customers/repository.ts';
import { seed } from '../src/db.ts';
import { addItem, findOrder, findOrdersByStatus, removeItem, setDiscountCode } from '../src/orders/repository.ts';

beforeEach(() => seed());

describe('orders repository', () => {
  it('loads an order with its priced items', () => {
    expect(findOrder(1003)).toEqual({
      id: 1003, customerId: 2, status: 'open', discount: null,
      items: [{ sku: 'MUG', qty: 1, unitPrice: 1250 }, { sku: 'TEE', qty: 2, unitPrice: 2490 }],
    });
  });

  it('returns undefined for a missing order', () => {
    expect(findOrder(9999)).toBeUndefined();
  });

  it('merges quantities when the same product is added twice', () => {
    addItem(1001, 'HOODIE', 2);
    expect(findOrder(1001)?.items).toEqual([{ sku: 'HOODIE', qty: 3, unitPrice: 4990 }]);
  });

  it('removes an item', () => {
    removeItem(1001, 'HOODIE');
    expect(findOrder(1001)?.items).toEqual([]);
  });

  it('loads the applied discount code', () => {
    setDiscountCode(1001, 'SAVE15');
    expect(findOrder(1001)?.discount).toEqual({ code: 'SAVE15', percent: 15, minOrder: 5000, expiresOn: '2099-12-31' });
  });

  it('filters by status', () => {
    expect(findOrdersByStatus('paid').map((o) => o.id)).toEqual([1004]);
  });
});

describe('customers repository', () => {
  it('finds a customer by email', () => {
    expect(findCustomerByEmail('bence@example.com')).toMatchObject({ id: 2, name: 'Bence Nagy' });
  });

  it('treats a quoted email as data, not SQL', () => {
    expect(findCustomerByEmail("x' OR '1'='1")).toBeUndefined();
  });
});
