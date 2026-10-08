import { h } from '../dom.js';

/* The order's identity and state. */
export function OrderHeader({ order }) {
  return h('h2', {}, `Order ${order.id}`, ' ', h('span', { class: 'muted' }, order.status));
}
