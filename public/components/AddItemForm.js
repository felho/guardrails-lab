import { h } from '../dom.js';

const PRODUCTS = ['MUG', 'TEE', 'CAP', 'HOODIE', 'SOCKS'];

/* Adds a product to an open order. */
export function AddItemForm({ onAdd }) {
  const sku = h('select', {}, PRODUCTS.map((p) => h('option', { value: p }, p)));
  const qty = h('input', { type: 'number', value: 1, min: 1, max: 99 });
  return h('form', { onSubmit: (e) => { e.preventDefault(); onAdd(sku.value, Number(qty.value)); } },
    h('label', {}, 'Product', sku),
    h('label', {}, 'Qty', qty),
    h('button', { type: 'submit' }, 'Add'),
  );
}
