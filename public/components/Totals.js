import { h } from '../dom.js';
import { formatCents } from '../money.js';

/* The price breakdown, one row per line the service reports. */
export function Totals({ order }) {
  const rows = [
    ['Subtotal', order.subtotal],
    order.bulkDiscount > 0 ? ['Bulk discount', -order.bulkDiscount] : null,
    ['Shipping', order.shipping],
    ['Total', order.total],
  ];
  return h('table', {}, h('tbody', {}, rows.map((row) => row && TotalRow(row))));
}

function TotalRow([label, amount]) {
  return h('tr', {}, h('td', {}, label), h('td', { class: 'amount' }, formatCents(amount)));
}
