import { h } from '../dom.js';

/* Applies a discount code to an open order; a new code replaces the applied one. */
export function DiscountForm({ onApply }) {
  const code = h('input', { type: 'text', autocomplete: 'off', placeholder: 'SAVE15' });
  return h('form', { onSubmit: (e) => { e.preventDefault(); if (code.value.trim()) onApply(code.value.trim()); } },
    h('label', {}, 'Discount code', code),
    h('button', { type: 'submit' }, 'Apply'),
  );
}
