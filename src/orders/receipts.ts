import { findCustomer } from '../customers/repository.ts';
import { cents, formatCents } from '../money.ts';
import { priceOrder } from './pricing.ts';
import { findOrder } from './repository.ts';

/* A plain-text receipt: who ordered what, and what it costs. */
export function buildReceipt(orderId: number): string | undefined {
  const order = findOrder(orderId);
  if (!order) return undefined;
  const customer = findCustomer(order.customerId);
  const totals = priceOrder(order);
  return [
    `Order ${order.id} · ${customer.name} <${customer.email}>`,
    ...order.items.map((i) => `${i.qty} × ${i.sku}  ${formatCents(cents(i.unitPrice * i.qty))}`),
    `Shipping  ${formatCents(totals.shipping)}`,
    `Total  ${formatCents(totals.total)}`,
  ].join('\n');
}
