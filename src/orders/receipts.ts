import { findCustomer, type Customer } from '../customers/repository.ts';
import { cents, formatCents } from '../money.ts';
import { priceOrder } from './pricing.ts';
import { discountCodeOf, findOrder } from './repository.ts';

/* A plain-text receipt: who ordered what, and what it costs. Only for the customer who owns the order. */
export function buildReceipt(orderId: number, signedIn: Pick<Customer, 'id'>): string | undefined {
  const order = findOrder(orderId);
  if (!order || order.customerId !== signedIn.id) return undefined;
  const customer = findCustomer(order.customerId);
  if (!customer) throw new Error(`order ${String(order.id)} has no customer`);
  const totals = priceOrder(order, discountCodeOf(order));
  return [
    `Order ${String(order.id)} · ${customer.name} <${customer.email}>`,
    ...order.items.map((i) => `${String(i.qty)} × ${i.sku}  ${formatCents(cents(i.unitPrice * i.qty))}`),
    `Shipping  ${formatCents(totals.shipping)}`,
    `Total  ${formatCents(totals.total)}`,
  ].join('\n');
}
