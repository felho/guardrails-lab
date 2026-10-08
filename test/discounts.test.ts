import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../src/db.ts';
import { findDiscountCode } from '../src/discounts/repository.ts';

beforeEach(() => seed());

describe('discount codes repository', () => {
  it('finds a code in any case', () => {
    expect(findDiscountCode('save15')).toEqual({ code: 'SAVE15', percent: 15, minOrder: 5000, expiresOn: '2099-12-31' });
    expect(findDiscountCode(' Save15 ')?.code).toBe('SAVE15');
  });

  it('returns undefined for an unknown code', () => {
    expect(findDiscountCode('NOPE')).toBeUndefined();
  });

  it('treats a quoted code as data, not SQL', () => {
    expect(findDiscountCode("x' OR '1'='1")).toBeUndefined();
  });
});
