import type { Request } from './http.ts';
import { findCustomer, type Customer } from './customers/repository.ts';

/* The API gateway signs the customer in and passes their id in X-Customer-Id. */
export function currentCustomer(req: Request): Customer | undefined {
  const id = Number(req.headers['x-customer-id']);
  if (!Number.isInteger(id)) return undefined;
  return findCustomer(id);
}
