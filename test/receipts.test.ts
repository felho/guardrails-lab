import { beforeEach, describe, expect, it } from 'vitest';
import { findCustomer } from '../src/customers/repository.ts';
import { seed } from '../src/db.ts';
import { buildReceipt } from '../src/orders/receipts.ts';
import { findOrder } from '../src/orders/repository.ts';

beforeEach(() => seed());

describe('buildReceipt', () => {
  it('lists the customer, every line and the totals', () => {
    const receipt = buildReceipt(findOrder(1003)!, findCustomer(2)!);
    expect(receipt.split('\n')).toEqual([
      'Order 1003 · Bence Nagy <bence@example.com>',
      '1 × MUG  €12.50',
      '2 × TEE  €49.80',
      'Shipping  €0.00',
      'Total  €62.30',
    ]);
  });
});
