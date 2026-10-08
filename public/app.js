import { api, ApiError } from './api.js';
import { h, replace } from './dom.js';
import { AddItemForm } from './components/AddItemForm.js';
import { ItemList } from './components/ItemList.js';
import { Notice } from './components/Notice.js';
import { OrderHeader } from './components/OrderHeader.js';
import { OrderPicker } from './components/OrderPicker.js';
import { Totals } from './components/Totals.js';

/* The page state: who is signed in, which order is open, and the last message. */
const state = { customerId: 1, orderId: 1002, order: null, notice: null };

const root = document.getElementById('app');

async function load() {
  try {
    state.order = await api.getOrder(state.customerId, state.orderId);
    state.notice = null;
  } catch (err) {
    state.order = null;
    state.notice = { kind: 'error', text: err instanceof ApiError ? err.message : 'the service is not reachable' };
  }
  render();
}

async function run(action, success) {
  try {
    await action();
    state.notice = { kind: 'info', text: success };
  } catch (err) {
    state.notice = { kind: 'error', text: err instanceof ApiError ? err.message : 'the service is not reachable' };
  }
  state.order = await api.getOrder(state.customerId, state.orderId).catch(() => null);
  render();
}

function render() {
  const { order, notice } = state;
  replace(root,
    OrderPicker({ customerId: state.customerId, orderId: state.orderId, onChange: (next) => { Object.assign(state, next); load(); } }),
    notice && Notice(notice),
    order && h('section', {},
      OrderHeader({ order }),
      ItemList({ order, onRemove: (sku) => run(() => api.removeItem(state.customerId, order.id, sku), `${sku} removed`) }),
      order.status === 'open' && AddItemForm({ onAdd: (sku, qty) => run(() => api.addItem(state.customerId, order.id, sku, qty), `${qty} × ${sku} added`) }),
    ),
    order && h('section', {}, h('h2', {}, 'Price'), Totals({ order })),
  );
}

load();
