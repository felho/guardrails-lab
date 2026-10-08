import { h } from '../dom.js';
import { formatCents } from '../money.js';

/* The items of an order; each row can be removed while the order is open. */
export function ItemList({ order, onRemove }) {
  if (order.items.length === 0) return h('p', { class: 'muted' }, 'No items yet.');
  return h('table', {},
    h('thead', {}, h('tr', {}, h('th', {}, 'Item'), h('th', {}, 'Qty'), h('th', { class: 'amount' }, 'Line'), h('th', {}))),
    h('tbody', {}, order.items.map((item) => ItemRow({ item, open: order.status === 'open', onRemove }))),
  );
}

function ItemRow({ item, open, onRemove }) {
  return h('tr', {},
    h('td', {}, item.sku),
    h('td', {}, item.qty),
    h('td', { class: 'amount' }, formatCents(item.unitPrice * item.qty)),
    h('td', {}, open ? h('button', { type: 'button', onClick: () => onRemove(item.sku) }, 'Remove') : null),
  );
}
