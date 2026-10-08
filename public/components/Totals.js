import { h } from '../dom.js';
import { formatCents } from '../money.js';

/* The price breakdown, one row per line the service reports. */
export function Totals({ order }) {
  const rows = [
    ['Subtotal', order.subtotal],
    order.bulkDiscount > 0 ? ['Bulk discount', -order.bulkDiscount] : null,
    order.discountCode ? [`Code ${order.discountCode}`, -order.codeDiscount] : null,
    ['Shipping', order.shipping],
    ['Total', order.total],
  ];
  return [
    h('table', {}, h('tbody', {}, rows.map((row) => row && TotalRow(row)))),
    order.discountCodeProblem && h('p', { class: 'muted' }, `No discount from ${order.discountCode}: ${order.discountCodeProblem}.`),
  ];
}

function TotalRow([label, amount]) {
  return h('tr', {}, h('td', {}, label), h('td', { class: 'amount' }, formatCents(amount)));
}
