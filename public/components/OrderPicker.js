import { h } from '../dom.js';

/* Who is looking, and at which order. In production the gateway signs the customer in. */
export function OrderPicker({ customerId, orderId, onChange }) {
  const customer = h('select', { onChange: () => onChange({ customerId: Number(customer.value), orderId: Number(order.value) }) },
    h('option', { value: 1, selected: customerId === 1 }, 'Anna'),
    h('option', { value: 2, selected: customerId === 2 }, 'Bence'),
    h('option', { value: 3, selected: customerId === 3 }, 'Csilla'),
  );
  const order = h('input', { type: 'number', value: orderId, min: 1000, onChange: () => onChange({ customerId: Number(customer.value), orderId: Number(order.value) }) });
  return h('section', {},
    h('h1', {}, 'Order service'),
    h('form', { onSubmit: (e) => e.preventDefault() },
      h('label', {}, 'Signed in as', customer),
      h('label', {}, 'Order', order),
    ),
  );
}
