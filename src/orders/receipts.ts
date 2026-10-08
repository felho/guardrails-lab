import type { Customer } from '../customers/repository.ts';
import { cents, formatCents } from '../money.ts';
import { priceOrder } from './pricing.ts';
import type { Order } from './repository.ts';

/* A plain-text receipt: who ordered what, and what it costs. The caller has already loaded both. */
export function buildReceipt(order: Order, customer: Customer): string {
  const totals = priceOrder(order);
  return [
    `Order ${order.id} · ${customer.name} <${customer.email}>`,
    ...order.items.map((i) => `${i.qty} × ${i.sku}  ${formatCents(cents(i.unitPrice * i.qty))}`),
    `Shipping  ${formatCents(totals.shipping)}`,
    `Total  ${formatCents(totals.total)}`,
  ].join('\n');
}
