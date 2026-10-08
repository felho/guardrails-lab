import { currentCustomer } from '../auth.ts';
import type { Customer } from '../customers/repository.ts';
import { conflict, notFound, unauthorized, type Request, type Response } from '../http.ts';
import { findOrder, type Order } from './repository.ts';

/*
 * Every order handler goes through here: the caller must be signed in, the order must exist,
 * and it must be theirs. Someone else's order looks exactly like a missing one.
 */

export type OwnOrder = { ok: true; customer: Customer; order: Order } | { ok: false; response: Response };

export function loadOwnOrder(req: Request, orderId: number): OwnOrder {
  const customer = currentCustomer(req);
  if (!customer) return { ok: false, response: unauthorized() };
  const order = findOrder(orderId);
  if (!order || order.customerId !== customer.id) return { ok: false, response: notFound('order') };
  return { ok: true, customer, order };
}

/* Only an open order can change. */
export function requireOpen(order: Order): Response | undefined {
  return order.status === 'open' ? undefined : conflict(`the order is already ${order.status}`);
}
