import { h } from '../dom.js';

/* A message to the customer: an error or a confirmation. */
export function Notice({ kind, text }) {
  return h('div', { class: `notice ${kind}`, role: kind === 'error' ? 'alert' : 'status' }, text);
}
